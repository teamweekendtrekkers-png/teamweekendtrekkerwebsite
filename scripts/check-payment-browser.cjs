// Local checkout tests only. All booking POSTs are mocked; no payments or messages are sent.
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),output=process.env.PAYMENT_REVIEW_DIR||path.join(root,'../payment-reviews');
const date='Oct 16-18, 2026',key='2026-10-16/2026-10-18';
let commerce={version:1,payment:{upiId:'demo@upi',receiverName:'Demo receiver',mode:'both',directDepartures:[{tripId:'demo',dateKey:key}],showQr:true,qrImage:'images/test-qr.png',instructions:'Check the receiver before paying.'},showCoupons:true,coupons:[]};
const server=http.createServer((req,res)=>{
  if(req.method!=='GET'){res.statusCode=405;return res.end();}
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root+path.sep)){res.statusCode=403;return res.end();}
  if(file===path.join(root,'js/commerce-config.json')){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(commerce));}
  try{
    res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'})[path.extname(file)]||'application/octet-stream');
    let body=fs.readFileSync(file);
    if(file===path.join(root,'js/trips-data.js'))body=body.toString()+`\ntripsData.demo={title:'Demo weekend trip',price:'₹4,499',location:'Karnataka',isActive:true,availableDates:[${JSON.stringify(date)}],image:'images/logo.jpg',duration:'2 days',departureTime:'22:00'};`;
    res.end(body);
  }catch{res.statusCode=404;res.end();}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined});
 fs.mkdirSync(output,{recursive:true});
 try{
  for(const width of [390,1440]){
   const page=await browser.newPage({viewport:{width,height:900}}),errors=[],posts=[];
   await page.addInitScript(()=>localStorage.setItem('twt-analytics-consent','no'));
   page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(()=>{
    const OriginalDate=Date;globalThis.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:['2026-10-14T05:00:00Z']));}static now(){return new OriginalDate('2026-10-14T05:00:00Z').getTime();}};
   });
   await page.route('**/*',async route=>{
    const request=route.request();
    if(request.method()==='POST'){
      assert.equal(request.url(),'https://vdxunrhcahgkwtzvjjdj.supabase.co/functions/v1/booking-request');
      posts.push(JSON.parse(request.postData()));
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({accepted:true,booking_reference:'TWT-LOCAL-DEMO'})});
    }
    if(!request.url().startsWith(origin))return route.abort();
    // Fulfil local assets directly so the check also works in network-isolated runners.
    const file=path.resolve(root,'.'+new URL(request.url()).pathname);
    if(!file.startsWith(root+path.sep))return route.abort();
    if(file===path.join(root,'js/commerce-config.json'))return route.fulfill({contentType:'application/json',body:JSON.stringify(commerce)});
    try{
      let body=fs.readFileSync(file);
      if(file===path.join(root,'js/trips-data.js'))body=body.toString()+`\ntripsData.demo={title:'Demo weekend trip',price:'₹4,499',location:'Karnataka',isActive:true,availableDates:[${JSON.stringify(date)}],image:'images/logo.jpg',duration:'2 days',departureTime:'22:00'};`;
      return route.fulfill({contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'})[path.extname(file)]||'application/octet-stream',body});
    }catch{return route.fulfill({status:404,body:''});}
   });
   const open=async()=>{await page.goto(origin+'/checkout.html?trip=demo&date='+encodeURIComponent(date)+'&people=1');await page.waitForFunction(()=>!document.getElementById('submitDetailsBtn').disabled);};
   const fill=async()=>{await page.fill('#fullName','Demo Traveller');await page.fill('#email','demo@example.com');await page.fill('#phone','9999999999');};
   await open();await fill();
   assert.equal(await page.locator('input[value="confirmation"][name="bookingPaymentMode"]').isChecked(),true);
   await page.click('#submitDetailsBtn');await page.waitForSelector('#requestReceived[open]');
   assert.equal(posts.length,1);assert.equal(posts[0].special_requests,'');
   assert.match(await page.locator('#requestReceived h2').textContent(),/Booking request received/);
   const details=await page.locator('#requestReceived [data-send-booking-details]').getAttribute('href');
   assert.match(decodeURIComponent(details),/Demo Traveller/);assert.match(decodeURIComponent(details),/TWT-LOCAL-DEMO/);
   assert.ok(await page.locator('#requestReceived [data-send-booking-details]').isVisible());
   await page.screenshot({path:path.join(output,`payment-request-${width}.png`)});
   await page.click('#closeRequestPopup');
   await page.waitForSelector('#qrLoadFeedback:not([hidden])'); // Missing QR has a usable fallback.
   assert.ok(await page.locator('#copyPaymentUpi').isVisible());
   // Direct payment does not save a request or report success until the customer submits a transaction ID.
   posts.length=0;await open();await fill();
   await page.check('input[value="direct"][name="bookingPaymentMode"]');await page.click('#submitDetailsBtn');
   await page.waitForSelector('#paymentSection', {state:'visible'});assert.equal(posts.length,0);
   assert.equal(await page.locator('#requestReceived').getAttribute('open'),null);
   assert.match(await page.locator('#paymentDue').textContent(),/2,249.5/);
   assert.equal(await page.locator('#paymentChecklist').isVisible(),true);
   assert.equal(await page.locator('#paymentChecklist [aria-current="step"]').getAttribute('data-payment-step'),'2');
   await page.locator('#reportPaymentBtn').click();assert.match(await page.locator('#paymentReportFeedback').textContent(),/transaction ID/);assert.equal(posts.length,0);
   await page.fill('#transactionReference','UPI123456789');await page.check('#paymentSent');
   assert.equal(await page.locator('#paymentChecklist [aria-current="step"]').getAttribute('data-payment-step'),'3');
   await page.locator('#reportPaymentBtn').click();await page.waitForSelector('#requestReceived[open]');
   assert.equal(posts.length,1);assert.match(posts[0].special_requests,/UPI123456789/);
   assert.match(await page.locator('#requestReceived h2').textContent(),/Payment details submitted/);
   assert.match(await page.locator('#requestStatus').textContent(),/verification pending/i);
   assert.equal(await page.locator('#paymentChecklist [aria-current="step"]').getAttribute('data-payment-step'),'3');
   assert.match(await page.locator('#paymentChecklist li').last().innerText(),/Details submitted/);
   assert.match(await page.locator('.payment-verification-note').innerText(),/verify your payment and availability/);
   const directDetails=decodeURIComponent(await page.locator('#requestReceived [data-send-booking-details]').getAttribute('href'));
   assert.match(directDetails,/Direct UPI payment/);assert.match(directDetails,/Transaction ID: UPI123456789/);
   await page.screenshot({path:path.join(output,`payment-direct-${width}.png`)});
   await page.click('#closeRequestPopup');assert.ok(await page.locator('#paymentScreenshotLink').isVisible());
   assert.equal(await page.locator('#reportPaymentBtn').isVisible(),false);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Checkout overflow at '+width);
   // Revoked approval falls back to confirmation on a fresh visit.
   commerce.payment.directDepartures=[];await open();
   assert.equal(await page.locator('input[value="direct"][name="bookingPaymentMode"]').isVisible(),false);
   commerce.payment.directDepartures=[{tripId:'demo',dateKey:key}];
   assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS: confirmation/direct paths, exact advance, QR fallback, manual statuses, WhatsApp details, eligibility and mobile/desktop layout. All external POSTs mocked.');
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
