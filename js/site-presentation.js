(function(root,factory){
 const api=factory(); if(typeof module==='object'&&module.exports)module.exports=api;else root.SitePresentation=api;
}(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const presets={forest:{primary:'#1A472A',dark:'#0D2818',surface:'#EDF5EF'},ocean:{primary:'#164E63',dark:'#083344',surface:'#EDF6FA'},earth:{primary:'#74452A',dark:'#432817',surface:'#FAF1EB'}};
 const partKeys=["dateFirst","dateSecond","dateThird","cardPrice","cardDetails","cardHelp","navHome","navWeekend","navCalendar","navAll","navWhatsapp"];
 const colourOptions={"teal":["#0b6259","#d8f2ea","#51cbb4"],"blue":["#254f82","#e0ecfc","#82baff"],"purple":["#593984","#f0e2fd","#cda6fa"],"orange":["#904017","#ffe5d9","#ffad75"],"gold":["#755110","#fff0c8","#ffd43b"],"rose":["#8c3555","#fce4ee","#ff9abe"],"green":["#245c33","#e1f0e4","#8ad79b"]};
 const defaults={partColours:Object.fromEntries(partKeys.map(key=>[key,'default'])),preset:'forest',heroMobileImage:'',heroFocalPoint:'center',heroMobileFocalPoint:'center',heroSlides:[],heroMotion:false,animationsEnabled:true};
 function safe(value) {
  if(typeof value!=='string'||/[\s"'()<>\\\u0000-\u001f]/.test(value))return false;
  if(/^images\/[A-Za-z0-9_./-]+$/.test(value))return !value.split('/').some(part=>part==='..'||part==='.');
  try {const url=new URL(value);return url.protocol==='https:'&&!!url.hostname&&!url.username&&!url.password&&url.pathname.startsWith('/');}catch(_){return false;}
 }
 function normalize(value){
  value=value||{};return {partColours:Object.fromEntries(partKeys.map(key=>[key,(typeof value.partColours?.[key]==='string'&&Object.hasOwn(colourOptions,value.partColours[key]))?value.partColours[key]:'default'])),preset:Object.prototype.hasOwnProperty.call(presets,value.preset)?value.preset:'forest',heroMobileImage:safe(value.heroMobileImage)?value.heroMobileImage:'',heroFocalPoint:['center','top','bottom','left','right'].includes(value.heroFocalPoint)?value.heroFocalPoint:'center',heroMobileFocalPoint:['center','top','bottom','left','right'].includes(value.heroMobileFocalPoint)?value.heroMobileFocalPoint:('heroMobileFocalPoint' in value?'center':(['center','top','bottom','left','right'].includes(value.heroFocalPoint)?value.heroFocalPoint:'center')),heroSlides:Array.isArray(value.heroSlides)?value.heroSlides.filter(safe).slice(0,2):[],heroMotion:value.heroMotion===true,animationsEnabled:value.animationsEnabled!==false};
 }
 let cleanup=()=>{};
 function apply(config,document,win){
  if(!document.documentElement || !win)return;
  cleanup();const options=normalize(config.presentation),palette=presets[options.preset],style=document.documentElement.style;
  document.documentElement.setAttribute?.('data-site-animations',String(options.animationsEnabled));
  style.setProperty('--primary',palette.primary);style.setProperty('--primary-dark',palette.dark);style.setProperty('--brand-surface',palette.surface);
  for(const key of partKeys){
   const colour=colourOptions[options.partColours[key]];
   if(colour){
    style.setProperty('--part-'+key+'-ink',colour[0]);
    style.setProperty('--part-'+key+'-tint',colour[1]);
    style.setProperty('--part-'+key+'-bright',colour[2]);
   }else for(const tone of ['ink','tint','bright'])style.removeProperty?.('--part-'+key+'-'+tone);
  }
  const hero=document.querySelector('.hero');if(!hero)return;
  const mobile=win.matchMedia('(max-width: 767px)'),motion=win.matchMedia('(prefers-reduced-motion: reduce)');
  const source=path=>win.ResponsiveImages?win.ResponsiveImages.source(path,mobile.matches?640:1600):path;
  const layers=Array.from({length:2},()=>{const layer=document.createElement('div');layer.className='hero-photo-layer';layer.setAttribute('aria-hidden','true');hero.prepend(layer);return layer;});
  let timers=[],index=0;
  function reset(){
   timers.forEach(win.clearTimeout);timers=[];index=0;
   const paths=[mobile.matches&&options.heroMobileImage?options.heroMobileImage:config.hero.backgroundImage,...options.heroSlides].slice(0,mobile.matches?2:3);
   layers.forEach(layer=>{layer.style.backgroundPosition=mobile.matches?options.heroMobileFocalPoint:options.heroFocalPoint;layer.style.opacity='0';});
   layers[0].style.backgroundImage='url("'+source(paths[0])+'")';layers[0].style.opacity='1';
   hero.style.backgroundImage='none';
   if(!options.animationsEnabled||!options.heroMotion||motion.matches)return;
   // No continuous autoplay: only one slow pass, with at most three backgrounds.
   paths.slice(1).forEach((path,position)=>timers.push(win.setTimeout(()=>{
    if(document.hidden)return;
    const next=layers[(index+1)%2];next.style.backgroundImage='url("'+source(path)+'")';next.style.opacity='1';layers[index%2].style.opacity='0';index++;
   },8000*(position+1))));
  }
  reset();mobile.addEventListener('change',reset);motion.addEventListener('change',reset);
  cleanup=()=>{timers.forEach(win.clearTimeout);mobile.removeEventListener('change',reset);motion.removeEventListener('change',reset);layers.forEach(layer=>layer.remove());};
 }
 return {presets,defaults,normalize,apply};
}));
