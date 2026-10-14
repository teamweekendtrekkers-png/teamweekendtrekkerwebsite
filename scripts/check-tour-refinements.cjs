'use strict';
// Local browser checks. Every external write is blocked; no booking is submitted.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),cp=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),sharp=require('sharp');
const {readTripsData,renderTripPage,readSiteOrigin}=require('./generate-trip-pages');
const root=path.resolve(__dirname,'..'),trips=readTripsData(root);
const id=Object.keys(trips).find(id=>/sakleshpur/i.test(trips[id].title))||Object.keys(trips)[0];
const trip=trips[id],template=fs.readFileSync(path.join(root,'trip-detail.html'),'utf8');
const baseline=cp.execFileSync('git',['show','c2b88bb825b5e5e03e5005f059475f1068579fce:trip-detail.html'],{cwd:root,encoding:'utf8'});
const output=process.env.TOUR_REVIEW_DIR||path.join(root,'../tour-reviews');
const first=trip.cardImage||trip.galleryImages?.[0]||trip.image;
const second=(trip.galleryImages||[]).find(p=>p!==first)||trip.image;
const manifest={},assets=new Map();
async function prepareImages(){
 for(const [i,original] of [first,second].entries()){
  const entry={webp:[],avif:[]};
  for(const format of ['webp','avif'])for(const width of [320,640,960,1600]){
   const relative=`images/tour-test-${i}-${width}.${format}`;
   const file=path.join(root,original);const pipeline=sharp(file).rotate().resize({width,withoutEnlargement:true});
   const bytes=await (format==='webp'?pipeline.webp({quality:78}):pipeline.avif({quality:48,effort:1})).toBuffer();
   assets.set('/'+relative,{bytes,type:'image/'+format});entry[format].push({width,path:relative});
  }
  manifest[original]=entry;
 }
}
const server=http.createServer((req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.statusCode=405;return res.end();}
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(assets.has(pathname)){const a=assets.get(pathname);res.setHeader('Content-Type',a.type);return res.end(a.bytes);}
 if(pathname==='/js/image-manifest.js'){res.setHeader('Content-Type','text/javascript');return res.end('window.IMAGE_MANIFEST = '+JSON.stringify(manifest)+';');}
 if(pathname==='/tour.html'||pathname==='/baseline.html'){
  res.setHeader('Content-Type','text/html');
  return res.end(renderTripPage({template:pathname==='/baseline.html'?baseline:template,tripId:id,trip,projectRoot:root,siteOrigin:readSiteOrigin(root)}));
 }
 const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)){res.statusCode=403;return res.end();}
 try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.json':'application/json'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}
 catch{res.statusCode=404;res.end();}
});
(async()=>{
 await prepareImages();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));fs.mkdirSync(output,{recursive:true});
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined});
 const results=[];
 try{
  for(const width of [320,390,768,1280]){
   const page=await browser.newPage({viewport:{width,height:900},hasTouch:width<768,isMobile:width<768}),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.route('**/*',request=>(request.request().url().startsWith(origin)||request.request().url().startsWith('https://cdnjs.cloudflare.com/'))&&['GET','HEAD'].includes(request.request().method())?request.continue():request.abort());
   await page.addInitScript(()=>{const D=Date;window.Date=class extends D{constructor(...args){super(...(args.length?args:['2026-10-14T06:00:00Z']));}static now(){return new D('2026-10-14T06:00:00Z').getTime();}};});
   await page.goto(origin+'/baseline.html',{waitUntil:'load'});await page.locator('.gallery-counter').waitFor();
   const before=await page.locator('.gallery-main').evaluate(node=>node.getBoundingClientRect().top);
   await page.goto(origin+'/tour.html',{waitUntil:'load'});await page.waitForFunction(()=>document.body.classList.contains('tour-refined'));
   await page.waitForFunction(()=>document.getElementById('galleryMainImg').complete&&document.getElementById('galleryMainImg').naturalWidth>0);
   const state=await page.evaluate(()=>{
    const main=document.querySelector('.gallery-main'),nav=document.getElementById('tripSectionLinks'),img=document.getElementById('galleryMainImg'),bar=document.getElementById('mobileBookBtn');
    return {photoTop:main.getBoundingClientRect().top,ratio:getComputedStyle(main).aspectRatio,currentSrc:img.currentSrc,priority:img.fetchPriority,
      sideGallery:document.querySelector('.gallery-side')?getComputedStyle(document.querySelector('.gallery-side')).display:'none',navWrap:getComputedStyle(nav).flexWrap,
      bottomSpace:parseFloat(getComputedStyle(document.body).paddingBottom),barHeight:bar.getBoundingClientRect().height,
      overflow:document.documentElement.scrollWidth>innerWidth,headingHeight:document.querySelector('.trip-section>summary').getBoundingClientRect().height};
   });
   assert.equal(state.ratio,'4 / 3');assert.equal(state.sideGallery,'none');assert.equal(state.navWrap,'nowrap');assert.equal(state.overflow,false);
   assert.ok(state.currentSrc.endsWith('.avif'));assert.equal(state.priority,'high');
   if(width<768){
    assert.ok(state.photoTop<before-70,'Mobile photo should appear substantially earlier');
    assert.ok(state.bottomSpace>=state.barHeight,'Booking bar must have reserved space');
    assert.equal(await page.locator('.trip-dates-shortcut').isVisible(),false);
    assert.equal(await page.locator('.trip-essentials').isVisible(),false);
    assert.equal(await page.locator('.trip-back-link').isVisible(),true);
   }
   const arrows=page.locator('.gallery-arrow');assert.equal(await arrows.count(),2);
   for(const arrow of await arrows.all()){assert.ok(await arrow.isVisible());const box=await arrow.boundingBox();assert.ok(box.width>=44&&box.height>=44);}
   await page.getByRole('button',{name:'Next photo',exact:true}).click();
   assert.match(await page.locator('.gallery-counter').textContent(),/^2 \/ /);
   assert.equal(await page.locator('#galleryLightbox').isVisible(),false,'Arrow must browse without opening the lightbox');
   await page.getByRole('button',{name:'Previous photo',exact:true}).focus();await page.keyboard.press('Enter');
   assert.match(await page.locator('.gallery-counter').textContent(),/^1 \/ /);
   if(width<768){
    await page.locator('.gallery-main').evaluate(node=>{
     node.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[new Touch({identifier:0,target:node,clientX:220,clientY:400})]}));
     node.dispatchEvent(new TouchEvent('touchend',{bubbles:true,changedTouches:[new Touch({identifier:0,target:node,clientX:120,clientY:400})]}));
    });
    assert.match(await page.locator('.gallery-counter').textContent(),/^2 \/ /);
    await page.locator('#galleryMainImg').dispatchEvent('click');
    assert.equal(await page.locator('#galleryLightbox').isVisible(),false,'Swipe must not open the lightbox');
    await page.getByRole('button',{name:'Previous photo',exact:true}).click();
   }
   const glance=await page.locator('.glance-grid').evaluate(node=>({columns:getComputedStyle(node).gridTemplateColumns.split(' ').length,cards:[...node.children].filter(n=>!n.hidden).map(n=>({height:n.getBoundingClientRect().height,overflow:n.scrollWidth>n.clientWidth}))}));
   assert.equal(glance.columns,width<768?2:3);assert.ok(glance.cards.every(card=>!card.overflow&&card.height<110),'Compact glance cards must fit their content');
   await page.locator('.gallery-main').focus();await page.keyboard.press('ArrowRight');
   assert.match(await page.locator('.gallery-counter').textContent(),/^2 \/ /);
   await page.locator('#galleryMainImg').click();assert.match(await page.locator('#imageCounter').textContent(),/^2 \/ /);
   await page.keyboard.press('Escape');
   await page.locator('.gallery-main').focus();await page.keyboard.press('ArrowRight');
   assert.equal(await page.locator('#galleryMainImg').evaluate(node=>!!node.parentElement.querySelector('source[data-responsive-avif]')),false,'Unoptimised photo must clear the previous AVIF candidates');
   await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowLeft');
   await page.waitForFunction(()=>document.getElementById('galleryMainImg').complete&&document.getElementById('galleryMainImg').naturalWidth>0);
   await page.screenshot({path:path.join(output,`tour-header-${width}.png`)});
   await page.locator('#tripSectionLinks a[href*="#tripItinerary"]').click();
   await page.waitForFunction(()=>document.getElementById('tripItinerary').getBoundingClientRect().top<200);
   await page.waitForFunction(()=>document.querySelector('#tripSectionLinks a[aria-current]')?.href.includes('#tripItinerary'));
   assert.ok(await page.locator('#tripSectionLinks').isVisible());
   await page.screenshot({path:path.join(output,`tour-itinerary-${width}.png`)});
   // Manual scrolling updates the active section, including a closed inclusions panel.
   await page.locator('#tripIncludes').evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));
   await page.waitForFunction(()=>document.querySelector('#tripSectionLinks a[aria-current]')?.href.includes('#tripIncludes'));
   await page.waitForFunction(()=>getComputedStyle(document.querySelector('#tripSectionLinks a[aria-current]')).backgroundColor==='rgb(8, 127, 115)');
   await page.emulateMedia({reducedMotion:'reduce'});
   assert.equal(await page.locator('#galleryMainImg').evaluate(node=>getComputedStyle(node).transitionDuration),'0s');
   if(width<768){
    await page.locator('#mobileBookBtn a').first().click();await page.locator('.booking-dialog[open]').waitFor();
    assert.ok(await page.locator('#dateSelect').isVisible());await page.locator('.booking-dialog-close').click();
   }
   assert.deepEqual(errors,[]);results.push({width,oldPhotoTop:Math.round(before),newPhotoTop:Math.round(state.photoTop),reservedBottom:state.bottomSpace,barHeight:state.barHeight});
   await page.close();
  }
  console.log(JSON.stringify({pass:true,results,checks:'AVIF/WebP originals preserved, mobile/desktop gallery, correct enlargement, sticky active navigation, compact header, heading colours, reduced motion and booking dialog. No external writes.'},null,2));
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
