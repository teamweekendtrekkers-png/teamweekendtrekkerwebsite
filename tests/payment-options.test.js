'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const options=require('../js/payment-options');
const approvals=[{tripId:'demo',dateKey:'2026-10-16/2026-10-18'}];
test('legacy configuration stays confirmation-first and hides QR',()=>{
  const p=options.normalize({upiId:'demo@upi'});
  assert.equal(p.mode,'confirmation');assert.equal(p.showQr,false);assert.deepEqual(p.directDepartures,[]);
});
test('direct payment requires an explicitly approved departure',()=>{
  for(const mode of ['confirmation','direct','both']){
    const p={mode,directDepartures:approvals};
    assert.deepEqual(options.allowed(p,'different','2026-10-16/2026-10-18'),['confirmation']);
    assert.deepEqual(options.allowed(p,'demo','2026-10-23/2026-10-25'),['confirmation']);
    assert.deepEqual(options.allowed(p,'demo',approvals[0].dateKey),mode==='both'?['confirmation','direct']:[mode]);
  }
});
test('advance and full amounts add up exactly at paise precision',()=>{
  assert.deepEqual(options.amounts(4499,'half'),{due:2249.5,balance:2249.5,total:4499});
  assert.deepEqual(options.amounts(100.01,'half'),{due:50.01,balance:50,total:100.01});
  assert.deepEqual(options.amounts(100.01,'full'),{due:100.01,balance:0,total:100.01});
  assert.throws(()=>options.amounts(NaN,'half'));assert.throws(()=>options.amounts(-1,'half'));
});
test('QR paths allow repository raster originals and reject executable or escaped URLs',()=>{
  assert.equal(options.imagePath('images/trips/payment-qr.png'),'images/trips/payment-qr.png');
  for(const path of ['javascript:evil','https://evil.test/qr.png','images/../qr.png','images//qr.png','images/qr.svg','images/qr.png?x=1'])assert.equal(options.imagePath(path),'');
});
test('server labels direct payment as customer-reported, pending verification',async()=>{
  const core=await import('../supabase/functions/booking-request/core.mjs');
  const report={mode:'direct',type:'half',amount:2249.5,transactionId:'UPI123456789'};
  const booking={trip_name:'Demo Trip',booking_reference:'TWT-DEMO',special_requests:options.reportText(report,'Window seat please'),total_amount:4499,participant_names:[],travellers:1};
  assert.equal(core.paymentReport(booking.special_requests).transactionId,report.transactionId);
  assert.match(core.emailPayload(booking,'fixture').subject,/Payment Verification Request/);
  assert.match(core.telegramText(booking),/PAYMENT VERIFICATION REQUEST/);
  assert.match(core.telegramText(booking),/verification pending/);
  assert.match(core.emailPayload({...booking,special_requests:'Normal request'},'fixture').subject,/New Trip Booking Request/);
});
test('server enforces direct eligibility, amount and cutoff without trusting a payment report',async()=>{
  const {bookingFromCatalog,normalizeRequest}=await import('../supabase/functions/booking-request/core.mjs');
  const report={mode:'direct',type:'half',amount:2249.5,transactionId:'UPI123456789'};
  const request={trip_id:'demo',departure_label:'Oct 16-18, 2026',travellers:1,expected_total:4499,special_requests:options.reportText(report)};
  const catalog={trips:{demo:{title:'Demo',price:4499,active:true,departures:[{label:request.departure_label,date:'2026-10-16',dateKey:approvals[0].dateKey,cutoff:'2026-10-17T16:30:00Z'}]}},payment:{mode:'both',directDepartures:approvals},coupons:[]};
  const now=new Date('2026-10-14T00:00:00Z');
  assert.equal(bookingFromCatalog(request,catalog,now).subtotal,4499);
  assert.throws(()=>bookingFromCatalog(request,{...catalog,payment:{mode:'confirmation'}},now),/direct_payment_unavailable/);
  assert.throws(()=>bookingFromCatalog({...request,special_requests:options.reportText({...report,amount:1})},catalog,now),/quote_changed/);
  assert.throws(()=>bookingFromCatalog(request,catalog,new Date('2026-11-01')),/departure_unavailable/);
});
