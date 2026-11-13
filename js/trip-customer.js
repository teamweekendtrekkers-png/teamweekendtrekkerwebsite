(function(){
 'use strict';
 document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('lightboxImage')?.addEventListener('load',hideLoader);
  document.getElementById('lightboxImage')?.addEventListener('error',hideLoader);
  const id=getTripFromURL(),trip=typeof tripsData==='object'?tripsData[id]:null;
  if(!trip)return;
  TripDecision.preserveAnchors(document,window.location);
  // Preserve authored emojis, including variation selectors and joined sequences.
  const clean=text=>String(text||'').replace(/\s+/g,' ').trim();
  let heading=clean(trip.title);const letters=heading.replace(/[^A-Za-z]/g,'');if(letters&&letters===letters.toUpperCase())heading=heading.toLowerCase().replace(/\b[a-z]/g,c=>c.toUpperCase());TripText.set(document.getElementById('tripTitle'),heading);
  document.querySelectorAll('.itinerary-accordion li,.itinerary-accordion h3,.day-badge,.highlights-list li').forEach(el=>{if(!el.querySelector('strong,em'))TripText.set(el,clean(el.textContent));});
  document.getElementById('thingsToCarryGrid').closest('details').hidden=Array.isArray(trip.thingsToCarry)&&!trip.thingsToCarry.length;
  const select=document.getElementById('dateSelect'),people=document.getElementById('peopleCount'),card=document.getElementById('bookingCard');
  const continueButton=document.getElementById('bookNowBtn');
  const departureState=document.createElement('p');departureState.id='selectedDepartureStatus';departureState.className='departure-status';departureState.setAttribute('role','status');departureState.hidden=true;select.after(departureState);
  const soldOutNotice=document.createElement('p');soldOutNotice.className='sold-out-notice';soldOutNotice.hidden=true;departureState.after(soldOutNotice);
  const dateFeedback=document.createElement('p');dateFeedback.id='departureFeedback';dateFeedback.className='booking-date-feedback';dateFeedback.setAttribute('role','status');dateFeedback.hidden=true;select.after(dateFeedback);
  select.setAttribute('aria-describedby',[select.getAttribute('aria-describedby'),'departureFeedback'].filter(Boolean).join(' '));
  const updateBookingAction=()=>{
   const valid=!!TripDecision.matchingDeparture(trip,select.value);
   continueButton.textContent=select.disabled?'Dates unavailable':valid?'Continue to payment':'Choose a departure date';
   continueButton.setAttribute('aria-disabled',String(select.disabled));
   departureState.hidden=!valid;
   if(valid){const state=TripDateUtils.departureStatus(trip,TripDateUtils.parseTripDateRange(select.value).key);departureState.textContent=state.label;departureState.dataset.status=state.key;}
   if(valid){dateFeedback.hidden=true;select.removeAttribute('aria-invalid');}
  };
  select.addEventListener('change',updateBookingAction);
  const essentials=document.createElement('div');essentials.className='trip-essentials';document.getElementById('tripTitle').after(essentials);
  const fragment=document.createDocumentFragment();
  [trip.duration,trip.difficulty,trip.price&&trip.price+' / person'].filter(Boolean).forEach(text=>{const chip=document.createElement('span');chip.textContent=text;fragment.append(chip);});essentials.append(fragment);
  const dateChip=document.createElement('span');essentials.append(dateChip);
  const suppliedPeople=new URLSearchParams(location.search).get('people');if([...people.options].some(option=>option.value===suppliedPeople)){people.value=suppliedPeople;updateTotal();}
  function refresh(){
   const chosen=select.value,ranges=TripDateUtils.getUpcomingDateRanges(trip,new Date());
   select.replaceChildren();const placeholder=new Option(ranges.length?'Choose a date':TripDateUtils.unavailableDateLabel(trip,new Date()),'');select.add(placeholder);
   for(const range of ranges)select.add(new Option(range.originalLabel,range.originalLabel));
   select.disabled=!ranges.length;
   const soldOut=TripDateUtils.getUpcomingDateRanges({...trip,closedDepartures:[],soldOutDepartures:[]},new Date()).filter(range=>(trip.soldOutDepartures||[]).includes(range.key));
   soldOutNotice.hidden=!soldOut.length;soldOutNotice.textContent=soldOut.length?'Sold out: '+soldOut.map(range=>range.shortLabel).join(', '):'';
   if(ranges.some(range=>range.originalLabel===chosen))select.value=chosen;
   else if(chosen){const notice=document.createElement('p');notice.className='booking-expired';notice.setAttribute('role','status');notice.textContent='The selected departure has closed. Please choose another date.';card.querySelector('.booking-expired')?.remove();select.after(notice);}
   dateChip.textContent=ranges.length?'Next: '+ranges[0].shortLabel:TripDateUtils.unavailableDateLabel(trip,new Date());
   select.dispatchEvent(new Event('change'));
  }
  refresh();setInterval(refresh,30000);window.addEventListener('pageshow',refresh);
  const originalCheckout=window.goToCheckout;
  window.goToCheckout=event=>{
   if(!TripDecision.matchingDeparture(trip,select.value)){
    event.preventDefault();refresh();
    dateFeedback.textContent=select.disabled?'No departures are available. Please contact our team.':'Choose a departure date above to continue.';
    dateFeedback.hidden=false;select.setAttribute('aria-invalid','true');select.focus();return false;
   }
   return originalCheckout(event);
  };
  const dialog=document.createElement('dialog');dialog.className='booking-dialog';dialog.setAttribute('aria-label','Choose date and travellers');
  const close=document.createElement('button');close.className='booking-dialog-close';close.type='button';close.textContent='×';close.setAttribute('aria-label','Close date selection');dialog.append(close);document.body.append(dialog);
  const anchor=document.createComment('Booking card position');card.before(anchor);
  close.addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>anchor.after(card));
  card.querySelectorAll('.booking-package-link,.booking-pickup-link').forEach(link=>link.addEventListener('click',event=>{
   event.preventDefault();if(dialog.open)dialog.close();
   const panel=document.getElementById(link.classList.contains('booking-pickup-link')?'tripPickup':'tripIncludes');if(panel){if(panel.tagName==='DETAILS')panel.open=true;requestAnimationFrame(()=>{panel.scrollIntoView({block:'start',behavior:'auto'});panel.setAttribute('tabindex','-1');panel.focus({preventScroll:true});});}
  }));
  function open(event){if(!matchMedia('(max-width:767px)').matches)return;event.preventDefault();refresh();dialog.append(card);if(!dialog.open)dialog.showModal();select.focus();}
  document.querySelectorAll('.trip-section-links a').forEach(link=>{if(link.href.includes('#bookingCard'))link.addEventListener('click',open);});
  document.querySelector('.trip-hero-gallery a[href*="#bookingCard"]')?.addEventListener('click',open);
  const bar=document.getElementById('mobileBookBtn'),oldLink=bar?.querySelector('a');
  if(oldLink){const link=oldLink.cloneNode(true);oldLink.replaceWith(link);link.addEventListener('click',open);
   const update=()=>{link.setAttribute('aria-label','Choose dates and travellers to book');link.setAttribute('aria-haspopup','dialog');link.querySelector('.float-cta').textContent=select.disabled?'Dates unavailable':select.value?'Change date':'View dates';const price=link.querySelector('#floatPrice');price.firstChild.textContent=trip.price+' / person';const date=link.querySelector('.mobile-book-date');if(date)date.textContent=TripDateUtils.parseTripDateRange(select.value)?.shortLabel||'Pick your departure';};select.addEventListener('change',update);update();
  }
 });
}());
