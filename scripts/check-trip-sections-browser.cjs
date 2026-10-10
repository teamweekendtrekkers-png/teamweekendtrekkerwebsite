// Optional real Chromium regression gate; no live writes or npm installs.
// Set PUPPETEER_MODULE and CHROME_BIN to existing local installations.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict'), {execFileSync} = require('node:child_process');
const puppeteer = require(process.env.PUPPETEER_MODULE || 'puppeteer');
const root = path.resolve(__dirname, '..');
const {readTripsData, renderTripPage, readSiteOrigin} = require('./generate-trip-pages');
const trips = readTripsData(root), id = trips.wayanad ? 'wayanad' : Object.keys(trips)[0];
const template = fs.readFileSync(path.join(root, 'trip-detail.html'), 'utf8');
const baseline = execFileSync('git', ['show', 'HEAD:trip-detail.html'], {cwd: root});
const output = fs.mkdtempSync('/tmp/twt-trip-sections-browser-');
let expanded;
const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/baseline.html') { res.setHeader('Content-Type', 'text/html'); return res.end(baseline); }
    const match = pathname.match(/^\/trips\/([a-z0-9_-]+)\/$/);
    if (match && trips[match[1]]) {
        res.setHeader('Content-Type', 'text/html');
        return res.end(renderTripPage({template, tripId: match[1], trip: trips[match[1]], projectRoot: root, siteOrigin: readSiteOrigin(root)}));
    }
    const file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + '/')) { res.statusCode = 403; return res.end(); }
    try {
        res.setHeader('Content-Type', {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png'}[path.extname(file)] || 'application/octet-stream');
        let content = fs.readFileSync(file);
        if (pathname === '/js/trips-data.js' && expanded !== undefined) {
            content = content.toString() + `\ntripsData[${JSON.stringify(id)}].expandedSections = ${JSON.stringify(expanded)};`;
        }
        res.end(content);
    } catch { res.statusCode = 404; res.end(); }
});

(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const browser = await puppeteer.launch({executablePath: process.env.CHROME_BIN, headless: true, args: ['--no-sandbox']});
    try {
        const page = await browser.newPage(), errors = [];
        page.on('pageerror', error => errors.push(error.message));
        const origin = 'http://127.0.0.1:' + server.address().port;
        const booking = () => page.evaluate(() => ({
            book: document.querySelector('#bookNowBtn').outerHTML,
            dates: document.querySelector('#dateSelect').innerHTML,
            price: document.querySelector('#currentPrice').textContent,
            people: document.querySelector('#peopleCount').outerHTML,
            upi: document.querySelector('.upi-card').innerHTML,
            mobile: document.querySelector('#mobileBookBtn').innerHTML,
            whatsapp: document.querySelector('.quick-contact .btn-whatsapp').href,
        }));
        const content = () => page.evaluate(() => ({
            about: [...document.querySelectorAll('.content-section')].find(node => node.querySelector('h2')?.textContent === 'About This Trip').querySelector('p').textContent,
            highlights: document.querySelector('.highlights-list').innerHTML,
            includes: document.querySelector('.includes-grid').innerHTML,
            itinerary: document.querySelector('.itinerary-accordion').innerHTML,
        }));
        const states = () => page.$$eval('details[data-trip-section]', nodes => nodes.map(node => node.open));
        const center = async selector => {
            await page.$eval(selector, node => node.scrollIntoView({block: 'center', behavior: 'instant'}));
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        };
        await page.goto(`${origin}/baseline.html?trip=${id}`, {waitUntil: 'networkidle0'});
        const before = await booking(), beforeContent = await content(), baselineErrors = [...errors]; errors.length = 0;
        await page.goto(`${origin}/trip-detail.html?trip=${id}`, {waitUntil: 'networkidle0'});
        assert.deepEqual(await booking(), before);
        assert.deepEqual(await content(), beforeContent);
        for (const width of [375, 768, 1440]) {
            await page.setViewport({width, height: 1000, hasTouch: width === 375});
            await page.goto(`${origin}/trips/${id}/`, {waitUntil: 'networkidle0'});
            assert.deepEqual(await states(), [false, false, false]);
            const first = '[data-trip-section="about"] > summary';
            await center(first);
            await page.screenshot({path: path.join(output, `collapsed-${width}.png`)});
            if (width === 375) await page.tap(first); else await page.click(first);
            await center('[data-trip-section="highlights"] > summary');
            await page.click('[data-trip-section="highlights"] > summary');
            assert.deepEqual(await states(), [true, true, false]);
            await page.$eval('[data-trip-section="includes"] > summary', node => node.focus());
            await page.keyboard.press('Enter');
            assert.deepEqual(await states(), [true, true, true]);
            await center(first);
            await page.screenshot({path: path.join(output, `expanded-${width}.png`)});
            await page.$eval('[data-trip-section="includes"] > summary', node => node.focus());
            await page.keyboard.press('Space');
            assert.deepEqual(await states(), [true, true, false]);
            // Existing itinerary still opens/closes without changing these panels.
            await center('.itinerary-accordion .accordion-item:nth-child(2) .accordion-header');
            await page.click('.itinerary-accordion .accordion-item:nth-child(2) .accordion-header');
            assert.equal(await page.$eval('.itinerary-accordion .accordion-item:nth-child(2)', node => node.classList.contains('active')), true);
            assert.deepEqual(await states(), [true, true, false]);
            await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
            assert.deepEqual(await states(), [true, true, true]);
            await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
            assert.deepEqual(await states(), [true, true, false]);
            const model = await page.evaluate(() => TripBrochure.buildModel({id: document.documentElement.dataset.tripId, ...getTripData(document.documentElement.dataset.tripId)}));
            assert(model.blocks.some(block => /Lunch|Excluded|Excludes/i.test(block.text)));
            await center('#tripBrochureButton');
            await page.click('#tripBrochureButton');
            await page.waitForFunction(() => !document.querySelector('#tripBrochureDownload').disabled);
            assert.equal(await page.$eval('#tripBrochureDialog', node => node.open), true);
            await page.click('#tripBrochureClose');
            assert.deepEqual(await booking(), before);
            await center('[data-trip-section="includes"] > summary');
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
            await page.screenshot({path: path.join(output, `sections-${width}.png`)});
        }
        // Follow an actual booking action and inspect its unchanged checkout URL.
        await page.select('#dateSelect', await page.$eval('#dateSelect', node => [...node.options].find(option => option.value)?.value || ''));
        await page.select('#peopleCount', '2');
        await center('#bookNowBtn');
        await Promise.all([page.waitForNavigation(), page.click('#bookNowBtn')]);
        assert.equal(new URL(page.url()).pathname, '/checkout.html');
        assert.equal(new URL(page.url()).searchParams.get('trip'), id);
        // Preferences are read from the same data file published by Trip Manager.
        expanded = ['about', 'includes'];
        await page.goto(`${origin}/trips/${id}/`, {waitUntil: 'networkidle0'});
        assert.deepEqual(await states(), [true, false, true]);
        expanded = [];
        await page.goto(`${origin}/trips/${id}/`, {waitUntil: 'networkidle0'});
        assert.deepEqual(await states(), [false, false, false]);
        expanded = undefined;
        // Without JavaScript every section's fallback content remains accessible.
        await page.setJavaScriptEnabled(false);
        await page.goto(`${origin}/trip-detail.html?trip=${id}`, {waitUntil: 'networkidle0'});
        assert.deepEqual(await states(), [true, true, true]);
        assert.deepEqual(errors.filter(error => !baselineErrors.includes(error)), []);
        console.log(JSON.stringify({pass: true, trip: id, output, baselineErrors, checks: 'mobile tap, mouse, Enter/Space, independent panels, itinerary, print restoration, brochure generation, booking/payment parity, actual checkout navigation, no-JS fallback, managed settings'}));
    } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
