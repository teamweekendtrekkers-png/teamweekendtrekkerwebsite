// Optional real-browser gate. Supply PUPPETEER_MODULE and CHROME_BIN locally.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict'), {execFileSync} = require('node:child_process');
const puppeteer = require(process.env.PUPPETEER_MODULE || 'puppeteer');
const root = path.resolve(__dirname, '..');
const settings = require('../js/homepage-settings');
const defaults = settings.normalize(require('../tests/fixtures/homepage-defaults.json'));
let config = defaults, baseline = false;
const baselineHtml = execFileSync('git', ['show', 'HEAD:index.html'], {cwd: root});
const baselineSettings = execFileSync('git', ['show', 'HEAD:js/homepage-settings.js'], {cwd: root});
const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/js/homepage-config.json') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify(config)); }
    if (baseline && pathname === '/index.html') { res.setHeader('Content-Type', 'text/html'); return res.end(baselineHtml); }
    if (baseline && pathname === '/js/homepage-settings.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end(baselineSettings); }
    const file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + '/')) { res.statusCode = 403; return res.end(); }
    try { res.setHeader('Content-Type', {'.html':'text/html', '.js':'text/javascript', '.json':'application/json', '.css':'text/css', '.jpg':'image/jpeg', '.png':'image/png'}[path.extname(file)] || 'application/octet-stream'); res.end(fs.readFileSync(file)); }
    catch { res.statusCode = 404; res.end(); }
});
(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const browser = await puppeteer.launch({executablePath: process.env.CHROME_BIN, headless: true, args: ['--no-sandbox']});
    try {
        const page = await browser.newPage(), errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.evaluateOnNewDocument(() => {
            const start = window.setInterval.bind(window), stop = window.clearInterval.bind(window);
            window.reviewTimers = new Map();
            window.setInterval = (callback, interval) => { const id = start(callback, interval); if (interval === 6000) window.reviewTimers.set(id, callback); return id; };
            window.clearInterval = id => { window.reviewTimers.delete(id); stop(id); };
        });
        const url = 'http://127.0.0.1:' + server.address().port + '/index.html';
        const targets = () => page.evaluate(() => [...document.querySelectorAll('.navbar a, .hero a, .cta-section a, a.whatsapp-float')].map(node => node.getAttribute('href')));
        baseline = true; await page.goto(url, {waitUntil:'networkidle0'}); const before = await targets(); const beforeErrors = errors.splice(0);
        const primaryIndex = await page.evaluate(() => [...document.querySelectorAll('.navbar a, .hero a, .cta-section a, a.whatsapp-float')].findIndex(node => node.matches('.hero .btn-primary')));
        // Only the newly requested hero discovery shortcut changes its target.
        const expectedTargets = before.map((href, index) => index === primaryIndex ? '#upcoming-batches' : href);
        baseline = false;
        for (const width of [375, 768, 1440]) {
            await page.setViewport({width, height:1000, hasTouch:width === 375, isMobile:width === 375}); await page.goto(url, {waitUntil:'networkidle0'});
            await page.waitForSelector('.reviews-slider');
            assert.deepEqual(await targets(), expectedTargets);
            assert.equal(await page.$('.why-us'), null);
            for (const selector of ['.how-it-works', '.why-choose-us']) {
                assert.equal(await page.$$eval(selector + ' .homepage-info-card', nodes => nodes.length), 3);
                await page.$eval(selector, node => node.scrollIntoView({block:'center', behavior:'instant'}));
                await page.screenshot({path:'/tmp/homepage-info-' + selector.slice(1) + '-' + width + '.png'});
            }
            assert.deepEqual(await page.$$eval('.homepage-step-number', nodes => nodes.map(node => node.textContent)), ['1','2','3']);
            assert.equal(await page.$$eval('.reviews-slider .testimonial-card', nodes => nodes.length), 6);
            assert.deepEqual(await page.$$eval('.review-slider-controls button', nodes => nodes.map(node => node.getAttribute('aria-label'))), ['Previous reviews', 'Next reviews']);
            assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'page must not overflow at ' + width);
            assert(await page.$eval('.reviews-slider', node => node.scrollWidth > node.clientWidth), 'reviews should slide');
            await page.$eval('.reviews-slider', node => node.scrollIntoView({block:'center', behavior:'instant'}));
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            await page.mouse.move(0,0);
            await page.evaluate(() => { for (const callback of window.reviewTimers.values()) callback(); });
            await page.waitForFunction(() => document.querySelector('.reviews-slider').scrollLeft > 10);
            await page.$eval('.reviews-slider', node => node.scrollTo({left:0, behavior:'instant'}));
            await page.click('[aria-label="Next reviews"]');
            await page.waitForFunction(() => document.querySelector('.reviews-slider').scrollLeft > 10);
            await page.$eval('.reviews-slider', node => node.focus({preventScroll:true})); await page.keyboard.press('ArrowRight');
            await page.waitForFunction(() => document.querySelector('.reviews-slider').scrollLeft > 100);
            assert.equal(await page.evaluate(() => window.reviewTimers.size), 0, 'focus should pause while a review is being read');
            await page.mouse.move(0,0);
            await page.evaluate(() => document.activeElement.blur());
            await page.waitForFunction(() => window.reviewTimers.size === 1);
            await page.$eval('.reviews-slider', node => node.scrollTo({left:0, behavior:'instant'}));
            await page.evaluate(() => { for (const callback of window.reviewTimers.values()) callback(); });
            await page.waitForFunction(() => document.querySelector('.reviews-slider').scrollLeft > 10);
            if (width === 375) {
                const session = await page.createCDPSession();
                await page.$eval('.reviews-slider', node => { node.blur(); node.scrollTo({left:0, behavior:'instant'}); });
                const box = await page.$eval('.reviews-slider', node => { const rect = node.getBoundingClientRect(); return {x:rect.x + rect.width / 2, y:Math.max(120, rect.y + 100)}; });
                await session.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[{x:box.x + 90, y:box.y}]});
                for (let step = 1; step <= 6; step++) {
                    await session.send('Input.dispatchTouchEvent', {type:'touchMove', touchPoints:[{x:box.x + 90 - step * 35, y:box.y}]});
                    await new Promise(resolve => setTimeout(resolve, 40));
                }
                await session.send('Input.dispatchTouchEvent', {type:'touchEnd', touchPoints:[]});
                await page.waitForFunction(() => document.querySelector('.reviews-slider').scrollLeft > 10);
                await page.waitForFunction(() => window.reviewTimers.size === 1);
                await session.detach();
            }
            await page.waitForFunction(() => {
                const grid = document.querySelector('.reviews-slider');
                const previous = grid.dataset.previousOffset;
                grid.dataset.previousOffset = String(grid.scrollLeft);
                return previous !== undefined && Math.abs(Number(previous) - grid.scrollLeft) < 1;
            }, {polling:100});
            await page.screenshot({path:'/tmp/homepage-sections-' + width + '.png'});
            console.log('PASS: review autoplay, arrows, keyboard and automatic resume at ' + width + 'px');
        }
        await page.emulateMediaFeatures([{name:'prefers-reduced-motion', value:'reduce'}]); await page.goto(url, {waitUntil:'networkidle0'});
        assert.equal(await page.evaluate(() => window.reviewTimers.size), 0);
        assert.equal(await page.$$eval('.review-slider-controls button', nodes => nodes.length), 2);
        await page.emulateMediaFeatures([{name:'prefers-reduced-motion', value:'no-preference'}]);
        await page.waitForFunction(() => window.reviewTimers.size === 1);
        config = structuredClone(defaults); config.sections.reviews.autoPlay = false;
        await page.goto(url, {waitUntil:'networkidle0'});
        assert.equal(await page.evaluate(() => window.reviewTimers.size), 0, 'admin autoplay setting must still be respected');
        config.sections.reviews.items = [config.sections.reviews.items[4], config.sections.reviews.items[0]];
        config.sections.reviews.items[0].visible = false;
        config.sections.reviews.items[1].text = '<img src=x onerror=alert(1)> Unicode 🏕️';
        config.sections.reviews.items[1].photo = 'https://invalid.example/photo.jpg';
        config.sections.reviews.googleMapsUrl = 'https://maps.app.goo.gl/chosenBusiness';
        config.sections.reviews.items[1].googleMapsUrl = 'https://maps.app.goo.gl/chosenReview';
        config.sections.stats.items[0].value = '999+'; config.sections.howItWorks.title = 'Your journey in two steps'; config.sections.whyChooseUs.title = 'Our promise'; config.sections.cta.title = 'Start your journey';
        config.sections.howItWorks.items.reverse(); config.sections.howItWorks.items[0].visible = false;
        config.sections.whyChooseUs.eyebrow = ''; config.sections.whyChooseUs.subtitle = '';
        config.sections.whyChooseUs.items[0].title = '<img src=x onerror=alert(1)> Clear pricing';
        config.sections.whyChooseUs.items[0].value = '₹0'; config.sections.whyChooseUs.items[0].accent = 'green';
        await page.goto(url, {waitUntil:'networkidle0'});
        assert.equal(await page.$$eval('.reviews-slider .testimonial-card', nodes => nodes.length), 1);
        assert.equal(await page.$eval('.testimonial-card p', node => node.textContent), config.sections.reviews.items[1].text);
        assert.equal(await page.$('.testimonial-card p img'), null);
        assert.equal(await page.$eval('.review-google-link', node => node.href), config.sections.reviews.items[1].googleMapsUrl);
        assert.equal(await page.$eval('.reviews-cta a', node => node.href), config.sections.reviews.googleMapsUrl);
        assert.equal(await page.$eval('.stats-grid .stat-number', node => node.textContent), '999+');
        assert.equal(await page.$eval('.why-choose-us h2', node => node.textContent), 'Our promise');
        assert.equal(await page.$eval('.how-it-works h2', node => node.textContent), 'Your journey in two steps');
        assert.deepEqual(await page.$$eval('.homepage-step-number', nodes => nodes.map(node => node.textContent)), ['1','2']);
        assert.deepEqual(await page.$$eval('.how-it-works .homepage-info-card h3', nodes => nodes.map(node => node.textContent)), ['Book Your Spot','Pick a Weekend']);
        assert.equal(await page.$eval('.why-choose-us .homepage-info-value', node => node.textContent), '₹0');
        assert.equal(await page.$('.why-choose-us h3 img'), null);
        assert.equal(await page.$eval('.why-choose-us .section-eyebrow', node => getComputedStyle(node).display), 'none');
        assert.equal(await page.$eval('.why-choose-us .section-subtitle', node => getComputedStyle(node).display), 'none');
        assert.equal(await page.$eval('.cta-section h2', node => node.textContent), 'Start your journey');
        assert.equal(await page.$eval('.review-slider-controls', node => node.hidden), true);
        await page.$eval('.reviewer-avatar', node => node.scrollIntoView({block:'center'}));
        await page.waitForFunction(() => !document.querySelector('.reviewer-avatar img'));
        assert.deepEqual(await targets(), expectedTargets);
        config.sections.reviews.items = []; for (const name of ['stats','howItWorks','whyChooseUs','cta']) config.sections[name].enabled = false;
        await page.goto(url, {waitUntil:'networkidle0'});
        assert.equal(await page.$eval('.testimonials-grid', node => node.textContent), 'Read traveller reviews on Google.');
        for (const selector of ['.stats','.how-it-works','.why-choose-us','.cta-section']) assert.equal(await page.$eval(selector, node => getComputedStyle(node).display), 'none');
        // The new sections are also readable with JavaScript disabled.
        await page.setJavaScriptEnabled(false); await page.goto(url, {waitUntil:'networkidle0'});
        assert.equal(await page.$$eval('.homepage-info-card', nodes => nodes.length), 6);
        assert.equal(await page.$eval('.how-it-works h2', node => node.textContent), 'How It Works');
        const newErrors = errors.filter(error => !beforeErrors.includes(error)); assert.deepEqual(newErrors, []);
        console.log('PASS: real Chromium desktop/tablet/mobile slider, autoplay and automatic resume, no Play/Pause button, keyboard, swipe, reduced motion, selection, links, text safety, avatar fallback, hidden/empty sections and unchanged action targets.');
        console.log('Baseline browser exceptions:', beforeErrors);
    } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
