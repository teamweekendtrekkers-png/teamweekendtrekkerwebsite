// Real browser checks for the offline PDF renderer. Every request is fulfilled from local files.
const fs = require('node:fs'), path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const styleLinks = fs.readFileSync(path.join(root, 'trip-detail.html'), 'utf8').match(/<link[^>]*rel="stylesheet"[^>]*>/g).join('');
const output = process.env.BROCHURE_OUTPUT || path.join(root, 'build', 'brochure-review');
fs.mkdirSync(output, { recursive: true });
const fixture = { id: 'misty-hills', title: 'Misty Hills 🥾', location: 'Coorg, Karnataka', price: '₹3,499', duration: '2 days / 1 night', difficulty: 'Easy', availableDates: ['Oct 23-25, 2030'], about: 'Coffee **country**, *misty trails* and a weekend outdoors.', highlights: ['Sunrise views', 'Coffee plantations'], includes: ['Transport from Bengaluru', 'Stay and meals as listed'], excludes: ['Personal expenses'], thingsToCarry: ['Walking shoes', 'Water bottle'], perfectFor: ['Friends and solo travellers'], itinerary: [
    { day: 'Day 0', title: 'Departure from Bengaluru', activities: ['Board at your selected pickup point.', 'Meet your fellow travellers.'] },
    { day: 'Day 1', title: 'Explore the hills', description: 'An early start for a memorable day.', activities: ['Breakfast and a guided walk.', 'Enjoy the views and return to the stay.'] },
    { day: 'Day 2', title: 'Coffee and the journey home', activities: ['Explore a coffee plantation.', 'Return to Bengaluru in the evening.'] }
], contentSections: { custom_why_us: { mode: 'custom', heading: 'Why choose us', items: [{ title: 'Thoughtfully planned', description: 'A clear itinerary, local knowledge and time to enjoy the outdoors.' }] }, custom_hidden: { mode: 'hidden', heading: 'Hidden', items: [{ description: 'PRIVATE NOTE' }] } } };
async function respond(route, origin) {
    const request = route.request(), url = new URL(request.url()), pathname = url.pathname;
    if (url.origin !== origin || request.method() !== 'GET') return route.abort();
    if (pathname === '/') {
        return route.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${styleLinks}<button id="tripBrochureButton">Brochure (PDF)</button><select id="dateSelect"><option>Oct 23-25, 2030</option></select><div class="quick-contact"><a class="btn-whatsapp" href="https://wa.me/917019235581">WhatsApp</a></div><dialog id="tripBrochureDialog" class="trip-brochure-dialog" aria-labelledby="heading"><h2 id="heading">Trip brochure</h2><p class="trip-brochure-hint">Preview the pages below. Your PDF includes the itinerary and trip details to keep or share.</p><p id="tripBrochureStatus" role="status"></p><div id="tripBrochurePreview" class="trip-brochure-preview"></div><div class="trip-brochure-controls"><button class="btn btn-primary" id="tripBrochureDownload">Download PDF</button><button class="btn btn-secondary" id="tripBrochureShare" hidden>Share PDF</button><button class="btn btn-primary" id="tripBrochureRetry" hidden>Try again</button><button class="btn btn-secondary" id="tripBrochureClose">Close</button></div></dialog><script>const tripsData={'misty-hills':${JSON.stringify(fixture)}}; function getTripFromURL(){return 'misty-hills'} function getTripData(id){return tripsData[id]}</script><script src="/js/inline-format.js"></script><script src="/js/trip-date-utils.js"></script><script src="/js/trip-detail-lists.js"></script><script src="/js/trip-content-defaults.js"></script><script src="/js/trip-content.js"></script><script src="/js/trip-brochure.js"></script>` });
    }
    const file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep)) return route.fulfill({ status: 403 });
    try {
        const contentType = { '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css' }[path.extname(file)] || 'application/octet-stream';
        return route.fulfill({ contentType, body: fs.readFileSync(file) });
    } catch { return route.fulfill({ status: 404 }); }
}
(async () => {
    const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || undefined, headless: true, args: ['--no-sandbox'] });
    try {
        const origin = 'https://brochure.test';
        const page = await browser.newPage({ acceptDownloads: true }), errors = [];
   await page.addInitScript(()=>localStorage.setItem('twt-analytics-consent','no'));
        await page.addInitScript(() => {
            const original = URL.createObjectURL;
            URL.createObjectURL = function(blob) {
                if (blob.type === 'application/pdf') window.testPdf = blob;
                return original.call(this, blob);
            };
        });
        page.on('pageerror', error => errors.push(error.message));
        await page.route('**/*', route => respond(route, origin));
        for (const width of [390, 1440]) {
            await page.setViewportSize({ width, height: 844 });
            await page.goto(origin);
            await page.getByRole('button', { name: 'Brochure (PDF)', exact: true }).click();
            await page.waitForFunction(() => !document.getElementById('tripBrochureDownload').disabled && document.getElementById('tripBrochureStatus').textContent.includes('PDF ready'));
            const count = await page.locator('#tripBrochurePreview figure').count();
            assert.ok(count >= 2);
            const overflow = await page.locator('#tripBrochureDialog').evaluate(el => el.scrollWidth > el.clientWidth + 1);
            assert.equal(overflow, false, 'Dialog must fit the viewport');
            const controls = await page.locator('#tripBrochureDialog').evaluate(el => ({
                overflow: el.scrollHeight > el.clientHeight + 1,
                closeBottom: document.getElementById('tripBrochureClose').getBoundingClientRect().bottom,
                centre: el.getBoundingClientRect().left + el.getBoundingClientRect().width / 2,
                viewportWidth: innerWidth, viewportHeight: innerHeight,
            }));
            assert.equal(controls.overflow, false, 'Only PDF pages should scroll; controls must remain visible');
            assert.ok(controls.closeBottom <= controls.viewportHeight, 'Close must stay on screen');
            assert.ok(Math.abs(controls.centre - controls.viewportWidth / 2) < 2, 'Dialog must be centred');
            await page.locator('#tripBrochurePreview img').first().screenshot({ path: path.join(output, `first-page-${width}.png`) });
            await page.screenshot({ path: path.join(output, `preview-${width}.png`) });
            const downloadPromise = page.waitForEvent('download');
            await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
            const download = await downloadPromise;
            assert.equal(download.suggestedFilename(), 'misty-hills-brochure.pdf');
            await download.cancel();
            const bytes = await page.evaluate(async () => Array.from(new Uint8Array(await window.testPdf.arrayBuffer())));
            fs.writeFileSync(path.join(output, 'misty-hills-brochure.pdf'), Buffer.from(bytes));
            const source = fs.readFileSync(path.join(output, 'misty-hills-brochure.pdf')).toString('latin1');
            assert.ok(source.startsWith('%PDF-1.4'));
            assert.match(source,/\/ToUnicode/,'Downloaded PDF must include searchable Unicode text');
            assert.match(source,/Helvetica-Oblique/,'Italic text remains italic in the PDF');
            assert.match(source,/d83edd7e/,'The authored boot emoji must survive in the text layer');
            assert.equal((source.match(/\/Subtype \/Link/g)||[]).length,count*2,'Every page retains booking and WhatsApp links');
            assert.equal(Number(source.match(/\/Type \/Pages \/Count (\d+)/)[1]), count);
            await page.getByText('Read brochure text', { exact: true }).click();
            assert.ok((await page.locator('#tripBrochurePreview').innerText()).includes('Why choose us'));
            assert.ok(!(await page.locator('#tripBrochurePreview').innerText()).includes('PRIVATE NOTE'));
            await page.getByRole('button', { name: 'Close', exact: true }).click();
            await page.waitForFunction(() => document.querySelectorAll('#tripBrochurePreview img').length === 0);
            assert.equal(await page.locator('#tripBrochurePreview img').count(), 0);
            assert.equal(await page.locator('#tripBrochureButton').evaluate(el => el === document.activeElement), true);
        }
        // Recovery from a genuine rendering error and from closing mid-generation.
        await page.evaluate(() => { window.originalToBlob = HTMLCanvasElement.prototype.toBlob; HTMLCanvasElement.prototype.toBlob = function(callback) { callback(null); }; });
        await page.locator('#tripBrochureButton').click();
        await page.getByRole('button', { name: 'Try again', exact: true }).waitFor();
        assert.equal(await page.locator('#tripBrochureDownload').isDisabled(), true);
        await page.evaluate(() => { HTMLCanvasElement.prototype.toBlob = window.originalToBlob; });
        await page.getByRole('button', { name: 'Try again', exact: true }).click();
        await page.waitForFunction(() => !document.getElementById('tripBrochureDownload').disabled);
        await page.getByRole('button', { name: 'Close', exact: true }).click();
        await page.locator('#tripBrochureButton').click();
        await page.getByRole('button', { name: 'Close', exact: true }).click();
        await page.locator('#tripBrochureButton').click();
        await page.waitForFunction(() => !document.getElementById('tripBrochureDownload').disabled);
        assert.deepEqual(errors, []);
        console.log('Brochure browser checks passed: phone/desktop, real page previews, valid PDF download, section visibility, retry and close/reopen.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

