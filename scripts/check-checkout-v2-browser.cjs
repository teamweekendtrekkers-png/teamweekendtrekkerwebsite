// Offline fixtures only: all requests are fulfilled locally; payment POSTs are mocked.
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {assertReadable}=require('./color-contrast.cjs');
const root=path.resolve(__dirname,'..'),origin='http://127.0.0.1:43210',date='Oct 16-18, 2026',later='Oct 30-Nov 1, 2026';
const output=process.env.PAYMENT_REVIEW_DIR||path.join(root,'../payment-reviews');
const payment=()=>({checkoutVersion:2,mode:'direct',requestTripIds:[],profiles:[{id:'primary',label:'Primary',upiId:'first@upi',receiverName:'First receiver',qrImage:'images/test-qr.png'},{id:'backup',label:'Backup',upiId:'second@upi',receiverName:'Second receiver',qrImage:'images/backup-qr.png'}],activeProfileId:'primary',showQr:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined});
 fs.mkdirSync(output,{recursive:true});
 try{
  for(const width of [360,390,1440]){
   const page=await browser.newPage({viewport:{width,height:900}}),errors=[],posts=[];
   let p=payment(),closed=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{const OriginalDate=Date;globalThis.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:['2026-10-14T05:00:00Z']));}static now(){return new OriginalDate('2026-10-14T05:00:00Z').getTime();}};Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.copiedUpi=text;}}});});
   await page.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(req.method()==='POST'){
     assert.equal(req.url(),'https://vdxunrhcahgkwtzvjjdj.supabase.co/functions/v1/booking-request');posts.push(JSON.parse(req.postData()));
     return route.fulfill({contentType:'application/json',body:JSON.stringify({accepted:true,booking_reference:'TWT-TEST-'+posts.length})});
    }
    if(url.origin!==origin)return route.abort();
    const file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep))return route.abort();
    if(url.pathname==='/js/commerce-config.json')return route.fulfill({contentType:'application/json',body:JSON.stringify({version:1,payment:p,showCoupons:true,coupons:[{code:'SAVE100',enabled:true,type:'fixed',value:100,tripIds:[]}]})});
    if(url.pathname.endsWith('-qr.png'))return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')});
    try{
     let body=fs.readFileSync(file);
     if(url.pathname==='/js/trips-data.js')body=body.toString()+`\ntripsData.demo={...tripsData['kannur-theyyam'],title:'Demo Trip',price:'₹4,499',isActive:true,availableDates:${JSON.stringify([date,later])},closedDepartures:${JSON.stringify(closed)},departureTime:'22:00',contentSections:{custom_why_choose_us:{mode:'custom',heading:'Why choose us',expanded:true,items:[{title:'Local hosts',description:'Personal support throughout the journey.',icon:'group'}]},custom_hidden:{mode:'hidden',heading:'Hidden section',items:[]}}};`;
     if(url.pathname==='/js/security.js'){
       const upi='first@upi';let checksum=0;for(const c of upi)checksum=((checksum<<5)-checksum+c.charCodeAt(0))|0;
       body=body.toString().replace(/_p1:\s*\[[^\]]+\]/,'_p1: [102,105,114,115,116]').replace(/_p3:\s*\[[^\]]+\]/,'_p3: [117,112,105]').replace(/_checksum:\s*-?\d+/,'_checksum: '+checksum);
     }
     return route.fulfill({contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'})[path.extname(file)]||'application/octet-stream',body});
    }catch{return route.fulfill({status:404,body:''});}
   });
   const open=async(label=date)=>{await page.goto(origin+'/checkout.html?trip=demo&date='+encodeURIComponent(label)+'&people=1');await page.waitForFunction(()=>!document.getElementById('paymentModeNotice').textContent.includes('Loading'));};
   const fill=async()=>{await page.fill('#fullName','Demo Traveller');await page.fill('#email','demo@example.com');await page.fill('#phone','9999999999');};
   await open();
   if(width<=390){
    assert.equal(await page.locator('.summary-row').first().evaluate(el=>getComputedStyle(el).marginBottom),'0px');
    const input=await page.locator('#fullName').boundingBox();assert.ok(input.height>=44&&input.height<=52,'Compact inputs retain comfortable touch height');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Phone checkout fits without sideways scrolling');
    await page.screenshot({path:path.join(output,`checkout-compact-${width}.png`),fullPage:true});
   }
   await assertReadable(page.locator('#submitDetailsBtn'));
   await assertReadable(page.locator('#requestStatus'));
   await assertReadable(page.locator('.summary-total'));
   assert.equal(await page.locator('#requestStatus').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 241, 214)');
   await fill();
   assert.equal(await page.locator('input[name="bookingPaymentMode"][value="direct"]').isChecked(),true);
   assert.equal(await page.locator('input[name="bookingPaymentMode"][value="confirmation"]').isVisible(),false);
   assert.equal(await page.locator('#openPaymentUpi,#popupOpenUpi,#upiPayBtn').count(),0);
   assert.equal(await page.locator('.page-header h1').evaluate(n=>getComputedStyle(n).color),'rgb(255, 255, 255)');
   await page.click('#changeBooking');await page.selectOption('#changeDeparture',later);await page.selectOption('#changeTravellers','2');await page.click('.booking-change-dialog [type="submit"]');
   await page.waitForSelector('.booking-change-dialog:not([open])',{state:'attached'});
   assert.match(page.url(),/checkout.html/);assert.equal(await page.inputValue('#fullName'),'Demo Traveller');assert.equal(await page.inputValue('#email'),'demo@example.com');
   assert.equal(new URL(page.url()).searchParams.get('date'),later);assert.equal(new URL(page.url()).searchParams.get('people'),'2');
   await page.locator('#couponEntry summary').click();await page.fill('#couponCode','SAVE100');await page.click('#applyCoupon');await page.waitForFunction(()=>window.bookingData.total===8898);
   await page.click('#submitDetailsBtn');await page.waitForSelector('#paymentSection',{state:'visible'});
   assert.equal(posts.length,0);assert.match(await page.textContent('#paymentDue'),/4,449/);
   await page.waitForTimeout(2200); // The legacy masking timer must leave this explicitly visible ID readable.
   assert.equal(await page.textContent('#paymentUpiValue'),'first@upi');
   await page.screenshot({path:path.join(output,`checkout-v2-payment-${width}.png`),fullPage:true});
   await page.click('#copyPaymentUpi');assert.equal(await page.evaluate(()=>window.copiedUpi),'first@upi');
   p.activeProfileId='backup';await page.evaluate(()=>window.refreshCheckoutCommerce());
   assert.equal(await page.textContent('#paymentUpiValue'),'second@upi');assert.equal(await page.textContent('#receiverName'),'Second receiver');assert.match(await page.getAttribute('#paymentQrImage','src'),/backup-qr.png/);assert.match(await page.getAttribute('#downloadPaymentQr','href'),/backup-qr.png/);
   await page.check('input[name="paymentType"][value="full"]');assert.match(await page.textContent('#paymentDue'),/8,898/);assert.match(await page.textContent('#paymentBalance'),/₹0/);
   await page.fill('#transactionReference','UPI123456789');await page.check('#paymentSent');await page.click('#reportPaymentBtn');await page.waitForSelector('#requestReceived[open]');
   assert.equal(posts.length,1);assert.match(posts[0].special_requests,/UPI123456789/);assert.match(await page.textContent('#requestStatus'),/verification pending/i);assert.equal(await page.locator('#changeBooking').isDisabled(),true);
   await page.screenshot({path:path.join(output,`checkout-v2-received-${width}.png`)});
   // An explicitly selected trip offers the secondary request path, with payment still selected first.
   p.requestTripIds=['demo'];await open();await fill();assert.equal(await page.locator('input[value="direct"][name="bookingPaymentMode"]').isChecked(),true);
   assert.ok((await page.locator('.payment-mode-selector label').first().boundingBox()).height>=44,'Payment choices keep accessible touch targets');
   await page.check('input[value="confirmation"][name="bookingPaymentMode"]');await page.click('#submitDetailsBtn');await page.waitForSelector('#requestReceived[open]');assert.equal(posts.length,2);assert.equal(posts[1].special_requests,'');
   // Expired and manually closed dates show a final state and can recover without leaving checkout.
   await open('Oct 1-3, 2026');assert.equal(await page.locator('#submitDetailsBtn').isDisabled(),true);assert.match(await page.textContent('#paymentModeNotice'),/unavailable/);
   await fill();await page.click('#changeBooking');await page.selectOption('#changeDeparture',later);await page.click('.booking-change-dialog [type="submit"]');await page.waitForFunction(()=>!document.getElementById('submitDetailsBtn').disabled);
   assert.equal(await page.inputValue('#fullName'),'Demo Traveller');await page.click('#submitDetailsBtn');await page.waitForSelector('#paymentSection',{state:'visible'});assert.equal(posts.length,2);
   closed=['2026-10-16/2026-10-18'];await open();assert.equal(await page.locator('#submitDetailsBtn').isDisabled(),true);assert.match(await page.textContent('#paymentModeNotice'),/unavailable/);
   await page.click('#changeBooking');assert.equal(await page.locator('#changeDeparture option').count(),1);await page.click('[data-cancel]');
   await page.screenshot({path:path.join(output,`checkout-v2-unavailable-${width}.png`)});
   // Gallery dialog owns keyboard focus and restores it on Escape.
   await page.goto(origin+'/trip-detail.html?trip=demo');await page.waitForSelector('#trip-custom_why_choose_us');
   assert.equal(await page.locator('#trip-custom_why_choose_us summary').textContent(),'Why choose us');assert.match(await page.locator('#trip-custom_why_choose_us').textContent(),/Personal support throughout the journey/);assert.equal(await page.locator('#trip-custom_hidden').count(),0);
   await page.locator('#trip-custom_why_choose_us').screenshot({path:path.join(output,`custom-trip-section-${width}.png`)});
   await page.waitForSelector('.gallery-main');await page.locator('.gallery-main').focus();await page.keyboard.press('Enter');
   assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Close photo gallery');
   for(let i=0;i<7;i++){await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.getElementById('galleryLightbox').contains(document.activeElement)),true);}
   await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.getElementById('galleryLightbox').contains(document.activeElement)),true);
   await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.matches('.gallery-main')),true);assert.equal(await page.locator('nav.navbar').evaluate(n=>n.inert),false);
   assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS: custom trip sections, compact checkout, v2 payment default, selected requests, profile switching, copy/download, date edits, totals/coupons, payment reports, expired/closed recovery, contrast and gallery focus at 360/390/1440px. All payment POSTs mocked.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
