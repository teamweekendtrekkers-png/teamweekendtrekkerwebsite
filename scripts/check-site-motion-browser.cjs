'use strict';
// Offline browser fixtures. No live bookings, payments or external writes.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {readTripsData,renderTripPage,readSiteOrigin}=require('./generate-trip-pages');
const root=path.resolve(__dirname,'..'),origin='http://127.0.0.1:43212';
const trips=readTripsData(root),id=Object.keys(trips).find(id=>/sakleshpur/i.test(trips[id].title));
const trip=trips[id],template=fs.readFileSync(path.join(root,'trip-detail.html'),'utf8');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined});
 const results=[];
 try{for(const width of [320,390,1280]){
  const page=await browser.newPage({viewport:{width,height:900},hasTouch:width<768}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.origin!==origin||request.method()!=='GET')return route.abort();
   if(url.pathname==='/tour.html')return route.fulfill({contentType:'text/html',body:renderTripPage({template,tripId:id,trip,projectRoot:root,siteOrigin:readSiteOrigin(root)})});
   const file=path.resolve(root,'.'+url.pathname);
   if(!file.startsWith(root+path.sep))return route.abort();
   try{return route.fulfill({contentType:({'.css':'text/css','.js':'text/javascript','.html':'text/html','.json':'application/json','.jpg':'image/jpeg','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});}catch{return route.fulfill({status:404,body:''});}
  });
  await page.goto(origin+'/tour.html');await page.locator('body.tour-refined').waitFor();
  await page.waitForFunction(()=>document.getElementById('galleryMainImg').complete);
  const counter=page.locator('.gallery-counter'),initial=await counter.textContent();
  await page.locator('.gallery-next').click();await page.waitForFunction(()=>document.getElementById('galleryMainImg').complete);
  assert.notEqual(await counter.textContent(),initial);
  await page.waitForTimeout(240);
  const manual=await counter.textContent();await page.waitForTimeout(400);assert.equal(await counter.textContent(),manual);
  assert.ok(await counter.isVisible());assert.ok(await page.locator('.gallery-prev').isVisible());
  const panel=page.locator('details[data-trip-section]').first(),summary=panel.locator('summary').first();
  await panel.evaluate(node=>{node.open=false;});await summary.click();
  assert.ok(await panel.evaluate(node=>node.getAnimations().length>0));
  await page.waitForTimeout(230);assert.equal(await panel.getAttribute('open'),'');
  await summary.focus();await page.keyboard.press('Enter');await page.waitForTimeout(230);assert.equal(await panel.getAttribute('open'),null);
  await summary.click();await summary.click();await page.waitForTimeout(230);assert.equal(await panel.getAttribute('open'),null);
  const header=page.locator('.accordion-header').first();
  await header.click();await page.waitForTimeout(230);
  assert.equal(await header.getAttribute('aria-expanded'),String(await header.evaluate(node=>node.parentElement.classList.contains('active'))));
  await page.emulateMedia({reducedMotion:'reduce'});await summary.click();
  assert.equal(await panel.evaluate(node=>node.getAnimations().length),0);
  assert.equal(await panel.getAttribute('open'),'');
  assert.equal(await page.locator('.trip-section-links a').first().evaluate(node=>getComputedStyle(node).transitionDuration),'0s');
  await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));await page.waitForTimeout(80);
  const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,padding:parseFloat(getComputedStyle(document.body).paddingBottom),bar:document.getElementById('mobileBookBtn').getBoundingClientRect().height}));
  assert.equal(layout.overflow,false);if(width<768)assert.ok(layout.padding>=layout.bar);
  assert.deepEqual(errors,[]);results.push({width,...layout});await page.close();
 }}finally{await browser.close();}
 console.log(JSON.stringify({pass:true,results,checks:'Manual gallery, visible controls, animated/reversible disclosures, keyboard, reduced motion, bottom-bar clearance; no external writes.'},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
