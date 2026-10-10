// Local Chromium checks only: no live publication, booking or payment requests.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict'), {execFileSync} = require('node:child_process');
const puppeteer = require(process.env.PUPPETEER_MODULE || 'puppeteer');
const root = path.resolve(__dirname, '..');
const footer = require('../js/footer-settings');
const {readTripsData, renderTripPage, readSiteOrigin} = require('./generate-trip-pages');
const trips = readTripsData(root), id = trips.wayanad ? 'wayanad' : Object.keys(trips)[0];
const pages = ['index.html','trips.html','trip-detail.html','about.html','contact.html','checkout.html'];
const originals = Object.fromEntries(pages.map(file => [file, execFileSync('git',['show','HEAD:' + file],{cwd:root})]));
const originalHomepage = execFileSync('git',['show','HEAD:js/homepage-settings.js'],{cwd:root});
let baseline = false, config = JSON.parse(fs.readFileSync(path.join(root,'js/homepage-config.json'))), fail = false, delayed = false;
const server = http.createServer((req,res) => {
    const pathname = new URL(req.url,'http://localhost').pathname;
    if (baseline && pathname === '/js/homepage-settings.js') { res.setHeader('Content-Type','text/javascript'); return res.end(originalHomepage); }
    if (pathname === '/js/homepage-config.json') {
        const respond = () => { res.setHeader('Content-Type','application/json'); res.statusCode = fail ? 500 : 200; res.end(fail ? '{}' : JSON.stringify(config)); };
        if (delayed) setTimeout(respond, 600); else respond(); return;
    }
    const match = pathname.match(/^\/trips\/([a-z0-9_-]+)\/$/);
    if (match && trips[match[1]]) {
        res.setHeader('Content-Type','text/html');
        return res.end(renderTripPage({template:fs.readFileSync(path.join(root,'trip-detail.html'),'utf8'),tripId:match[1],trip:trips[match[1]],projectRoot:root,siteOrigin:readSiteOrigin(root)}));
    }
    if (baseline && originals[pathname.slice(1)]) { res.setHeader('Content-Type','text/html'); return res.end(originals[pathname.slice(1)]); }
    const file = path.resolve(root,'.' + pathname);
    if (!file.startsWith(root + '/')) { res.statusCode = 403; return res.end(); }
    try { res.setHeader('Content-Type',{'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.jpg':'image/jpeg','.png':'image/png'}[path.extname(file)] || 'application/octet-stream'); res.end(fs.readFileSync(file)); }
    catch { res.statusCode = 404; res.end(); }
});
(async () => {
    await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
    const browser = await puppeteer.launch({executablePath:process.env.CHROME_BIN,headless:true,args:['--no-sandbox']});
    try {
        const page = await browser.newPage(), errors = [];
        const origin = 'http://127.0.0.1:' + server.address().port;
        page.on('pageerror', error => errors.push(error.message));
        await page.setRequestInterception(true);
        page.on('request', request => request.url().startsWith(origin) || request.url().startsWith('data:') ? request.continue() : request.abort());
        await page.evaluateOnNewDocument(() => {
            window.copied = [];
            Object.defineProperty(navigator,'clipboard',{value:{writeText:async value => {window.copied.push(value);}}});
        });
        const url = file => origin + '/' + file + (file === 'trip-detail.html' || file === 'checkout.html' ? '?trip=' + id + '&date=' + encodeURIComponent(trips[id].availableDates[0]) + '&people=2' : '');
        const payment = () => page.evaluate(() => ({
            checkout: document.querySelector('#paymentSection')?.innerHTML,
            tripUpi: document.querySelector('.upi-card')?.innerHTML,
            book: document.querySelector('#bookNowBtn')?.outerHTML,
            form: document.querySelector('#checkoutForm')?.outerHTML,
            summary: document.querySelector('#summaryTotal')?.textContent,
            secureCopy: window.secureCopyUPI?.toString(),
        }));
        const before = new Map(), baselineErrors = new Set();
        for (const file of pages) {
            baseline = true; await page.goto(url(file),{waitUntil:'networkidle0'});
            before.set(file,await payment()); for (const error of errors.splice(0)) baselineErrors.add(error);
        }
        baseline = false;
        config.footer = {...footer.defaults, brandName:'Weekend Crew', description:'<img src=x onerror=evil()> Travel together', location:'Bangalore, Karnataka',
            showUpi:false, email:'hello@example.com', homeLabel:'Start here', copyright:'© {year} {brand}. Travel together.',
            informationLinks:[{id:'policy',label:'Travel information',url:'contact.html',visible:true},{id:'hidden',label:'Not shown',url:'about.html',visible:false}]};
        for (const width of [375,768,1440]) {
            await page.setViewport({width,height:1000});
            for (const file of [...pages,'trips/' + id + '/']) {
                await page.goto(url(file),{waitUntil:'networkidle0'}); await page.waitForSelector('[data-footer-ready="true"]');
                if (before.has(file)) assert.deepEqual(await payment(),before.get(file),'payment/booking changed on ' + file);
                assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),'overflow on ' + file + ' at ' + width);
                if (file !== 'checkout.html') {
                    assert.equal(await page.$eval('[data-footer-upi]',node => getComputedStyle(node).display),'none');
                    assert.equal(await page.$eval('[data-footer-brand] h4',node => node.textContent),'Weekend Crew');
                    assert.equal(await page.$('[data-footer-brand] p img'),null);
                    assert.deepEqual(await page.$$eval('[data-footer-navigation] a',nodes => nodes.map(node => node.getAttribute('href'))),['index.html','trips.html','about.html','contact.html']);
                    assert.deepEqual(await page.$$eval('[data-footer-information] a',nodes => nodes.map(node => node.textContent)),['Travel information']);
                    assert.equal(await page.$eval('[data-footer-contact] a[href^="mailto:"]',node => node.href),'mailto:hello@example.com');
                    if (file === 'index.html') { await page.$eval('.footer',node => node.scrollIntoView({block:'start',behavior:'instant'})); await page.screenshot({path:'/tmp/footer-hidden-' + width + '.png'}); }
                }
                assert.equal(await page.$eval('.footer-bottom > p',node => node.textContent),'© ' + new Date().getFullYear() + ' Weekend Crew. Travel together.');
            }
            console.log('PASS: customized/hidden footer and unchanged payment/booking on all pages at ' + width + 'px');
        }
        config.footer.showUpi = true; config.footer.whatsAppNumber = '919876543210'; config.footer.instagramUrl = 'https://instagram.com/weekendcrew';
        await page.goto(url('index.html'),{waitUntil:'networkidle0'});
        assert.equal(await page.$eval('[data-footer-upi]',node => node.hidden),false);
        assert.equal(await page.$eval('[data-footer-contact] a[href*="wa.me"]',node => node.href),'https://wa.me/919876543210');
        await page.click('[data-footer-upi] button');
        assert(await page.evaluate(() => copied.length === 1 && copied[0] === TravelSecurity.getUPI()),'footer copy must still use the actual secured payment ID');
        await page.evaluate(() => {
            FooterSettings.apply({...FooterSettings.defaults,showUpi:false},document);
        });
        assert.equal(await page.$eval('[data-footer-contact] a[href*="wa.me"]',node => node.href),'https://wa.me/917019235581','clearing an override restores the live HTML number');
        assert.equal(await page.$('[data-footer-information]'),null,'clearing optional links removes the column');
        config.footer.showUpi = false; delayed = true;
        await page.goto(url('index.html'),{waitUntil:'domcontentloaded'});
        assert.equal(await page.$eval('[data-footer-upi]',node => node.hidden),true,'no UPI flash before settings load');
        await page.waitForSelector('[data-footer-ready="true"]');
        fail = true; delayed = false; await page.goto(url('index.html'),{waitUntil:'networkidle0'});
        assert.equal(await page.$eval('[data-footer-upi]',node => node.hidden),true,'failure must not reveal hidden UPI');
        await page.setJavaScriptEnabled(false); await page.goto(url('index.html'),{waitUntil:'networkidle0'});
        assert.equal(await page.$eval('[data-footer-upi]',node => node.hidden),true);
        assert.equal(await page.$$eval('[data-footer-navigation] a',nodes => nodes.length),4);
        assert.deepEqual(errors.filter(error => !baselineErrors.has(error)),[]);
        console.log('PASS: secured UPI copy, contact overrides/reset, optional columns, delayed/error/no-JavaScript fallback; no payment requests or live writes.');
        console.log('Existing baseline browser exceptions:', [...baselineErrors]);
    } finally { await browser.close(); server.close(); }
})().catch(error => {console.error(error); server.close(); process.exitCode = 1;});
