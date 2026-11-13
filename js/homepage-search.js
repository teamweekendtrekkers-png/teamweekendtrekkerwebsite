(function(){
 'use strict';
 document.addEventListener('DOMContentLoaded',()=>{
  const input=document.getElementById('heroTripSearch'),results=document.getElementById('heroSearchResults');
  if(!input||!results)return;
  const all=()=>Object.entries(tripsData).map(([id,trip])=>({...trip,id}));
  function show(){
   const query=input.value.trim();results.replaceChildren();results.hidden=!query;if(!query)return;
   const form=input.closest('form'),when=form?.querySelector('[name="when"]')?.value||'',experience=form?.querySelector('[name="experience"]')?.value||'all';
   const matches=TripDiscovery.sortTrips(TripDiscovery.filterTrips(all(),{query,when,experience,showComingSoon:true},new Date()),new Date()).slice(0,5);
   for(const trip of matches){
    const link=document.createElement('a');link.href=TripLinks.detailUrl(trip.id);link.className='hero-search-result';
    const image=document.createElement('img');image.alt='';ResponsiveImages.set(image,TripDiscovery.imagePath(trip),{sizes:'64px'});
    const copy=document.createElement('span'),title=document.createElement('strong'),meta=document.createElement('small');title.textContent=trip.title.trim();
    const window=TripDateUtils.dateWindow(when,new Date()),date=TripDateUtils.getUpcomingDateRanges(trip,new Date()).find(range=>!window||(range.start.getTime()>=window.start&&range.start.getTime()<window.end));
    if(when&&date)link.href=TripLinks.departureUrl(trip.id,date.originalLabel);
    meta.textContent=[date?date.shortLabel:'New dates coming soon',trip.price&&trip.price+' / person'].filter(Boolean).join(' · ');copy.append(title,meta);link.append(image,copy);results.append(link);
   }
   if(!matches.length){const text=document.createElement('p');text.textContent='No matching trips. Try another destination or ask us on WhatsApp.';results.append(text);}
   const params=new URLSearchParams({q:query});if(when)params.set('when',when);if(experience!=='all')params.set('experience',experience);
   const more=document.createElement('a');more.href='trips.html?'+params;more.textContent='Browse all matching trips →';results.append(more);
  }
  input.addEventListener('input',show);input.addEventListener('keydown',event=>{if(event.key==='Escape')results.hidden=true;});
  input.addEventListener('finderchange',show);
  document.addEventListener('click',event=>{if(!event.target.closest('.hero-content'))results.hidden=true;});
 });
}());
