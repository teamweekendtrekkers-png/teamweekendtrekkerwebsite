// Offline functional checks. Enquiry POSTs are intercepted; no messages are sent.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),origin='https://planner.test';
const trips={culture:{title:'Culture weekend',duration:'2D/1N',experience:'heritage',featured:true,price:5999,originalPrice:6499,image:'images/logo.jpg',galleryImages:['images/logo.jpg'],availableDates:['Nov 8-10, 2030','Nov 15-17, 2030','Nov 22-24, 2030','Dec 6-8, 2030'],soldOutDepartures:['2030-11-08/2030-11-10'],confirmedDepartures:['2030-11-15/2030-11-17'],closedDepartures:['2030-11-22/2030-11-24']},long:{title:'Long coastal trip',duration:'3D/2N',experience:'beach',featured:true,price:7999,image:'images/logo.jpg',availableDates:['Nov 15-18, 2030']}};
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined});
 try{
  for(const width of [320,390,1440]){
   const page=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce'});let writes=0,fail=false;const errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(()=>{const Original=Date;window.Date=class extends Original{constructor(...args){super(...(args.length?args:['2030-11-01T10:00:00Z']));}static now(){return new Original('2030-11-01T10:00:00Z').getTime();}};localStorage.setItem('twt-analytics-consent','no');});
   await page.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.href==='https://api.web3forms.com/submit'){
     assert.equal(request.method(),'POST');writes++;const data=request.postDataJSON();assert.equal(data.name,'Test Traveller');assert.equal(data.phone,'9999999999');assert.match(data.subject,/Callback request|Custom group trip/);
     return route.fulfill({status:fail?500:200,contentType:'application/json',body:JSON.stringify({success:!fail})});
    }
    if(request.method()!=='GET'||url.origin!==origin)return route.abort();
    if(url.pathname==='/js/trips-data.js')return route.fulfill({contentType:'text/javascript',body:'const tripsData='+JSON.stringify(trips)+';'});
    if(url.pathname==='/js/featured-trips.js')return route.fulfill({contentType:'text/javascript',body:'function getFeaturedTrips(){return Object.entries(tripsData).map(([id,trip])=>({...trip,id}));}'});
    let file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));if(!file.startsWith(root+path.sep))return route.abort();
    try{return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.json':'application/json','.html':'text/html','.jpg':'image/jpeg'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});}catch{return route.fulfill({status:404});}
   });
   await page.goto(origin);await page.getByText('Browse departure calendar',{exact:true}).click();
   await page.getByRole('button',{name:'8 November 2030: 1 departure',exact:true}).click();assert.equal(await page.locator('.calendar-results .departure-status').innerText(),'Sold out');assert.ok(!(await page.locator('.calendar-results a').getAttribute('href')).includes('date='));
   await page.getByRole('button',{name:'15 November 2030: 2 departures',exact:true}).click();assert.match(await page.locator('.calendar-results').innerText(),/Confirmed departure/);assert.ok((await page.locator('.calendar-results a').first().getAttribute('href')).includes('date='));
   await page.getByRole('button',{name:'Next month',exact:true}).click();assert.equal(await page.locator('.calendar-navigation h3').innerText(),'December 2030');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Homepage fits phone width');
   await page.getByRole('button',{name:'Plan a group trip',exact:true}).click();
   const dialog=page.locator('.planner-dialog');await dialog.getByLabel('Your name',{exact:true}).fill('Test Traveller');await dialog.getByLabel('Phone / WhatsApp number',{exact:true}).fill('9999999999');
   assert.equal(await dialog.getByLabel('Number of travellers',{exact:true}).inputValue(),'6');await dialog.getByRole('button',{name:'Send enquiry',exact:true}).click();await dialog.getByText(/Enquiry sent\. Our team/).waitFor();assert.equal(writes,1);assert.equal(await dialog.locator('[type=submit]').isDisabled(),true);
   await dialog.getByRole('button',{name:'Close',exact:true}).first().click();assert.equal(await page.getByRole('button',{name:'Plan a group trip',exact:true}).evaluate(node=>node===document.activeElement),true);
   await page.getByRole('button',{name:'Request a callback about Culture weekend',exact:true}).click();assert.equal(await dialog.getByLabel('Trip or destination',{exact:true}).inputValue(),'Culture weekend');assert.ok(!(await dialog.locator('a').getAttribute('href')).includes('9999999999'),'Reopening clears previous personal details from fallback');
   fail=true;await dialog.getByLabel('Your name',{exact:true}).fill('Test Traveller');await dialog.getByLabel('Phone / WhatsApp number',{exact:true}).fill('9999999999');await dialog.getByRole('button',{name:'Send enquiry',exact:true}).click();await dialog.getByText(/We could not confirm delivery/).waitFor();assert.equal(await dialog.getByLabel('Your name',{exact:true}).inputValue(),'Test Traveller');assert.equal(await dialog.locator('[type=submit]').isEnabled(),true);assert.equal(writes,2);
   await dialog.getByRole('button',{name:'Close',exact:true}).first().click();await page.getByRole('link',{name:/Longer getaways Three days or more/}).click();await page.waitForURL('**/trips.html?collection=long');await page.locator('.catalogue-selected-filters').getByRole('button',{name:/Three days or more/}).waitFor();assert.equal(await page.locator('#tripsDynamicGrid .trip-card').count(),1);
   assert.deepEqual(errors,[]);await page.close();
  }
  console.log('Travel planner passed: mobile/desktop, real statuses and departure links, collections, enquiries, failure recovery, no repeated writes.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
