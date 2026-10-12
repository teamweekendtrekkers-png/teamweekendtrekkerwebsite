(function(){
 'use strict';
 document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('lightboxImage')?.addEventListener('load',hideLoader);
  document.getElementById('lightboxImage')?.addEventListener('error',hideLoader);
  const id=getTripFromURL(),trip=typeof tripsData==='object'?tripsData[id]:null;
  if(!trip)return;
  TripDecision.preserveAnchors(document,window.location);
  const clean=text=>String(text||'').replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu,'').replace(/\s+/g,' ').trim();
  let heading=clean(trip.title);const letters=heading.replace(/[^A-Za-z]/g,'');if(letters&&letters===letters.toUpperCase())heading=heading.toLowerCase().replace(/\b[a-z]/g,c=>c.toUpperCase());document.getElementById('tripTitle').textContent=heading;
  document.querySelectorAll('.itinerary-accordion li,.itinerary-accordion h3,.day-badge,.highlights-list li').forEach(el=>el.textContent=clean(el.textContent));
  document.getElementById('thingsToCarryGrid').closest('details').hidden=Array.isArray(trip.thingsToCarry)&&!trip.thingsToCarry.length;
  const select=document.getElementById('dateSelect'),people=document.getElementById('peopleCount'),card=document.getElementById('bookingCard');
  const essentials=document.createElement('div');essentials.className='trip-essentials';document.getElementById('tripTitle').after(essentials);
  const fragment=document.createDocumentFragment();
  [trip.duration,trip.difficulty,trip.price&&trip.price+' / person'].filter(Boolean).forEach(text=>{const chip=document.createElement('span');chip.textContent=text;fragment.append(chip);});essentials.append(fragment);
  const dateChip=document.createElement('span');essentials.append(dateChip);
  const suppliedPeople=new URLSearchParams(location.search).get('people');if([...people.options].some(option=>option.value===suppliedPeople)){people.value=suppliedPeople;updateTotal();}
  function refresh(){
   const chosen=select.value,ranges=TripDateUtils.getUpcomingDateRanges(trip,new Date());
   select.replaceChildren();const placeholder=new Option(ranges.length?'Choose a date':'New dates coming soon','');select.add(placeholder);
   for(const range of ranges)select.add(new Option(range.originalLabel,range.originalLabel));
   select.disabled=!ranges.length;
   if(ranges.some(range=>range.originalLabel===chosen))select.value=chosen;
   else if(chosen){const notice=document.createElement('p');notice.className='booking-expired';notice.setAttribute('role','status');notice.textContent='The selected departure has closed. Please choose another date.';card.querySelector('.booking-expired')?.remove();select.after(notice);}
   dateChip.textContent=ranges.length?'Next: '+ranges[0].shortLabel:'New dates coming soon';
   select.dispatchEvent(new Event('change'));
  }
  refresh();setInterval(refresh,30000);window.addEventListener('pageshow',refresh);
  const originalCheckout=window.goToCheckout;
  window.goToCheckout=event=>{if(!TripDecision.matchingDeparture(trip,select.value)){event.preventDefault();refresh();select.focus();return false;}return originalCheckout(event);};
  const dialog=document.createElement('dialog');dialog.className='booking-dialog';dialog.setAttribute('aria-label','Choose date and travellers');
  const close=document.createElement('button');close.className='booking-dialog-close';close.type='button';close.textContent='×';close.setAttribute('aria-label','Close date selection');dialog.append(close);document.body.append(dialog);
  const anchor=document.createComment('Booking card position');card.before(anchor);
  close.addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>anchor.after(card));
  function open(event){if(!matchMedia('(max-width:767px)').matches)return;event.preventDefault();refresh();dialog.append(card);if(!dialog.open)dialog.showModal();select.focus();}
  document.querySelectorAll('.trip-section-links a').forEach(link=>{if(link.href.includes('#bookingCard'))link.addEventListener('click',open);});
  document.querySelector('.trip-hero-gallery a[href*="#bookingCard"]')?.addEventListener('click',open);
  const bar=document.getElementById('mobileBookBtn'),oldLink=bar?.querySelector('a');
  if(oldLink){const link=oldLink.cloneNode(true);oldLink.replaceWith(link);link.addEventListener('click',open);
   const update=()=>{link.setAttribute('aria-label','Choose date and travellers');link.querySelector('.float-cta').textContent='Dates & travellers';const price=link.querySelector('#floatPrice');price.firstChild.textContent=trip.price+' / person · ';const date=link.querySelector('.mobile-book-date');if(date)date.textContent=select.value||'Pick your departure';};select.addEventListener('change',update);update();
  }
 });
}());
