(function(){
 'use strict';
 document.addEventListener('DOMContentLoaded',()=>{
  const heading=document.querySelector('.trip-heading'),title=document.getElementById('tripTitle');
  const nav=document.getElementById('tripSectionLinks'),details=document.querySelector('.trip-details');
  if(!heading||!title||!nav||!details)return;
  document.body.classList.add('tour-refined');
  const id=getTripFromURL(),trip=typeof tripsData==='object'?tripsData[id]:null;
  if(!trip)return;
  const route=document.createElement('p');route.className='trip-mobile-route';
  route.textContent=[trip.location,trip.departureCity&&'From '+trip.departureCity].filter(Boolean).join(' · ');
  route.hidden=!route.textContent;
  const facts=document.createElement('p');facts.className='trip-mobile-facts';
  title.after(route,facts);
  const select=document.getElementById('dateSelect');
  const syncFacts=()=>{
   const chosen=TripDateUtils.parseTripDateRange(select?.value||'');
   const next=TripDateUtils.getUpcomingDateRanges(trip)[0];
   const date=chosen?'Selected: '+chosen.shortLabel:next?'Next: '+next.shortLabel:'New dates coming soon';
   facts.textContent=[trip.duration,trip.difficulty,date].filter(Boolean).join(' · ');
  };
  select?.addEventListener('change',syncFacts);syncFacts();
  // Keep shortcuts available through the information section, independently of
  // the manager-controlled glance cards, and stop sticking before the footer.
  details.prepend(nav);
  const links=[...nav.querySelectorAll('a')];
  const targets=links.map(link=>document.getElementById(new URL(link.href,document.baseURI).hash.slice(1)));
  targets.forEach((target,i)=>{links[i].hidden=!target||target.hidden||!!target.closest('[hidden]');});
  let scheduled=false,lockedUntil=0;
  function activate(index){
   links.forEach((link,i)=>{
    if(i===index)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');
   });
   const link=links[index];
   if(link){
    const r=link.getBoundingClientRect(),n=nav.getBoundingClientRect();
    if(r.left<n.left||r.right>n.right)nav.scrollTo({left:nav.scrollLeft+r.left-n.left-12,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});
   }
  }
  function measure(){
   const header=document.querySelector('.navbar')?.getBoundingClientRect().height||64;
   document.body.style.setProperty('--tour-nav-top',header+'px');
   document.body.style.setProperty('--tour-anchor-offset',(header+nav.getBoundingClientRect().height+16)+'px');
   const bar=document.getElementById('mobileBookBtn');
   if(bar&&matchMedia('(max-width:767px)').matches)document.body.style.setProperty('--tour-book-space',(Math.ceil(bar.getBoundingClientRect().height)+12)+'px');
  }
  function update(){
   scheduled=false;if(performance.now()<lockedUntil)return;
   const offset=parseFloat(document.body.style.getPropertyValue('--tour-anchor-offset'))||140;
   let current=links.findIndex(link=>!link.hidden);
   targets.forEach((target,i)=>{if(target&&!target.hidden&&target.getBoundingClientRect().top<=offset+12)current=i;});
   activate(current);
  }
  function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(update);}}
  nav.addEventListener('focusin',event=>{
   const link=event.target.closest('a');if(!link)return;
   const r=link.getBoundingClientRect(),n=nav.getBoundingClientRect();
   if(r.left<n.left||r.right>n.right)nav.scrollTo({left:nav.scrollLeft+r.left-n.left-12,behavior:'auto'});
  });
  nav.addEventListener('click',event=>{
   const link=event.target.closest('a');const i=links.indexOf(link);if(i<0)return;
   lockedUntil=performance.now()+500;activate(i);setTimeout(update,520);
  });
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',()=>{measure();schedule();},{passive:true});
  select?.addEventListener('change',measure);
  if(typeof ResizeObserver==='function'){
   const observer=new ResizeObserver(()=>{measure();schedule();});
   observer.observe(nav);const header=document.querySelector('.navbar');if(header)observer.observe(header);const bar=document.getElementById('mobileBookBtn');if(bar)observer.observe(bar);
  }
  measure();update();
 });
}());
