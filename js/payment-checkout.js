(function(){
  'use strict';
  const el=id=>document.getElementById(id);
  const money=n=>'₹'+Number(n).toLocaleString('en-IN',{maximumFractionDigits:2});
  let config=null,started=false,reported=false,saving=false,selectionReady=false;
  const mode=()=>document.querySelector('input[name="bookingPaymentMode"]:checked')?.value||'confirmation';
  window.paymentCopyMessage=()=>mode()==='direct'?'UPI ID copied. Submit your transaction ID after paying; verification remains pending.':'UPI ID copied. Pay only after our team confirms availability and the amount.';
  function dateKey(){return TripDateUtils.parseTripDateRange(getDateFromURL())?.key||'';}
  function valid(){const trip=tripsData[getTripFromURL()];return trip&&TripDecision.matchingDeparture(trip,getDateFromURL())!==null;}
  function amount(){return PaymentOptions.amounts(window.bookingData.total,document.querySelector('input[name="paymentType"]:checked')?.value||'half');}
  function contactLink(payment){
    const b=window.bookingData,ref=b.bookingReference?' Reference: '+b.bookingReference+'.':'';
    const text=payment?`Hi! Please verify my UPI payment for ${b.trip}, ${b.date}, ${b.people} traveller(s).${ref} Amount reported: ${money(amount().due)}. Transaction ID: ${el('transactionReference').value.trim()||'I will share it here'}. I will attach my payment screenshot. Payment and availability verification are pending.`
      :`Hi! I would like to request ${b.trip}, ${b.date}, ${b.people} traveller(s).${ref} Please confirm availability and the payable amount before I pay.`;
    return 'https://wa.me/917019235581?text='+encodeURIComponent(text);
  }
  function bookingDetailsLink(){
    const b=window.bookingData,report=b.paymentReport;
    const lines=['Hi! Here are my submitted booking details:',
      'Name: '+el('fullName').value.trim(), 'Phone: '+el('phone').value.trim(),
      'Trip: '+b.trip,'Departure: '+b.date,'Travellers: '+b.people,
      'Trip total: '+money(b.total),
      'Payment choice: '+(report?'Direct UPI payment':'Pay after team confirmation'),
      ...(b.bookingReference?['Booking reference: '+b.bookingReference]:[]),
      ...(b.coupon?['Coupon: '+b.coupon]:[]),
      ...(report?['Amount reported: '+money(report.amount),'Transaction ID: '+report.transactionId,'Please verify my payment and availability. I will attach my receipt.']:['Please confirm availability and the amount before I pay.'])];
    return 'https://wa.me/917019235581?text='+encodeURIComponent(lines.join('\n'));
  }
  function render(){
    if(!config||!window.bookingData)return;
    const p=PaymentOptions.normalize(config.payment),allowed=PaymentOptions.allowed(p,getTripFromURL(),dateKey());
    const radios=[...document.querySelectorAll('input[name="bookingPaymentMode"]')];
    const previous=mode();
    if(!started&&!selectionReady){radios.find(r=>r.value===allowed[0]).checked=true;}
    selectionReady=true;
    if(!allowed.includes(mode()))radios.find(r=>r.value===allowed[0]).checked=true;
    for(const r of radios){r.disabled=started||!allowed.includes(r.value);r.closest('label').hidden=!allowed.includes(r.value);}
    el('paymentModeNotice').textContent=allowed.includes('direct')?'Choose how you would like to proceed. UPI payments are verified manually by our team.':'For this departure, our team confirms availability and the amount before payment.';
    if(started&&previous==='direct'&&!allowed.includes('direct')&&!reported){
      el('paymentSection').style.display='none';el('bookingIssue').hidden=false;
      el('bookingIssue').textContent='Direct payment is no longer offered for this departure. Return to your details to send a booking request.';
      el('editPaymentDetails').hidden=false;
    }
    const direct=mode()==='direct';
    if(!started)el('submitDetailsBtn').innerHTML=direct?'Continue to direct payment':'Send Booking Request';
    document.querySelector('.submit-note').textContent=direct?'Your place is confirmed after our team verifies payment and availability.':'Our team will confirm availability before you pay.';
    el('paymentHeading').textContent=reported?'Payment verification pending':direct?'Pay directly via UPI':'Pay after availability is confirmed';
    const reminder=reported?'Your transaction details were submitted. Share your receipt on WhatsApp. Please wait for our team to verify payment and availability.':direct?'After paying, submit your transaction ID below. Our team must verify payment and availability before confirming your place.':'Please wait for our team to confirm availability and your payable amount before paying.';
    document.querySelectorAll('#paymentSection .payment-reminder, #requestReceived .payment-reminder').forEach(n=>n.textContent=reminder);
    el('paymentInstructions').textContent=p.instructions;
    el('paymentInstructions').hidden=!p.instructions;
    el('paymentDue').textContent=money(amount().due);el('paymentBalance').textContent=money(amount().balance);
    el('remainingAmount').textContent=amount().balance.toLocaleString('en-IN',{maximumFractionDigits:2});
    el('halfPayAmount').textContent=money(PaymentOptions.amounts(window.bookingData.total,'half').due);
    el('fullPayAmount').textContent=money(window.bookingData.total);
    el('paymentQrSection').hidden=reported||!(p.showQr&&p.qrImage);
    if(p.showQr&&p.qrImage&&el('paymentQrImage').getAttribute('src')!==p.qrImage){
      el('qrLoadFeedback').hidden=true;el('paymentQrImage').hidden=false;el('paymentQrImage').src=p.qrImage;
    }
    el('paymentReportSection').hidden=reported;
    document.querySelectorAll('#paymentSection .upi-buttons,#paymentSection .payment-type-selector,#requestReceived #popupCopyUpi').forEach(n=>n.hidden=reported);
    const upi=p.upiId||(Array.isArray(p.profiles)?'':window.TravelSecurity?.getUPI?.()||'');
    el('paymentUpiValue').textContent=upi||'Ask our team for the current UPI ID.';
    el('receiverName').textContent=p.receiverName||'';
    el('receiverLine').hidden=!p.receiverName;
    el('copyPaymentUpi').disabled=!upi;
    el('downloadPaymentQr').href=p.qrImage||'#';
    el('downloadPaymentQr').hidden=!(p.showQr&&p.qrImage);
    el('downloadPaymentQr').download='payment-qr.'+(p.qrImage.split('.').pop()||'png');
    el('changeBooking').disabled=reported||!!window.bookingData.bookingReference;
    const usable=!!upi||!!(p.showQr&&p.qrImage);
    el('reportPaymentBtn').disabled=reported||!usable;
    if(!usable)el('paymentFeedback').textContent='Payment details are unavailable. Please contact our team before paying.';
    el('reportPaymentBtn').textContent=direct?'Submit payment details for verification':'I’ve paid — share details on WhatsApp';
    el('paymentScreenshotLink').href=contactLink(true);
    el('paymentScreenshotLink').hidden=!reported;
    el('transactionReference').disabled=reported;
    const screenshot=document.querySelector('.upi-instructions a');if(screenshot)screenshot.href=contactLink(true);
  }
  window.refreshPaymentOptions=function(value){config=value;render();};
  window.preparePaymentSubmission=async function(){
    if(mode()!=='direct')return true;
    if(!valid()){el('bookingIssue').hidden=false;el('bookingIssue').textContent='This departure is no longer accepting bookings. Please contact us on WhatsApp.';return false;}
    started=true;el('checkoutForm').style.display='none';el('submitSuccess').style.display='block';
    el('submitSuccess').querySelector('h3').textContent='Ready to pay directly';
    el('submitSuccess').querySelector('p').textContent='Your payment has not been submitted or verified. Pay the amount shown, then share your transaction ID below.';
    el('paymentSection').style.display='block';el('editPaymentDetails').hidden=false;
    render();el('paymentSection').scrollIntoView({behavior:'smooth',block:'start'});return false;
  };
  window.renderPaymentResult=function(){
    started=true;
    const direct=mode()==='direct',title=direct?'Payment details submitted':'Booking request received';
    if(direct)reported=true;
    const description=direct?'Payment verification pending. Our team will verify your transaction and availability before confirming your booking.':'Our team will confirm availability and the payable amount. Please wait for confirmation before paying.';
    for(const id of ['submitSuccess','requestReceived']){
      el(id).querySelector('h3,h2').textContent=title;el(id).querySelector('p').textContent=description;
    }
    el('requestStatus').textContent=direct?'Payment verification pending':'Availability confirmation pending';
    document.querySelectorAll('[data-send-booking-details]').forEach(link=>{link.href=bookingDetailsLink();link.hidden=false;});
    el('paymentScreenshotLink').href=contactLink(true);
    render();
  };
  async function beforePayment(){
    const intended=mode();
    try{await window.refreshCheckoutCommerce();}catch{el('paymentFeedback').textContent='Unable to check payment settings. Please retry or contact us on WhatsApp.';return false;}
    if(!valid()){el('paymentSection').style.display='none';el('bookingIssue').hidden=false;el('bookingIssue').textContent='This departure has closed. Please contact us on WhatsApp before paying.';return false;}
    if(intended==='direct'&&(mode()!=='direct'||!PaymentOptions.allowed(config.payment,getTripFromURL(),dateKey()).includes('direct'))){el('paymentFeedback').textContent='Direct payment is no longer offered. Contact our team before paying.';return false;}
    return true;
  }
  document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('input[name="bookingPaymentMode"],input[name="paymentType"]').forEach(r=>r.addEventListener('change',render));
    el('paymentQrImage').addEventListener('error',()=>{el('paymentQrImage').hidden=true;el('qrLoadFeedback').hidden=false;});
    el('editPaymentDetails').addEventListener('click',()=>{if(reported)return;started=false;window.bookingData.paymentReport=null;el('checkoutForm').style.display='block';el('submitSuccess').style.display='none';el('paymentSection').style.display='none';el('editPaymentDetails').hidden=true;el('bookingIssue').hidden=true;render();});
    el('transactionReference').addEventListener('input',()=>{el('paymentScreenshotLink').href=contactLink(true);});
    el('reportPaymentBtn').addEventListener('click',async()=>{
      if(saving||reported)return;
      const ref=el('transactionReference').value.trim();
      if(!/^[a-zA-Z0-9-]{6,40}$/.test(ref)){el('paymentReportFeedback').textContent='Enter the transaction ID from your UPI receipt (6–40 letters or numbers).';el('transactionReference').focus();return;}
      if(!el('paymentSent').checked){el('paymentReportFeedback').textContent='Confirm that you have made the payment before submitting.';return;}
      saving=true;el('reportPaymentBtn').disabled=true;
      try{
        const reportedAmount=amount().due;
        if(!await beforePayment())return;
        if(reportedAmount!==amount().due){el('paymentReportFeedback').textContent='The payable amount changed. Share the amount you actually paid and your receipt on WhatsApp for team review.';el('paymentScreenshotLink').hidden=false;return;}
        if(mode()!=='direct'){el('paymentReportFeedback').textContent='Share your transaction ID and payment screenshot on WhatsApp. Verification remains pending.';el('paymentScreenshotLink').hidden=false;return;}
        window.bookingData.paymentReport={mode:'direct',type:window.selectedPaymentType||'half',amount:amount().due,transactionId:ref};
        const previous=window.bookingData.bookingReference;
        await window.submitPaymentReport();
        // Booking service sets the reference only after the request is accepted.
        if(window.bookingData.bookingReference && window.bookingData.bookingReference!==previous || window.legacyPaymentAccepted===true){
          reported=true;el('paymentReportFeedback').textContent='Payment details submitted. Verification pending. Share your screenshot on WhatsApp.';el('editPaymentDetails').hidden=true;render();
        }else{el('paymentReportFeedback').textContent='Your payment report was not saved. Retry or share your transaction ID on WhatsApp.';el('paymentScreenshotLink').hidden=false;}
      }finally{saving=false;el('reportPaymentBtn').disabled=reported;}
    });
    window.resetPaymentForBookingChange=()=>{
      if(reported||saving||window.bookingData.bookingReference)return false;
      started=false;window.bookingData.paymentReport=null;
      el('transactionReference').value='';el('paymentSent').checked=false;
      el('checkoutForm').style.display='block';el('submitSuccess').style.display='none';
      el('paymentSection').style.display='none';el('editPaymentDetails').hidden=true;
      return true;
    };
  });
}());
