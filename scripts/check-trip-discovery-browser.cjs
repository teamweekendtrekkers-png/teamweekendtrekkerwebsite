// Read-only local Chromium gate. No requests to the live website or GitHub.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const puppeteer = require(process.env.PUPPETEER_MODULE || 'puppeteer');
const settings = require('../js/homepage-settings');
const root = path.resolve(__dirname, '..');
const fixtures = {
    soon: {title:'Green hill',location:'Coorg',badge:'Trek',experience:'trek',image:'images/missing-original.jpg',cardImage:'images/missing-cover.jpg',cardSummary:'Forest and hill views',departureCity:'Bengaluru',price:'₹3,999',duration:'2 days',difficulty:'Moderate',featured:true,availableDates:['Aug 14-16, 2099','Aug 21-23, 2099']},
    later: {title:'Coast & town',location:'Gokarna',badge:'Road Trip',experience:'beach',image:'images/logo.jpg',price:'₹4,999',duration:'3 days',availableDates:['Aug 21-23, 2099']},
    undated: {title:'Heritage walk',location:'Hampi',badge:'Trip',experience:'heritage',image:'images/logo.jpg',availableDates:[]},
    other: {title:'Unselected adventure',location:'Mysuru',badge:'Adventure',image:'images/logo.jpg',availableDates:['Aug 1-3, 2099']},
    inactive: {title:'Next season',location:'Munnar',badge:'Trip',image:'images/logo.jpg',isActive:false,availableDates:['Aug 14-16, 2099']}
};
let config = settings.normalize({version:1, sections:{reviews:{rating:'4.7'}}, upcomingBatches:{tripSelection:'selected',tripIds:['soon'],departureSelection:'selected',departures:[{tripId:'soon',date:'Aug 21-23, 2099'}]}});
const server = http.createServer((req, res) => {
    if (!['GET','HEAD'].includes(req.method)) { res.statusCode = 405; return res.end(); }
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/js/homepage-config.json') { res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify(config)); }
    if (pathname === '/js/trips-data.js') { res.setHeader('Content-Type','text/javascript'); return res.end('const tripsData = ' + JSON.stringify(fixtures) + ';'); }
    if (pathname === '/js/featured-trips.js') { res.setHeader('Content-Type','text/javascript'); return res.end("function getFeaturedTrips(){return [{...tripsData.soon,id:'soon'},{...tripsData.later,id:'later'}];}"); }
    const file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + '/')) { res.statusCode = 403; return res.end(); }
    try { res.setHeader('Content-Type', {'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.jpg':'image/jpeg','.png':'image/png'}[path.extname(file)] || 'application/octet-stream'); res.end(fs.readFileSync(file)); }
    catch { res.statusCode = 404; res.end(); }
});
(async () => {
    await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
    const browser = await puppeteer.launch({executablePath:process.env.CHROME_BIN,headless:true,args:['--no-sandbox']});
    try {
        const page = await browser.newPage(), errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setRequestInterception(true);
        page.on('request', request => request.url().startsWith('http://127.0.0.1:') && ['GET','HEAD'].includes(request.method()) ? request.continue() : request.abort());
        const base = 'http://127.0.0.1:' + server.address().port;
        const click = async selector => { await page.$eval(selector,node => node.scrollIntoView({block:'center',behavior:'instant'})); await page.click(selector); };
        for (const width of [390,768,1440]) {
            await page.setViewport({width,height:900});
            await page.goto(base + '/trips.html',{waitUntil:'networkidle0'});
            await page.waitForSelector('#tripsDynamicGrid .trip-card');
            assert.deepEqual(await page.$$eval('#tripsDynamicGrid .trip-card',nodes => nodes.map(node => node.dataset.tripId)), ['other','soon','later','undated']);
            assert.equal(await page.$('.trip-inactive'),null);
            await page.waitForFunction(() => { const image = document.querySelector('[data-trip-id="soon"] img'); return image.getAttribute('src') === 'images/logo.jpg' && image.complete && image.naturalWidth > 0; });
            await page.type('#trip-discovery-controls input[type="search"]','gokarna');
            assert.deepEqual(await page.$$eval('#tripsDynamicGrid .trip-card',nodes => nodes.map(node => node.dataset.tripId)),['later']);
            await click('#trip-discovery-controls .discovery-reset');
            const selectors = await page.$$eval('#trip-discovery-controls select',nodes => nodes.map(node => node.parentElement.textContent));
            assert.equal(selectors.length,2);
            await page.select('#trip-discovery-controls label:nth-child(2) select','trek');
            assert.deepEqual(await page.$$eval('#tripsDynamicGrid .trip-card',nodes => nodes.map(node => node.dataset.tripId)),['soon']);
            await page.select('#trip-discovery-controls label:nth-child(3) select','2099-08-21/2099-08-23');
            const href = await page.$eval('[data-trip-id="soon"] .trip-footer a',node => node.getAttribute('href'));
            assert.equal(new URL(href,base).searchParams.get('date'),'Aug 21-23, 2099');
            await page.type('#trip-discovery-controls input[type="search"]','no matching destination');
            assert(await page.$('.discovery-empty'));
            await click('[data-reset-results]');
            await click('#show-coming-soon');
            assert.equal(await page.$$eval('#tripsDynamicGrid .trip-card',nodes => nodes.length),5);
            assert.equal(await page.$eval('#tripsDynamicGrid .trip-card:last-child',node => node.dataset.tripId),'inactive');
            await click('[data-filter="roadtrip"]');
            assert.deepEqual(await page.$$eval('#tripsDynamicGrid .trip-card',nodes => nodes.map(node => node.dataset.tripId)),['later']);
            assert.deepEqual(await page.$$eval('[data-filter].active',nodes => nodes.map(node => node.dataset.filter)),['roadtrip']);
            assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),'catalogue overflow at '+width);
            await page.evaluate(() => scrollTo({top:0,behavior:'instant'}));
            await page.screenshot({path:'/tmp/trip-discovery-catalogue-'+width+'.png',fullPage:true});
            await page.goto(base + '/index.html',{waitUntil:'networkidle0'});
            await page.waitForSelector('.batch-trip-title');
            assert.equal(await page.$eval('#homepage-discovery-panel',node => node.open),width > 600);
            if (width <= 600) assert(await page.$eval('.batch-card',node => node.getBoundingClientRect().top + scrollY) < 1050,'mobile departure should appear without expanding filters');
            assert.deepEqual(await page.$$eval('.batch-trip-title',nodes => nodes.map(node => node.textContent.trim())),['Green hill']);
            assert.equal(await page.$$eval('#homepage-discovery-controls label:last-of-type option',nodes => nodes.length),2);
            assert.equal(new URL(await page.$eval('.batch-trip-title',node => node.href)).searchParams.get('date'),'Aug 21-23, 2099');
            assert.equal(await page.$eval('#hero-trust-rating',node => node.textContent),'⭐ 4.7/5 on Google');
            assert.equal(await page.$eval('.stats-grid .stat-item:nth-child(3) .stat-number',node => node.textContent),'4.7⭐');
            assert.equal(await page.$eval('#hero-trust-link',node => node.href),config.sections.reviews.googleMapsUrl);
            await click('.hero .btn-primary');
            await page.waitForFunction(() => location.hash === '#upcoming-batches');
            if (width <= 600) {
                await page.focus('#homepage-discovery-panel summary'); await page.keyboard.press('Enter');
                assert.equal(await page.$eval('#homepage-discovery-panel',node => node.open),true,'mobile filters must open by keyboard');
            }
            await page.type('#homepage-discovery-controls input','Gokarna');
            assert(await page.$('[data-reset-home]'),'curated trip must not be reintroduced by search');
            await click('[data-reset-home]');
            assert.equal(await page.$$eval('.batch-trip-title',nodes => nodes.length),1);
            assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),'homepage overflow at '+width);
            if (width <= 600) await click('#homepage-discovery-panel summary');
            await page.evaluate(() => scrollTo({top:0,behavior:'instant'}));
            await page.screenshot({path:'/tmp/trip-discovery-home-'+width+'.png'});
            if (width === 390) assert(await page.$eval('.hero',node => node.getBoundingClientRect().height) <= 560,'mobile hero should be compact');
            console.log('PASS: search, combined filters, reset, inactive toggle, trip type, safe image fallback, selected departure, curated home, consistent rating and layout at '+width+'px');
        }
        config.discovery = {enabled:false,showSearch:false,showExperienceFilter:false,showWeekendFilter:false};
        config.sections.reviews.enabled = false; config.upcomingBatches.enabled = false;
        await page.goto(base + '/index.html',{waitUntil:'networkidle0'});
        assert.equal(await page.$eval('#hero-trust',node => node.hidden),true);
        assert.equal(await page.$eval('#homepage-discovery-panel',node => node.hidden),true);
        assert.equal(await page.$eval('.hero .btn-primary',node => node.getAttribute('href')),'trips.html');
        await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}),click('.hero .btn-primary')]);
        assert.equal(new URL(page.url()).pathname,'/trips.html','disabled upcoming section must keep the hero action navigable');
        assert.equal(await page.$eval('#trip-discovery-controls',node => node.hidden),true);
        await click('#show-coming-soon');
        assert.equal(await page.$$eval('#tripsDynamicGrid .trip-card',nodes => nodes.length),5);
        assert.deepEqual(errors,[]);
        console.log('PASS: manager visibility settings, disabled discovery retains full catalogue, no browser exceptions; no external writes or live requests.');
    } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
