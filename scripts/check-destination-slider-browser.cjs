const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{});
 try{
 const page=await browser.newPage({viewport:{width:390,height:800}});
 await page.clock.install({time:new Date('2026-10-22T10:00:00Z')});await page.clock.pauseAt(new Date('2026-10-22T10:00:01Z'));
 await page.route('https://fixture.test/**',async route=>{
  const p=new URL(route.request().url()).pathname;
  if(p==='/')return route.fulfill({contentType:'text/html; charset=utf-8',body:`<style>.trip-rail{display:flex;gap:12px;width:350px;overflow:auto}.trip-card{flex:0 0 280px;height:180px;background:#eaf6f3}.rail-controls{display:flex;gap:8px}button{min-height:44px}</style><button id="outside">Outside</button><div id="featured-trips-grid"><a href="#" class="trip-card">Trip one</a><a href="#" class="trip-card">Trip two</a><a href="#" class="trip-card">Trip three</a></div><script>Element.prototype.scrollTo=function(options){this.scrollLeft=options.left;this.dispatchEvent(new Event('scroll'))};</script><script src="/js/trip-gallery-slideshow.js"></script><script src="/js/trip-rails.js"></script>`});
  if(p==='/js/homepage-config.json')return route.fulfill({json:{version:1,destinationSlider:{autoSlide:true,intervalSeconds:5}}});
  return route.fulfill({contentType:'text/javascript; charset=utf-8',body:await fs.readFile(path.join(__dirname,'..',p.slice(1)))});
 });
 await page.goto('https://fixture.test/');await page.getByRole('button',{name:'Pause destination slideshow'}).waitFor();
 const position=()=>page.locator('#featured-trips-grid').evaluate(el=>el.scrollLeft);
 await page.clock.fastForward(4999);assert.equal(await position(),0);
 await page.clock.fastForward(1);assert.ok(await position()>0);
 await page.getByRole('button',{name:'Pause destination slideshow'}).click();await page.mouse.move(380,750);
 const paused=await position();await page.clock.fastForward(10000);assert.equal(await position(),paused);
 await page.getByRole('button',{name:'Play destination slideshow'}).click();await page.mouse.move(380,750);
 await page.clock.fastForward(5000);assert.ok(await position()>paused);
 await page.emulateMedia({reducedMotion:'reduce'});const reduced=await position();await page.clock.fastForward(10000);assert.equal(await position(),reduced);
 assert.equal(await page.locator('.rail-playback').isVisible(),false);
 await page.close();console.log('Destination autoplay timing, Pause/Play, forward progression and reduced motion passed.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
