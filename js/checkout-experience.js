(function(){
 'use strict';
 const money=value=>'₹'+Number(value).toLocaleString('en-IN',{minimumFractionDigits:Number.isInteger(Number(value))?0:2,maximumFractionDigits:2});
 let config=null,code='',busy=false;
 const byId=id=>document.getElementById(id);
 function currentTrip(){const id=getTripFromURL();return typeof tripsData==='object'&&Object.prototype.hasOwnProperty.call(tripsData,id)?tripsData[id]:null;}
 function dateValid(){const trip=currentTrip();return TripTravellers.valid(trip,Number(new URLSearchParams(location.search).get('people')||1))&&new URLSearchParams(location.search).getAll('date').length===1&&trip&&TripDecision.matchingDeparture(trip,getDateFromURL())!==null;}
 function message(text){byId('couponFeedback').textContent=text;}
 function recalculate(){
  const data=window.bookingData;if(!data||!config)return;
  const subtotal=data.price*data.people;
  const quote=code?BookingRules.quote(config,code,getTripFromURL(),subtotal):{valid:false,discount:0,total:subtotal};
  if(code&&!quote.valid){code='';message(quote.message);byId('offerUpdate').hidden=false;byId('offerUpdate').textContent=quote.message+' Please review your updated total.';}
  data.subtotal=subtotal;data.discount=quote.discount;data.coupon=quote.valid?quote.code:'';data.total=quote.total;
  byId('summarySubtotal').textContent=money(subtotal);
  byId('summaryTotal').textContent=money(data.total);
  byId('couponSavings').textContent='−'+money(data.discount);
  byId('couponSavingsRow').querySelector('span').textContent=quote.valid?'Coupon '+quote.code:'Coupon savings';
  if(quote.valid)byId('priceBreakdown').open=true;
  byId('couponSavingsRow').hidden=!quote.valid;
  byId('removeCoupon').hidden=!quote.valid;
  byId('hiddenTotal').value=data.total;
  const compact=byId('mobileTripSummaryText');if(compact)compact.textContent=data.trip+' · '+money(data.total);
  updatePaymentAmount();
 }
 function upiId(){return config?.payment.upiId||(Array.isArray(config?.payment.profiles)?'':window.TravelSecurity?.getUPI?.()||'');}
 function helpLinks(){
  const data=window.bookingData;
  const href='https://wa.me/917019235581?text='+encodeURIComponent(`Hi! I would like to check availability or trip details for ${data.trip}, ${data.date}, ${data.people} traveller(s).`);
  document.querySelectorAll('[data-trip-help],.support-card a').forEach(link=>{link.href=href;link.rel='noopener';});
 }
 async function refresh(){
  config=await BookingRules.load(window.fetch.bind(window));
  byId('couponEntry').hidden=!config.showCoupons;
  if(!config.showCoupons&&code){code='';byId('offerUpdate').hidden=false;byId('offerUpdate').textContent='Coupon offers were updated. Please review your total.';}
  byId('receiverLine').hidden=!config.payment.showReceiverName||!config.payment.receiverName;
  byId('receiverName').textContent=config.payment.receiverName;
  const razorpay=document.getElementById('rzpButton')?.closest('.payment-option');
  if(razorpay)razorpay.hidden=!config.payment.showRazorpay;
  // The legacy Razorpay integration is a placeholder, not a live payment gateway.
  if(config.payment.showRazorpay){byId('rzpButton').disabled=true;byId('rzpButton').textContent='Ask our team for an online payment link';}
  recalculate();
  window.refreshPaymentOptions?.(config);
 }
 window.refreshCheckoutCommerce=refresh;
 function invalidRequest(){
  const trip=currentTrip();
  byId('bookingIssue').hidden=false;byId('bookingIssue').textContent=trip&&!TripTravellers.valid(trip,Number(new URLSearchParams(location.search).get('people')||1))?'This trip allows up to '+TripTravellers.limit(trip)+' travellers per booking. Use Change date or travellers to update your selection.':trip?'This departure is no longer accepting requests. Please choose another date.':'The selected trip is missing or unavailable. Please choose a trip to continue.';
  byId('chooseTripLink').hidden=!!trip;
  byId('submitDetailsBtn').disabled=true;byId('paymentSection').style.display='none';
  byId('paymentModeNotice').textContent=trip&&!TripTravellers.valid(trip,Number(new URLSearchParams(location.search).get('people')||1))?'Reduce the number of travellers before continuing to payment.':trip?'This departure is unavailable. Choose another available date to continue.':'Choose an available trip before continuing to payment.';
  document.querySelectorAll('input[name="bookingPaymentMode"]').forEach(r=>r.disabled=true);
 }
 document.addEventListener('DOMContentLoaded',async()=>{
  const submit=byId('submitDetailsBtn');submit.disabled=true;
  const trip=currentTrip();
  window.installBookingChange?.({currentTrip,refresh,helpLinks,invalidRequest});
  if(!trip){invalidRequest();return;}
  if(!dateValid())invalidRequest();
  const summary=document.querySelector('.summary-card');
  summary.querySelector('h3').textContent='Your Weekend Plan';
  document.querySelector('.summary-trip-info p').textContent=trip.location||'';
  byId('requestViewTrip').href=TripLinks.detailUrl(getTripFromURL());
  const breakdown=document.createElement('details');breakdown.id='priceBreakdown';breakdown.className='price-breakdown';breakdown.open=!matchMedia('(max-width:767px)').matches;
  const label=document.createElement('summary');label.textContent='Price breakdown · '+trip.price+' / person';breakdown.append(label);
  const priceRow=document.querySelector('.summary-details .summary-row:nth-child(3)'),subtotalRow=byId('summarySubtotal').closest('.summary-row');priceRow.before(breakdown);breakdown.append(priceRow,subtotalRow,byId('couponSavingsRow'));
  byId('summaryFacts').textContent=[trip.duration,trip.departureCity&&'Departing '+trip.departureCity].filter(Boolean).join(' · ');

  const disclosure=document.createElement('details');disclosure.className='mobile-trip-summary';
  const disclosureTitle=document.createElement('summary');const compactText=document.createElement('span');compactText.id='mobileTripSummaryText';compactText.textContent=trip.title+' · '+money(window.bookingData.total);disclosureTitle.append(compactText);disclosureTitle.setAttribute('aria-label','Expand trip summary');
  const summaryBody=document.createElement('div');summaryBody.className='trip-summary-body';
  while(summary.firstChild)summaryBody.append(summary.firstChild);
  disclosure.append(disclosureTitle,summaryBody);summary.append(disclosure);
  const desktop=matchMedia('(min-width:768px)');
  const setDisclosure=()=>{disclosure.open=desktop.matches;};setDisclosure();desktop.addEventListener('change',setDisclosure);

  const optional=document.createElement('details');optional.className='optional-fields';optional.innerHTML='<summary>Additional details (optional)</summary>';
  const anchor=byId('altPhone').closest('.form-group');anchor.parentElement.after(optional);
  [anchor,byId('participants').closest('.form-group'),byId('notes').closest('.form-group')].forEach(node=>optional.append(node));
  byId('fullName').autocomplete='name';byId('email').autocomplete='email';byId('phone').autocomplete='tel';byId('altPhone').autocomplete='tel';
  const support=document.querySelector('.support-card');support.classList.remove('support-locked');
  const help=document.createElement('details');help.className='checkout-help';help.open=!matchMedia('(max-width:767px)').matches;
  const helpTitle=document.createElement('summary');helpTitle.textContent='Questions about this trip?';help.append(helpTitle,document.querySelector('.summary-note'),support);summary.append(help);
  byId('changeBooking').addEventListener('click',()=>{disclosure.open=true;});
  byId('checkoutForm').addEventListener('submit',event=>{event.preventDefault();window.submitDetails();});
  byId('applyCoupon').addEventListener('click',async()=>{try{await refresh();if(!config.showCoupons)return;const result=BookingRules.quote(config,byId('couponCode').value,getTripFromURL(),window.bookingData.price*window.bookingData.people);code=result.valid?result.code:'';recalculate();message(result.message);}catch{message('Offers could not be loaded. Please try again.');}});
  byId('removeCoupon').addEventListener('click',()=>{code='';byId('couponCode').value='';message('Coupon removed.');recalculate();});
  byId('couponCode').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();byId('applyCoupon').click();}});
  const originalSubmit=window.submitDetails;
  window.submitPaymentReport=originalSubmit;
  window.submitDetails=async()=>{
   if(busy)return;busy=true;submit.disabled=true;
   const previousLabel=submit.innerHTML;
   submit.textContent='Submitting…';submit.setAttribute('aria-busy','true');
   byId('bookingIssue').setAttribute('role','status');
   try{
    const previousTotal=window.bookingData.total,previousCoupon=window.bookingData.coupon;
    await refresh();
    if(previousCoupon&&previousTotal!==window.bookingData.total){byId('offerUpdate').hidden=false;byId('offerUpdate').textContent='Your coupon offer changed. Review the updated total and submit again when ready.';return;}
    if(!dateValid()){invalidRequest();return;}
    if(!validateForm())return;
    // Quotes are requests only: the team verifies coupons and availability before any payment.
    if(window.preparePaymentSubmission && !await window.preparePaymentSubmission())return;
    await originalSubmit();
   }catch{byId('bookingIssue').hidden=false;byId('bookingIssue').textContent='Unable to verify current booking settings. Please retry or contact us on WhatsApp.';}
   finally{busy=false;submit.removeAttribute('aria-busy');if(dateValid()&&byId('checkoutForm').style.display!=='none'){submit.disabled=false;submit.innerHTML=previousLabel;}}
  };
  byId('copyPaymentUpi').addEventListener('click',async()=>{const value=upiId();if(!value){byId('paymentFeedback').textContent='Please ask our team for the current UPI ID.';return;}try{await navigator.clipboard.writeText(value);byId('paymentFeedback').textContent=window.paymentCopyMessage?.()||'UPI ID copied. Pay only after availability is confirmed.';}catch{byId('paymentFeedback').textContent='UPI ID: '+value;}});
  const originalSuccess=window.showPaymentSection;
  window.showPaymentSection=()=>{originalSuccess();window.legacyPaymentAccepted=!window.bookingData.bookingReference;if(window.renderPaymentResult)window.renderPaymentResult();else byId('requestStatus').textContent='Availability confirmation pending';const dialog=byId('requestReceived');if(!dialog.open)dialog.showModal();helpLinks();};
  byId('popupCopyUpi').addEventListener('click',async()=>{byId('copyPaymentUpi').click();const value=upiId();byId('popupPaymentFeedback').textContent=value?'UPI ID: '+value+'. '+(window.paymentCopyMessage?.()||'Pay after team confirmation.'):'Ask our team for the current UPI ID.';});
  byId('closeRequestPopup').addEventListener('click',()=>byId('requestReceived').close());
  try{await refresh();helpLinks();if(dateValid())submit.disabled=false;else invalidRequest();}
  catch{byId('bookingIssue').hidden=false;byId('bookingIssue').textContent='Booking settings could not be loaded. Reload this page or ask us on WhatsApp.';byId('paymentModeNotice').textContent='Payment options could not be loaded. Please reload or contact our team.';}
  setInterval(()=>{if(!dateValid())invalidRequest();},30000);
  window.addEventListener('pageshow',()=>{if(!dateValid())invalidRequest();});
 });
}());

