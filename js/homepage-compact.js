/* Enhance manager-rendered benefits without changing their content. */
(function(){document.addEventListener('DOMContentLoaded',()=>{
 const grid=document.querySelector('.why-choose-us .homepage-info-grid');if(!grid)return;
 const controls=document.createElement('div');controls.className='benefit-dots';controls.setAttribute('role','group');controls.setAttribute('aria-label','Choose a reason');grid.after(controls);
 const sync=()=>{const cards=[...grid.children];let active=0,distance=Infinity;cards.forEach((card,i)=>{const delta=Math.abs(card.getBoundingClientRect().left-grid.getBoundingClientRect().left);if(delta<distance){distance=delta;active=i;}});[...controls.children].forEach((dot,i)=>{dot.setAttribute('aria-pressed',String(i===active));});};
 const rebuild=()=>{controls.replaceChildren();[...grid.children].forEach((card,i)=>{const dot=document.createElement('button');dot.type='button';dot.className='benefit-dot';dot.setAttribute('aria-label','Show '+(card.querySelector('h3')?.textContent||'reason '+(i+1)));dot.onclick=()=>grid.scrollBy({left:card.getBoundingClientRect().left-grid.getBoundingClientRect().left,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});controls.append(dot);});controls.hidden=grid.children.length<2;sync();};
 grid.addEventListener('scroll',sync,{passive:true});new MutationObserver(rebuild).observe(grid,{childList:true});new ResizeObserver(sync).observe(grid);rebuild();
});}());
