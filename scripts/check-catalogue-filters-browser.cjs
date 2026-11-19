// Offline catalogue regression: every request is fulfilled from local source or fixtures.
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {assertReadable}=require('./color-contrast.cjs');
const root=path.resolve(__dirname,'..'),origin='https://catalogue.test';
const output=process.env.SEARCH_REVIEW_DIR||path.join(root,'build','search-review');
const fixtures={
 coorg:{title:'Misty Coorg Trek',location:'Coorg',experiences:['trek','adventure'],isBestseller:true,badge:'Trek',departureCity:'Bengaluru',image:'images/test.jpg',price:'₹4,499',originalPrice:5499,availableDates:['Oct 23-25, 2099','Oct 30-Nov 1, 2099']},
 coast:{title:'Coast and town',location:'Gokarna',experience:'beach',badge:'Road Trip',departureCity:'Bengaluru',image:'images/test.jpg',price:'₹4,999',availableDates:['Oct 30-Nov 1, 2099']},
 heritage:{title:'Kannur heritage weekend',location:'Kannur',experience:'heritage',badge:'Trip',departureCity:'Bengaluru',image:'images/test.jpg',price:'₹5,999',availableDates:['Oct 23-25, 2099']},
 closed:{title:'Closed dates',location:'Wayanad',experience:'trek',image:'images/test.jpg',availableDates:['Oct 23-25, 2099'],closedDepartures:['2099-10-23/2099-10-25']},
 undated:{title:'Hampi walk',location:'Hampi',experience:'heritage',badge:'Trip',image:'images/test.jpg',availableDates:[]},
 inactive:{title:'Next season',location:'Munnar',experience:'getaway',badge:'Trip',image:'images/test.jpg',isActive:false,availableDates:['Oct 23-25, 2099']}
};
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined});
 fs.mkdirSync(output,{recursive:true});
 try {
  for(const width of [360,390,768,1440]){
   const page=await browser.newPage({viewport:{width,height:1000}}),errors=[],writes=[];
   await page.addInitScript(()=>localStorage.setItem('twt-analytics-consent','no'));
   let discovery={enabled:true,showSearch:true,showExperienceFilter:true,showWeekendFilter:true};
   let releaseConfig;const configReady=new Promise(resolve=>releaseConfig=resolve);
   page.on('pageerror',error=>errors.push(error.message));
   await page.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(req.method()!=='GET'){writes.push(req.method()+' '+req.url());return route.abort();}
    if(url.origin!==origin)return route.abort();
    if(url.pathname==='/js/trips-data.js')return route.fulfill({contentType:'text/javascript',body:'const tripsData = '+JSON.stringify(fixtures)+';'});
    if(url.pathname==='/js/homepage-config.json'){await configReady;return route.fulfill({contentType:'application/json',body:JSON.stringify({version:1,discovery})});}
    if(url.pathname.startsWith('/images/'))return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')});
    const file=path.resolve(root,'.'+url.pathname);
    if(!file.startsWith(root+path.sep))return route.abort();
    try{return route.fulfill({contentType:({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});}
    catch{return route.fulfill({status:404,body:''});}
   });
   const ids=()=>page.locator('#tripsDynamicGrid .trip-card').evaluateAll(nodes=>nodes.map(node=>node.dataset.tripId));
   await page.goto(origin+'/trips.html',{waitUntil:'domcontentloaded'});
   assert.equal(await page.getByLabel('Sort trips',{exact:true}).isDisabled(),true,'Sorting waits for catalogue settings');
   releaseConfig();
   await page.waitForFunction(()=>document.querySelectorAll('#tripsDynamicGrid .trip-card').length===3);
   await page.getByLabel('Sort trips',{exact:true}).selectOption('price-desc');
   assert.deepEqual(await ids(),['heritage','coast','coorg']);assert.match(page.url(),/sort=price-desc/);
   await page.reload();await page.waitForFunction(()=>document.querySelector('#catalogueSort').value==='price-desc');
   assert.deepEqual(await ids(),['heritage','coast','coorg']);
   await page.getByLabel('Sort trips',{exact:true}).selectOption('title');assert.deepEqual(await ids(),['coast','heritage','coorg']);
   await page.getByLabel('Sort trips',{exact:true}).selectOption('next');
   for(const badge of await page.locator('.trip-card-types .trip-badge,.trip-bestseller-badge').all())await assertReadable(badge);
   await assertReadable(page.locator('.trip-footer .btn').first());
   await assertReadable(page.locator('.page-header h1'));
   assert.equal(await page.locator('.page-header h1').evaluate(el =>
     el.getBoundingClientRect().top >= document.querySelector('.navbar').getBoundingClientRect().bottom),true,'Banner clears fixed navigation');
   assert.equal(await page.locator('#show-coming-soon').isVisible(),false,'Unscheduled trips stay in advanced filters');
   assert.equal(await page.locator('[data-filter="roadtrip"]').isVisible(),width>=768,'Mobile trip types live inside Filters');
   if(width<768){
    assert.equal(await page.locator('.whatsapp-float').isVisible(),false);
    assert.ok(await page.locator('.trip-card-help').first().isVisible());
   }
   await page.locator('.catalogue-filter-toggle').click();
   await page.locator('#show-coming-soon').check();
   assert.match(await page.locator('.catalogue-filter-toggle').innerText(),/Filters \(1\)/);
   assert.match(await page.locator('[data-trip-id="closed"]').innerText(),/Booking closed for current dates/i);
   assert.match(await page.locator('[data-trip-id="undated"]').innerText(),/New dates coming soon/i);
   await page.locator('#show-coming-soon').uncheck();
   await page.locator('.catalogue-filter-toggle').click();
   if(width>=768)await assertReadable(page.locator('.nav-menu .btn-nav'));
   assert.equal(await page.locator('[data-trip-id="coorg"] del').innerText(),'₹5,499');
   assert.equal(await page.locator('[data-trip-id="coorg"] .trip-price').innerText(),'₹4,499');
   assert.equal(await page.locator('[data-trip-id="coast"] del').count(),0);
   const trekColor=await page.locator('[data-experience="trek"]').evaluate(el=>getComputedStyle(el).backgroundColor);
   const adventureColor=await page.locator('[data-experience="adventure"]').evaluate(el=>getComputedStyle(el).backgroundColor);
   assert.notEqual(trekColor,adventureColor,'Category labels retain distinct tints');
   const search=page.getByRole('searchbox',{name:'Find your trip',exact:true});
   const toggle=page.locator('.catalogue-filter-toggle'),reset=page.locator('#trip-discovery-controls .discovery-reset');
   assert.equal(await reset.isDisabled(),true);
   await search.fill(' Coorg   Bengaluru ');
   assert.deepEqual(await ids(),['coorg']);
   assert.equal(await page.locator('.trip-bestseller-badge').innerText(),'Bestseller');
   assert.deepEqual(await page.locator('.trip-card-types .trip-badge').allTextContents(),['Treks','Adventure']);
   await toggle.focus();await page.keyboard.press('Enter');
   assert.equal(await toggle.getAttribute('aria-expanded'),'true');
   const experience=page.getByLabel('Choose your experience',{exact:true}),departure=page.getByLabel('Choose your departure',{exact:true});
   await experience.selectOption('adventure');assert.deepEqual(await ids(),['coorg']);
   await experience.selectOption('trek');await departure.selectOption('2099-10-23/2099-10-25');
   assert.deepEqual(await ids(),['coorg']);assert.match(await toggle.innerText(),/Filters \(2\)/);
   assert.equal(await page.locator('.catalogue-filter-chip').count(),3);
   await page.getByRole('button',{name:'Remove filter: Treks',exact:true}).click();
   assert.equal(await experience.inputValue(),'all');
   assert.equal(await departure.inputValue(),'2099-10-23/2099-10-25');
   assert.equal(await search.inputValue(),' Coorg   Bengaluru ');
   assert.equal(new URL(page.url()).searchParams.has('experience'),false);
   assert.deepEqual(await ids(),['coorg']);
   await experience.selectOption('trek');
   const href=await page.locator('[data-trip-id="coorg"] .trip-footer a').getAttribute('href');
   assert.equal(new URL(href,origin).searchParams.get('date'),'Oct 23-25, 2099');
   const layout=await page.locator('#trip-discovery-controls').evaluate(el=>{
    const p=el.querySelector('.catalogue-filter-panel').getBoundingClientRect(),s=el.querySelector('.discovery-search').getBoundingClientRect(),a=el.querySelector('.catalogue-search-actions').getBoundingClientRect();
    return {panelWidth:p.width,searchWidth:s.width,panelTop:p.top,toolbarBottom:Math.max(s.bottom,a.bottom),left:p.left,searchLeft:s.left,overflow:document.documentElement.scrollWidth>innerWidth};
   });
   assert.equal(layout.overflow,false,'No horizontal overflow at '+width);
   assert.ok(layout.panelTop>=layout.toolbarBottom,'Filters must open below the search row');
   assert.ok(Math.abs(layout.left-layout.searchLeft)<2,'Filter panel aligns with search');
   assert.ok(layout.panelWidth>=layout.searchWidth,'Filter panel spans the search width');
   await page.locator('#trip-discovery-controls').screenshot({path:path.join(output,'filters-open-'+width+'.png')});
   await page.getByRole('button',{name:'Show 1 trip',exact:true}).click();
   assert.equal(await toggle.getAttribute('aria-expanded'),'false');
   assert.equal(await page.locator('#trip-results-status').evaluate(el=>el===document.activeElement),true);
   assert.equal(await page.locator('.catalogue-filter-chip').count(),3);
   await toggle.click();
   await departure.focus();await page.keyboard.press('Escape');
   assert.equal(await toggle.getAttribute('aria-expanded'),'false');
   assert.equal(await toggle.evaluate(el=>el===document.activeElement),true);
   assert.match(await toggle.innerText(),/Filters \(2\)/);
   if(width<768){
    assert.equal(await reset.evaluate(node=>node.parentElement.classList.contains('catalogue-filter-panel')),true);
    assert.ok(await search.evaluate(node=>node.getBoundingClientRect().width>=120));
   }
   assert.equal(await reset.isVisible(),width>=768);
   const savedFilters=page.url();
   await page.goto(origin+'/trips.html?q=Coast');
   await page.goBack();await page.waitForFunction(()=>document.querySelectorAll('#tripsDynamicGrid .trip-card').length===1);
   assert.equal(page.url(),savedFilters);
   assert.equal(await search.inputValue(),' Coorg   Bengaluru ');
   await toggle.click();
   assert.equal(await experience.inputValue(),'trek');assert.equal(await departure.inputValue(),'2099-10-23/2099-10-25');
   await page.reload();await page.waitForFunction(()=>document.querySelectorAll('#tripsDynamicGrid .trip-card').length===1);
   assert.deepEqual(await ids(),['coorg']);assert.equal(await experience.inputValue(),'trek');
   if(!(await reset.isVisible()))await toggle.click();await reset.click();
   assert.equal(new URL(page.url()).searchParams.has('q'),false);
   assert.equal(await search.inputValue(),'');assert.equal(await experience.inputValue(),'all');assert.equal(await departure.inputValue(),'');
   assert.equal(await reset.isDisabled(),true);assert.equal((await ids()).length,3);
   if(width<768){assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert.equal(await toggle.evaluate(node=>node===document.activeElement),true);}
   await toggle.click();await experience.selectOption('beach');await search.fill('Coorg');
   assert.equal(await page.locator('.discovery-empty').count(),1);
   await page.locator('[data-reset-results]').click();
   assert.equal((await ids()).length,3);assert.equal(await experience.inputValue(),'all');assert.equal(await search.inputValue(),'');
   if(!(await page.locator('[data-filter="roadtrip"]').isVisible()))await toggle.click();
   await page.locator('[data-filter="roadtrip"]').click();await page.locator('#show-coming-soon').check();
   assert.match(await toggle.innerText(),/Filters \(2\)/);
   assert.equal(await reset.isEnabled(),true);if(!(await reset.isVisible()))await toggle.click();await reset.click();
   assert.equal(await page.locator('#show-coming-soon').isChecked(),false);
   assert.equal(await page.locator('[data-filter="all"]').getAttribute('aria-pressed'),'true');
   await search.fill('Coast');await search.fill('');assert.equal((await ids()).length,3);
   await page.emulateMedia({reducedMotion:'reduce'});
   assert.equal(await page.locator('.discovery-card').first().evaluate(el=>getComputedStyle(el).animationName),'none');
   await page.emulateMedia({reducedMotion:'no-preference'});
   await page.goto(origin+'/trips.html?q=Coorg%20Bengaluru');
   await page.waitForFunction(()=>document.querySelectorAll('#tripsDynamicGrid .trip-card').length===1);
   assert.deepEqual(await ids(),['coorg']);
   discovery={enabled:true,showSearch:true,showExperienceFilter:false,showWeekendFilter:false};
   await page.goto(origin+'/trips.html');await page.waitForSelector('#trip-discovery-controls input');
   assert.equal(await page.locator('.catalogue-filter-toggle').count(),0);
   await page.getByRole('searchbox',{name:'Find your trip',exact:true}).fill('Gokarna');assert.deepEqual(await ids(),['coast']);
   discovery={enabled:true,showSearch:false,showExperienceFilter:true,showWeekendFilter:true};
   await page.goto(origin+'/trips.html');await page.waitForSelector('.catalogue-filter-toggle');
   assert.equal(await page.locator('#trip-discovery-controls input[type="search"]').count(),0);
   await page.locator('.catalogue-filter-toggle').click();await page.getByLabel('Choose your experience',{exact:true}).selectOption('beach');
   assert.deepEqual(await ids(),['coast']);
   discovery={enabled:false,showSearch:true,showExperienceFilter:true,showWeekendFilter:true};
   await page.goto(origin+'/trips.html');await page.waitForFunction(()=>document.querySelectorAll('#tripsDynamicGrid .trip-card').length===3);
   assert.equal(await page.locator('#trip-discovery-controls').isVisible(),false);
   discovery={enabled:true,showSearch:true,showExperienceFilter:true,showWeekendFilter:true};
   await page.goto(origin+'/index.html');await page.waitForSelector('.weekend-finder');
   const explore=page.locator('#featured-trips-grid .trip-card');
   assert.deepEqual(await explore.evaluateAll(nodes=>nodes.map(node=>node.dataset.tripId)),Object.keys(fixtures));
   await page.locator('#exploreSort').selectOption('price-desc');
   assert.deepEqual(await explore.evaluateAll(nodes=>nodes.slice(0,3).map(node=>node.dataset.tripId)),['heritage','coast','coorg']);
   const finder=page.locator('.weekend-finder');
   const preferences=finder.locator('.finder-preferences');
   if(!(await preferences.evaluate(node=>node.open)))await preferences.locator('summary').click();
   assert.match(await finder.locator('.finder-results').innerText(),/Show 4 departures/);
   assert.equal(await page.locator('.traveller-collage img').count(),3);
   await finder.getByRole('button',{name:'Treks',exact:true}).click();
   assert.match(await finder.locator('.finder-results').innerText(),/Show 2 departures/);
   const heroSearch=page.getByRole('searchbox',{name:'Search destinations or trips',exact:true});
   await heroSearch.fill('Gokarna');assert.match(await page.locator('#heroSearchResults').innerText(),/No matching trips/);
   await heroSearch.fill('Coorg');assert.equal(await page.locator('#heroSearchResults .hero-search-result').count(),1);
   assert.equal(new URL(await page.locator('#heroSearchResults a').last().getAttribute('href'),origin).searchParams.get('experience'),'trek');
   await heroSearch.fill('');
   await finder.getByRole('button',{name:'Next weekend',exact:true}).click();
   assert.equal(new URL(await finder.locator('.finder-results').getAttribute('href'),origin).searchParams.get('when'),'next-weekend');
   await finder.getByRole('button',{name:'Any date',exact:true}).click();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.equal(await page.locator('#featured-trips-grid').evaluate(node=>Boolean(node.closest('section').compareDocumentPosition(document.querySelector('.testimonials'))&Node.DOCUMENT_POSITION_FOLLOWING)),true);
   await assertReadable(finder.locator('.finder-results'));
   await finder.locator('.finder-results').click();await page.waitForSelector('[data-trip-id="coorg"]');
   assert.deepEqual(await ids(),['coorg']);
   assert.equal(await page.locator('[data-remove-filter="experience"]').count(),1);
   assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);
   await page.close();
   console.log('PASS: catalogue search, filters, keyboard, reset, settings and layout at '+width+'px');
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
