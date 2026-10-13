/* Manual browsing: no timer, no automatic carousel movement. */
(function(){
 document.addEventListener('DOMContentLoaded',()=>{
  for(const id of ['upcoming-batches-grid','featured-trips-grid']){
   const rail=document.getElementById(id);if(!rail)continue;
   rail.classList.add('trip-rail');rail.setAttribute('tabindex','0');rail.setAttribute('aria-label',id.startsWith('upcoming')?'Upcoming departures; scroll to browse':'Featured trips; scroll to browse');
   const controls=document.createElement('div');controls.className='rail-controls';
   for(const [label,direction,symbol] of [['Previous trips',-1,'←'],['Next trips',1,'→']]){
    const button=document.createElement('button');button.type='button';button.className='rail-arrow';button.setAttribute('aria-label',label);button.setAttribute('aria-controls',id);button.textContent=symbol;
    button.onclick=()=>rail.scrollBy({left:direction*((rail.querySelector('.trip-card,.departure-bar')?.getBoundingClientRect().width||0)+parseFloat(getComputedStyle(rail).gap||'0')||rail.clientWidth),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});controls.append(button);
   }
   if(id==='upcoming-batches-grid'){
    const actions=rail.parentElement.querySelector('.upcoming-batches-action');
    if(actions)actions.prepend(controls);else rail.after(controls);
   }else rail.after(controls);
   const sync=()=>{const max=rail.scrollWidth-rail.clientWidth;controls.hidden=max<2;controls.children[0].disabled=rail.scrollLeft<2;controls.children[1].disabled=rail.scrollLeft>=max-2;};
   rail.addEventListener('scroll',sync,{passive:true});new ResizeObserver(sync).observe(rail);new MutationObserver(sync).observe(rail,{childList:true});sync();
  }
 });
}());
