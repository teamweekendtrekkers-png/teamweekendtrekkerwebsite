(function(){
 'use strict';
 window.installBookingChange=function({currentTrip,refresh,helpLinks,invalidRequest}){
  const button=document.getElementById('changeBooking');
  const trip=currentTrip();if(!button||!trip)return;
  const dialog=document.createElement('dialog');dialog.className='booking-change-dialog';dialog.setAttribute('aria-labelledby','changeBookingTitle');
  dialog.innerHTML='<h2 id="changeBookingTitle">Change date or travellers</h2><p>Your contact details will stay on this page.</p><form><label for="changeDeparture">Departure date</label><select id="changeDeparture" required></select><label for="changeTravellers">Travellers</label><select id="changeTravellers"></select><p id="changeBookingFeedback" role="status"></p><div class="booking-change-actions"><button type="submit" class="btn btn-primary">Update booking</button><button type="button" class="btn btn-secondary" data-cancel>Cancel</button></div></form>';
  document.body.append(dialog);
  const dates=dialog.querySelector('#changeDeparture'),people=dialog.querySelector('#changeTravellers'),feedback=dialog.querySelector('#changeBookingFeedback'),submit=dialog.querySelector('[type="submit"]');
  for(let n=1;n<=50;n++)people.add(new Option(String(n),String(n)));
  button.addEventListener('click',()=>{
   if(window.bookingData.bookingReference)return;
   const ranges=TripDateUtils.getUpcomingDateRanges(trip,new Date());dates.replaceChildren();
   for(const range of ranges)dates.add(new Option(range.originalLabel,range.originalLabel));
   const selected=TripDecision.matchingDeparture(trip,getDateFromURL());if(selected)dates.value=selected;
   people.value=String(window.bookingData.people);dates.disabled=!ranges.length;submit.disabled=!ranges.length;
   feedback.textContent=ranges.length?'':'No other departures are available for this trip. Please contact our team.';
   dialog.showModal();dates.focus();
  });
  dialog.querySelector('[data-cancel]').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>button.focus());
  dialog.querySelector('form').addEventListener('submit',async event=>{
   event.preventDefault();
   const departure=TripDecision.matchingDeparture(trip,dates.value),count=Number(people.value);
   if(!departure||!Number.isInteger(count)||count<1||count>50){feedback.textContent='This departure is unavailable. Please choose another date.';return;}
   submit.disabled=true;feedback.textContent='Updating your booking…';
   if(window.resetPaymentForBookingChange&&!window.resetPaymentForBookingChange()){feedback.textContent='This booking has already been submitted. Contact our team to change it.';submit.disabled=false;return;}
   const url=new URL(location.href);url.searchParams.set('date',departure);url.searchParams.set('people',String(count));history.replaceState(null,'',url);
   try{
    updateCheckoutPage();document.getElementById('bookingIssue').hidden=true;
    await refresh();helpLinks();document.getElementById('submitDetailsBtn').disabled=false;
    dialog.close();
   }catch{invalidRequest();feedback.textContent='Unable to refresh booking settings. Retry or reload this page.';}
   finally{submit.disabled=false;}
  });
 };
}());
