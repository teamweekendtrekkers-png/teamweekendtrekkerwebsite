(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.TripGallerySlideshow=api;
}(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const defaults={autoSlide:true,intervalSeconds:5};
  function normalize(raw){
    raw=raw||{};
    return {autoSlide:typeof raw.autoSlide==='boolean'?raw.autoSlide:defaults.autoSlide,
      intervalSeconds:Number.isInteger(raw.intervalSeconds)&&raw.intervalSeconds>=3&&raw.intervalSeconds<=30?raw.intervalSeconds:defaults.intervalSeconds};
  }
  // One pending timeout; every interaction starts a fresh interval.
  function timer({advance,blocked=()=>false,set=setTimeout,clear=clearTimeout,options={}}){
    let config=normalize(options),handle=null,destroyed=false;
    function stop(){if(handle!==null)clear(handle);handle=null;}
    function refresh(){
      stop();
      if(destroyed||!config.autoSlide||blocked())return;
      handle=set(()=>{handle=null;if(!destroyed&&!blocked()){advance();refresh();}},config.intervalSeconds*1000);
    }
    return {refresh,stop,configure(value){config=normalize(value);refresh();},destroy(){destroyed=true;stop();}};
  }
  let settings;
  function attach(main,{advance,count}){
    if(count<2)return {reset(){},destroy(){}};
    const doc=main.ownerDocument,win=doc.defaultView;
    const reduced=win.matchMedia('(prefers-reduced-motion: reduce)');
    let config=null,userPaused=false,hover=false,inView=false,destroyed=false;
    const button=doc.createElement('button');
    button.type='button';button.className='gallery-playback';button.hidden=true;
    button.addEventListener('click',event=>{event.stopPropagation();userPaused=!userPaused;update();});
    const icon=doc.createElement('span');icon.className='gallery-playback-icon';icon.setAttribute('aria-hidden','true');
    const label=doc.createElement('span');label.className='gallery-playback-label';
    button.append(icon,label);
    main.append(button);
    const lightbox=doc.getElementById('galleryLightbox');
    const blocked=()=>!config||!config.autoSlide||userPaused||hover||!inView||doc.hidden||reduced.matches||
      (!!doc.activeElement&&main.contains(doc.activeElement)&&doc.activeElement!==button)||
      !!lightbox?.classList.contains('active');
    const clock=timer({advance,blocked});
    function update(){
      button.hidden=!config?.autoSlide||reduced.matches;
      label.textContent=userPaused?'Play':'Pause';
      button.dataset.paused=String(userPaused);
      button.setAttribute('aria-label',userPaused?'Play photo slideshow':'Pause photo slideshow');
      clock.refresh();
    }
    function viewport(){
      const rect=main.getBoundingClientRect();
      inView=rect.bottom>0&&rect.top<win.innerHeight&&rect.right>0&&rect.left<win.innerWidth;
      clock.refresh();
    }
    const enter=event=>{if(event.pointerType==='mouse'){hover=true;clock.refresh();}};
    const leave=()=>{hover=false;clock.refresh();};
    const focus=()=>clock.refresh();
    const blur=()=>queueMicrotask(()=>{if(!destroyed)clock.refresh();});
    const pagehide=()=>clock.stop();
    main.addEventListener('pointerenter',enter);main.addEventListener('pointerleave',leave);
    main.addEventListener('focusin',focus);main.addEventListener('focusout',blur);
    doc.addEventListener('visibilitychange',viewport);
    win.addEventListener('scroll',viewport,{passive:true});
    win.addEventListener('resize',viewport);
    win.addEventListener('pagehide',pagehide);win.addEventListener('pageshow',viewport);
    reduced.addEventListener('change',update);
    const observer=new win.MutationObserver(()=>clock.refresh());
    if(lightbox)observer.observe(lightbox,{attributes:true,attributeFilter:['class']});
    settings=settings||win.fetch('/js/homepage-config.json',{cache:'no-cache'})
      .then(response=>{if(!response.ok)throw Error('Gallery settings unavailable');return response.json();})
      .then(value=>normalize(value.tripGallery)).catch(()=>({autoSlide:false,intervalSeconds:5}));
    settings.then(value=>{if(destroyed)return;config=value;clock.configure(value);viewport();update();});
    return {reset(){clock.refresh();},destroy(){
      destroyed=true;clock.destroy();observer.disconnect();button.remove();
      main.removeEventListener('pointerenter',enter);main.removeEventListener('pointerleave',leave);
      main.removeEventListener('focusin',focus);main.removeEventListener('focusout',blur);
      doc.removeEventListener('visibilitychange',viewport);
      win.removeEventListener('scroll',viewport);win.removeEventListener('resize',viewport);
      win.removeEventListener('pagehide',pagehide);win.removeEventListener('pageshow',viewport);
      reduced.removeEventListener('change',update);
    }};
  }
  return {defaults,normalize,timer,attach};
}));
