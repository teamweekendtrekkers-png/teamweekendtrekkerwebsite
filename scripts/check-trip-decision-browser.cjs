// Read-only local Chromium gate. No installs, external writes or payment submissions.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict'), {execFileSync} = require('node:child_process');
const puppeteer = require(process.env.PUPPETEER_MODULE || 'puppeteer');
const {readTripsData, renderTripPage, readSiteOrigin} = require('./generate-trip-pages');
const root = path.resolve(__dirname, '..'), trips = readTripsData(root), id = 'wayanad';
const template = fs.readFileSync(path.join(root, 'trip-detail.html'), 'utf8');
const baseline = execFileSync('git', ['show', 'HEAD:trip-detail.html'], {cwd: root});
const output = fs.mkdtempSync('/tmp/twt-trip-decision-browser-');
let override = null;
const server = http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; return res.end(); }
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/baseline.html') { res.setHeader('Content-Type', 'text/html'); return res.end(baseline); }
    if (pathname === `/trips/${id}/`) {
        res.setHeader('Content-Type', 'text/html');
        return res.end(renderTripPage({template, tripId: id, trip: trips[id], projectRoot: root, siteOrigin: readSiteOrigin(root)}));
    }
    const file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + '/')) { res.statusCode = 403; return res.end(); }
    try {
        res.setHeader('Content-Type', {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png'}[path.extname(file)] || 'application/octet-stream');
        let content = fs.readFileSync(file);
        if (pathname === '/js/trips-data.js' && override) {
            content = content.toString() + `\nObject.assign(tripsData[${JSON.stringify(id)}], ${JSON.stringify(override)});`;
        }
        res.end(content);
    } catch { res.statusCode = 404; res.end(); }
});

(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const browser = await puppeteer.launch({executablePath: process.env.CHROME_BIN, headless: true, args: ['--no-sandbox']});
    try {
        const page = await browser.newPage(), errors = [], blockedWrites = [];
        await page.setRequestInterception(true);
        page.on('request', request => {
            if (!['GET', 'HEAD'].includes(request.method())) { blockedWrites.push(request.method() + ' ' + request.url()); return request.abort(); }
            // Loading checkout's live payment SDK can emit telemetry even
            // without submitting payment. Do not load it in this read-only gate.
            if (request.resourceType() === 'script' && request.url().startsWith('https://checkout.razorpay.com/')) return request.abort();
            request.continue();
        });
        page.on('pageerror', error => errors.push(error.message));
        await page.evaluateOnNewDocument(() => {
            const OriginalDate = Date;
            class FixedDate extends OriginalDate {
                constructor(...args) { super(...(args.length ? args : ['2026-10-11T06:00:00Z'])); }
                static now() { return new OriginalDate('2026-10-11T06:00:00Z').getTime(); }
            }
            window.Date = FixedDate;
        });
        const origin = 'http://127.0.0.1:' + server.address().port;
        const booking = () => page.evaluate(() => ({
            button: document.querySelector('#bookNowBtn').outerHTML,
            dates: document.querySelector('#dateSelect').innerHTML,
            price: document.querySelector('#currentPrice').textContent,
            people: document.querySelector('#peopleCount').outerHTML,
            upi: document.querySelector('.upi-card').innerHTML,
            mobile: document.querySelector('#mobileBookBtn').innerHTML,
            whatsapp: document.querySelector('.quick-contact .btn-whatsapp').href,
        }));
        const center = async selector => {
            await page.$eval(selector, node => node.scrollIntoView({block: 'center', behavior: 'instant'}));
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        };
        await page.goto(`${origin}/baseline.html?trip=${id}`, {waitUntil: 'networkidle0'});
        const before = await booking(), baselineErrors = [...errors]; errors.length = 0;
        await page.goto(`${origin}/trip-detail.html?trip=${id}`, {waitUntil: 'networkidle0'});
        assert.deepEqual(await booking(), before, 'Booking, UPI and contact controls must retain baseline behavior');
        for (const width of [375, 768, 1440]) {
            await page.setViewport({width, height: 900, hasTouch: width === 375});
            await page.goto(`${origin}/trips/${id}/?date=${encodeURIComponent('Oct 16–18, 2026')}`, {waitUntil: 'networkidle0'});
            assert.equal(await page.$eval('h1', node => node.textContent), trips[id].title.trim());
            assert.equal(await page.$eval('#dateSelect', node => node.value), 'Oct 16-18, 2026');
            assert.equal(await page.$eval('#tripSelectedDeparture', node => node.hidden), false);
            assert.equal(await page.$eval('#currentPrice', node => node.textContent), trips[id].price);
            assert.equal(await page.$eval('#totalAmount', node => node.textContent), trips[id].price);
            assert.equal(await page.$('#originalPrice'), null);
            assert.equal(await page.$('#discountBadge'), null);
            assert.equal(await page.$('.overview-cards'), null);
            assert.equal(await page.$eval('#glanceAge', node => node.closest('.glance-item').hidden), true);
            assert.ok(await page.$$eval('#thingsToCarryGrid .carry-item', nodes => nodes.length) >= 12);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
            await page.screenshot({path: path.join(output, `heading-${width}.png`)});
            await center('#tripSectionLinks');
            await page.$eval('#tripSectionLinks a[href="#tripIncludes"]', node => node.focus());
            await page.keyboard.press('Enter');
            await page.waitForFunction(() => document.querySelector('#tripIncludes').open);
            // Existing main.js deliberately smooth-scrolls anchors without
            // changing the hash. Verify the destination rather than changing it.
            await page.waitForFunction(() => Math.abs(document.querySelector('#tripIncludes').getBoundingClientRect().top) <= 140);
            await page.$eval('#tripIncludes > summary', node => node.focus());
            await page.keyboard.press('Space');
            assert.equal(await page.$eval('#tripIncludes', node => node.open), false);
            await center('#thingsToCarryGrid');
            await page.screenshot({path: path.join(output, `packing-${width}.png`)});
            await page.$eval('.trip-dates-shortcut', node => node.focus());
            await page.keyboard.press('Enter');
            await page.waitForFunction(() => Math.abs(document.querySelector('#bookingCard').getBoundingClientRect().top) <= 140);
            assert.equal(await page.$eval('#dateSelect', node => node.value), 'Oct 16-18, 2026');
        }
        // Follow the real existing booking link; do not submit checkout/payment.
        await page.select('#dateSelect', 'Oct 23-25, 2026');
        assert.equal(await page.$eval('#tripSelectedDeparture', node => node.textContent), 'Selected departure: Oct 23-25, 2026');
        await page.select('#dateSelect', 'Oct 16-18, 2026');
        await page.select('#peopleCount', '2');
        assert.equal(await page.$eval('#totalAmount', node => node.textContent), '₹8,998');
        await center('#bookNowBtn');
        await Promise.all([page.waitForNavigation(), page.click('#bookNowBtn')]);
        const checkout = new URL(page.url());
        assert.equal(checkout.pathname, '/checkout.html');
        assert.equal(checkout.searchParams.get('trip'), id);
        assert.equal(checkout.searchParams.get('date'), 'Oct 16-18, 2026');
        assert.equal(checkout.searchParams.get('people'), '2');
        for (const candidate of ['Oct 2-4, 2026', 'Dec 1-2, 2026', '<img src=x onerror=alert(1)>', 'Oct 16-18, 2026&people=99']) {
            await page.goto(`${origin}/trips/${id}/?date=${encodeURIComponent(candidate)}`, {waitUntil: 'networkidle0'});
            assert.equal(await page.$eval('#dateSelect', node => node.value), '');
            assert.equal(await page.$eval('#tripSelectedDeparture', node => node.hidden), true);
        }
        override = {availableDates: [], cardSummary: 'A relaxed weekend away', departureCity: 'Bangalore'};
        await page.goto(`${origin}/trips/${id}/?date=Oct%2016-18%2C%202026`, {waitUntil: 'networkidle0'});
        assert.deepEqual(await page.$eval('#dateSelect', node => [...node.options].map(option => ({value: option.value, text: option.textContent, disabled: option.disabled}))),
            [{value: '', text: 'New dates coming soon', disabled: true}]);
        assert.equal(await page.$eval('#tripHeadingDeparture', node => node.textContent), 'Departing from Bangalore');
        assert.equal(await page.$eval('#tripHeadingSummary', node => node.textContent), 'A relaxed weekend away');
        override = {availableDates: ['<img src=x onerror=alert(1)>'], cardSummary: '<script>alert(1)</script>'};
        await page.goto(`${origin}/trips/${id}/?date=${encodeURIComponent(override.availableDates[0])}`, {waitUntil: 'networkidle0'});
        assert.equal(await page.$eval('#dateSelect', node => node.options[1].textContent), override.availableDates[0]);
        assert.equal(await page.$eval('#dateSelect', node => node.value), '');
        assert.equal(await page.$('#tripHeadingSummary script'), null);
        override = {isActive: false};
        await page.goto(`${origin}/trips/${id}/?date=Oct%2016-18%2C%202026`, {waitUntil: 'networkidle0'});
        assert.equal(await page.$eval('#dateSelect', node => node.disabled), true);
        assert.equal(await page.$eval('#dateSelect', node => node.value), '');
        assert.equal(await page.$eval('#bookNowBtn', node => node.textContent), 'Coming Soon');
        assert.deepEqual(errors.filter(error => !baselineErrors.includes(error)), []);
        assert.deepEqual(blockedWrites, []);
        console.log(JSON.stringify({pass: true, output, baselineErrors, checks: '375/768/1440 layouts, title, facts, packing, keyboard shortcuts/panels, original date checkout/amount parity, invalid/expired/empty/inactive dates, text-only labels, no new exceptions or writes'}));
    } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
