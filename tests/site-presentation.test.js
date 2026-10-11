const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const presentation=require('../js/site-presentation');
test('appearance accepts only approved palettes, safe photos and bounded motion',()=>{
 const valid={preset:'ocean',heroMobileImage:'images/mobile.jpg',heroFocalPoint:'top',heroMotion:true,heroSlides:['images/2.jpg','https://example.com/3.webp']};
 assert.deepEqual(presentation.normalize(valid),valid);
 for(const preset of ['__proto__','constructor','evil'])assert.equal(presentation.normalize({preset}).preset,'forest');
 for(const image of ['javascript:alert(1)','images/../secret','https://user:pass@example.com/a','https://[/bad','images/a.jpg")'])assert.equal(presentation.normalize({heroMobileImage:image,heroSlides:[image]}).heroMobileImage,'');
 assert.equal(presentation.normalize({heroSlides:['images/1.jpg','images/2.jpg','images/3.jpg']}).heroSlides.length,2);
});
test('hero keeps text still, stops after one pass and honors reduced motion',()=>{
 const timers=[],layers=[],listeners=new Map(),style={setProperty(){}};
 const hero={style:{},prepend(layer){layers.push(layer);}};
 const document={documentElement:{style},hidden:false,querySelector:()=>hero,createElement:()=>({style:{},setAttribute(){},remove(){}})};
 const media={matches:false,addEventListener(name,handler){listeners.set(handler,name);},removeEventListener(name,handler){listeners.delete(handler);}};
 const window={matchMedia:()=>media,setTimeout(fn,ms){timers.push({fn,ms});return timers.length;},clearTimeout(){},ResponsiveImages:{source:path=>path}};
 const config={hero:{backgroundImage:'images/1.jpg'},presentation:{heroSlides:['images/2.jpg','images/3.jpg'],heroMotion:true}};
 presentation.apply(config,document,window);
 assert.deepEqual(timers.map(timer=>timer.ms),[8000,16000]);
 timers.forEach(timer=>timer.fn());assert.equal(timers.length,2);assert.equal(layers.length,2);
 media.matches=true;timers.length=0;
 presentation.apply(config,document,window);assert.equal(timers.length,0);
});
test('responsive fallback clears stale candidates before switching images',()=>{
 const context={window:{IMAGE_MANIFEST:{'images/photo.jpg':{webp:[{width:320,path:'images/320.webp'},{width:960,path:'images/960.webp'}]}}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../js/responsive-images'),'utf8'),context);
 const image={style:{},removeAttribute(name){assert.equal(name,'srcset');this.srcset='';}};
 context.ResponsiveImages.set(image,'images/photo.jpg',{eager:true,focal:'top'});
 assert.equal(image.src,'images/960.webp');assert.equal(image.style.objectPosition,'top');assert.match(image.srcset,/320w/);
 context.ResponsiveImages.set(image,'https://example.com/external.jpg',{focal:'url(evil)'});
 assert.equal(image.srcset,'');assert.equal(image.style.objectPosition,'center');assert.equal(image.src,'https://example.com/external.jpg');
});
