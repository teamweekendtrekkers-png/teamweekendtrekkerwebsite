/* Manual browsing with optional, user-controlled destination autoplay. */
(function(){
 document.addEventListener('DOMContentLoaded',()=>{
  for(const id of ['upcoming-batches-grid','featured-trips-grid']){
   const rail=document.getElementById(id);if(!rail)continue;
   rail.classList.add('trip-rail');rail.setAttribute('tabindex','0');rail.setAttribute('aria-label',id.startsWith('upcoming')?'Upcoming departures; scroll to browse':'Featured trips; scroll to browse');
   let autoplay=null;
   const controls=document.createElement('div');controls.className='rail-controls';
   for(const [label,direction,symbol] of [['Previous trips',-1,'←'],['Next trips',1,'→']]){
    const button=document.createElement('button');button.type='button';button.className='rail-arrow';button.setAttribute('aria-label',label);button.setAttribute('aria-controls',id);button.textContent=symbol;
    button.onclick=()=>rail.scrollBy({left:direction*((rail.querySelector('.trip-card,.departure-bar')?.getBoundingClientRect().width||0)+parseFloat(getComputedStyle(rail).gap||'0')||rail.clientWidth),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});controls.append(button);
   }
   if(id==='upcoming-batches-grid'){
    const actions=rail.parentElement.querySelector('.upcoming-batches-action');
    if(actions)actions.prepend(controls);else rail.after(controls);
   }else rail.after(controls);
   const sync=()=>{const max=rail.scrollWidth-rail.clientWidth;controls.hidden=max<2;controls.children[0].disabled=rail.scrollLeft<2;controls.children[1].disabled=rail.scrollLeft>=max-2;autoplay?.refresh();};
   rail.addEventListener('scroll',sync,{passive:true});new ResizeObserver(sync).observe(rail);new MutationObserver(sync).observe(rail,{childList:true});sync();
   if(id==='featured-trips-grid'&&window.TripGallerySlideshow){
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let ready=false,paused=false,hover=false;
    const toggle=document.createElement('button');toggle.type='button';toggle.className='rail-arrow rail-playback';toggle.hidden=true;
    const icon=document.createElement('span');icon.className='gallery-playback-icon';icon.setAttribute('aria-hidden','true');
    const label=document.createElement('span');toggle.append(icon,label);controls.append(toggle);
    const blocked=()=>!ready||paused||hover||document.hidden||reduced.matches||rail.scrollWidth<=rail.clientWidth+2||
      rail.getBoundingClientRect().bottom<=0||rail.getBoundingClientRect().top>=innerHeight||
      (document.activeElement!==toggle&&(rail.contains(document.activeElement)||controls.contains(document.activeElement)));
    autoplay=TripGallerySlideshow.timer({blocked,advance(){
      const max=rail.scrollWidth-rail.clientWidth;
      const step=(rail.querySelector('.trip-card')?.getBoundingClientRect().width||rail.clientWidth)+parseFloat(getComputedStyle(rail).gap||'0');
      rail.scrollTo({left:rail.scrollLeft>=max-2?0:Math.min(max,rail.scrollLeft+step),behavior:'smooth'});
    }});
    const update=()=>{toggle.textContent='';toggle.append(icon,label);label.textContent=paused?'Play':'Pause';toggle.dataset.paused=String(paused);toggle.setAttribute('aria-label',paused?'Play destination slideshow':'Pause destination slideshow');autoplay.refresh();};
    toggle.onclick=()=>{paused=!paused;update();};
    const enter=event=>{if(event.pointerType==='mouse'){hover=true;autoplay.refresh();}};
    const leave=()=>{hover=false;autoplay.refresh();};
    for(const node of [rail,controls]){
      node.addEventListener('pointerenter',enter);node.addEventListener('pointerleave',leave);
      node.addEventListener('focusin',()=>autoplay.refresh());node.addEventListener('focusout',()=>queueMicrotask(()=>autoplay.refresh()));
    }
    const refresh=()=>autoplay.refresh();
    document.addEventListener('visibilitychange',refresh);window.addEventListener('scroll',refresh,{passive:true});window.addEventListener('resize',refresh);
    window.addEventListener('pagehide',()=>autoplay.stop());window.addEventListener('pageshow',refresh);
    reduced.addEventListener('change',()=>{toggle.hidden=!ready||reduced.matches;refresh();});
    fetch('/js/homepage-config.json',{cache:'no-cache'}).then(response=>{if(!response.ok)throw Error('Slider settings unavailable');return response.json();}).then(config=>{
      const options=TripGallerySlideshow.normalize(config.destinationSlider);ready=options.autoSlide;
      toggle.hidden=!ready||reduced.matches;autoplay.configure(options);update();
    }).catch(()=>{ready=false;toggle.hidden=true;autoplay.stop();});
   }
  }
 });
}());
