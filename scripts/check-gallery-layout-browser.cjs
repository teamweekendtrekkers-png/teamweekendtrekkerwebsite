const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="#d2e6dc"/></svg>';
async function main(){
 const browser=await chromium.launch(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{});
 try{
  async function gallery(config={},options={}){
   const page=await browser.newPage({viewport:{width:900,height:700},reducedMotion:options.reduced?'reduce':'no-preference'});
   await page.clock.install({time:new Date('2026-10-22T10:00:00Z')});
   await page.clock.pauseAt(new Date('2026-10-22T10:00:01Z'));
   await page.route('https://fixture.test/**',async route=>{
    const p=new URL(route.request().url()).pathname;
    if(p==='/js/homepage-config.json')return route.fulfill({status:options.failure?503:200,json:{version:1,tripGallery:config}});
    if(p==='/')return route.fulfill({contentType:'text/html; charset=utf-8',body:`<body tabindex="-1"><button id="outside">Outside</button><div class="gallery-main" style="position:relative;margin:40px 20px;width:500px;height:300px"><img id="galleryMainImg"></div><div id="galleryLightbox"><button id="close">Close photo</button></div><style>#galleryLightbox{display:none}#galleryLightbox.active{display:block;position:fixed;inset:0;background:white}.gallery-playback{position:absolute;bottom:0;left:0}</style><script>allGalleryImages=['/b.jpg','/a.jpg','/c.jpg'];openLightbox=()=>{document.querySelector('#galleryLightbox').classList.add('active');document.querySelector('#close').focus()};document.querySelector('#close').onclick=()=>{document.querySelector('#galleryLightbox').classList.remove('active');document.querySelector('#outside').focus()};</script><script src="/js/trip-gallery-slideshow.js"></script><script src="/js/mobile-experience.js"></script><script>MobileExperience.trip({title:'Gallery',image:'/cover.jpg'});</script>`});
    if(p.endsWith('.jpg'))return route.fulfill({contentType:'image/svg+xml',body:svg});
    try{return route.fulfill({contentType:'text/javascript; charset=utf-8',body:await fs.readFile(path.join(root,p.slice(1)))});}catch{return route.fulfill({status:404,body:''});}
   });
   await page.goto('https://fixture.test/');await page.waitForFunction(()=>document.querySelector('.gallery-counter'));
   await page.evaluate(()=>Promise.resolve());return page;
  }
  const p=await gallery({autoSlide:true,intervalSeconds:7});
  const counter=()=>p.locator('.gallery-counter').innerText();
  await p.getByRole('button',{name:'Pause photo slideshow'}).waitFor();
  assert.match(await p.locator('#galleryMainImg').getAttribute('src'),/b.jpg$/);
  await p.clock.fastForward(6999);assert.match(await counter(),/^1 \/ 3/);
  await p.clock.fastForward(1);assert.match(await counter(),/^2 \/ 3/);
  await p.locator('.gallery-main').hover();await p.clock.fastForward(14000);assert.match(await counter(),/^2 \/ 3/);
  await p.mouse.move(5,5);await p.clock.fastForward(7000);assert.match(await counter(),/^3 \/ 3/);
  await p.getByRole('button',{name:'Previous photo'}).click();assert.match(await counter(),/^2 \/ 3/);
  await p.mouse.move(5,5);await p.getByRole('button',{name:'Outside',exact:true}).focus();
  await p.clock.fastForward(6999);assert.match(await counter(),/^2 \/ 3/);
  await p.clock.fastForward(1);assert.match(await counter(),/^3 \/ 3/);
  await p.getByRole('button',{name:'Pause photo slideshow'}).click();await p.mouse.move(5,5);
  await p.clock.fastForward(14000);assert.match(await counter(),/^3 \/ 3/);
  await p.getByRole('button',{name:'Play photo slideshow'}).click();await p.mouse.move(5,5);
  await p.clock.fastForward(7000);assert.match(await counter(),/^1 \/ 3/);
  await p.locator('.gallery-main').focus();await p.clock.fastForward(14000);assert.match(await counter(),/^1 \/ 3/);
  await p.locator('.gallery-counter').click();await p.clock.fastForward(14000);assert.match(await counter(),/^1 \/ 3/);
  await p.getByRole('button',{name:'Close photo'}).click();await p.mouse.move(5,5);
  await p.clock.fastForward(7000);assert.match(await counter(),/^2 \/ 3/);
  await p.evaluate(()=>{window.allGalleryImages=['/single.jpg'];MobileExperience.trip({title:'One',image:'/cover.jpg'});});
  await p.clock.fastForward(14000);assert.match(await counter(),/^1 \/ 1/);assert.equal(await p.locator('.gallery-playback').count(),0);
  await p.close();
  for(const options of [{config:{autoSlide:false,intervalSeconds:3}},{config:{},reduced:true},{config:{},failure:true}]){
   const page=await gallery(options.config,options);
   await page.clock.fastForward(60000);assert.match(await page.locator('.gallery-counter').innerText(),/^1 \/ 3/);
   assert.equal(await page.locator('.gallery-playback:visible').count(),0);
   await page.getByRole('button',{name:'Next photo'}).click();assert.match(await page.locator('.gallery-counter').innerText(),/^2 \/ 3/);
   await page.close();
  }
  const page=await browser.newPage();
  const html=(await fs.readFile(path.join(root,'index.html'),'utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());if(u.hostname!=='fixture.test')return route.abort();
   if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:html});
   if(!u.pathname.endsWith('.css'))return route.fulfill({contentType:'image/svg+xml',body:svg});
   return route.fulfill({contentType:'text/css',body:await fs.readFile(path.join(root,u.pathname.slice(1)))});
  });
  await page.goto('https://fixture.test/');
  await page.evaluate(()=>{
   document.querySelector('#hero-trust').hidden=false;document.querySelector('#hero-trust-rating').textContent='⭐ 4.9 on Google';
   document.querySelector('#upcoming-batches-grid').classList.add('trip-rail');
   document.querySelector('#upcoming-batches-grid').innerHTML=['Theyyam Experience – Kannur & Thalassery','Srisailam, Yaganti & Belum Caves: Road Trip','Theyyam Experience'].map(t=>'<a href="#" class="departure-bar"><span class="departure-date">Oct 23–25</span><span class="departure-name">'+t+'</span><span class="departure-arrow">➜</span></a>').join('');
   document.querySelector('#featured-trips-grid').classList.add('trip-rail');
   document.querySelector('#featured-trips-grid').innerHTML=['Theyyam Experience','Srisailam, Yaganti & Belum Caves','Rameshwaram–Dhanushkodi'].map(t=>'<article class="trip-card"><div style="aspect-ratio:16/9;background:#d2e6dc"></div><div class="trip-content"><h3>'+t+'</h3><p>2D/1N · Easy</p><div class="trip-footer"><span class="trip-price">₹5,999</span><a href="#" class="btn btn-primary">View trip</a></div></div></article>').join('');
  });
  const reviews=path.join(root,'build','layout-review');await fs.mkdir(reviews,{recursive:true});
  for(const width of [320,390,768,1440,3840]){
   await page.setViewportSize({width,height:width>2000?2160:900});
   const metrics=await page.evaluate(()=>{
    const hero=document.querySelector('.hero'),dest=document.querySelector('.trips-section'),sheet=document.querySelector('link[href*="homepage-layout"]');
    const after={hero:hero.offsetHeight,destinations:dest.offsetTop};sheet.sheet.disabled=true;
    const before={hero:hero.offsetHeight,destinations:dest.offsetTop};sheet.sheet.disabled=false;
    return {before,after,overflow:document.documentElement.scrollWidth>innerWidth,
      targets:[...document.querySelectorAll('.hero .btn,.hero-help,.upcoming-batches-action .btn')].filter(x=>x.getClientRects().length).map(x=>x.getBoundingClientRect().height),
      font:parseFloat(getComputedStyle(document.querySelector('.hero-search input')).fontSize)};
   });
   assert.equal(metrics.overflow,false,'horizontal overflow at '+width);
   assert.ok(metrics.after.destinations<metrics.before.destinations,'discovery must appear sooner at '+width);
   assert.ok(metrics.after.hero<600,'banner must not grow with tall or wide screens at '+width);
   assert.ok(metrics.targets.every(h=>h>=44),'preserve touch targets at '+width);
   assert.ok(metrics.font>=16,'preserve search readability at '+width);
   await page.screenshot({path:path.join(reviews,'homepage-'+width+'.png')});
   console.log(width,JSON.stringify(metrics));
  }
  await page.close();console.log('Slideshow interactions and compact homepage checks passed.');
 }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
