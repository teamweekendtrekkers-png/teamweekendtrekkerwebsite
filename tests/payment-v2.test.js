'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const options=require('../js/payment-options'),dates=require('../js/trip-date-utils');
const profiles=[{id:'primary',upiId:'first@upi',receiverName:'First receiver',qrImage:'images/first.png'},{id:'backup',upiId:'second@upi',receiverName:'Second receiver',qrImage:'images/second.png'}];
test('switching profiles selects matching QR, ID and receiver without changing either saved profile',()=>{
 const payment={checkoutVersion:2,profiles,activeProfileId:'primary',showQr:true,upiId:'stale@upi',qrImage:'images/stale.png'};
 const snapshot=JSON.stringify(payment);
 for(const p of profiles){const actual=options.normalize({...payment,activeProfileId:p.id});assert.equal(actual.upiId,p.upiId);assert.equal(actual.receiverName,p.receiverName);assert.equal(actual.qrImage,p.qrImage);}
 assert.equal(JSON.stringify(payment),snapshot);
 const missing=options.normalize({...payment,activeProfileId:'missing'});assert.equal(missing.upiId,'');assert.equal(missing.qrImage,'');
});
test('every trip defaults to payment; availability requests are allowed only for selected trips',()=>{
 const p={checkoutVersion:2,mode:'direct',requestTripIds:['chosen']};
 assert.deepEqual(options.allowed(p,'other','2099-12-20/2099-12-22'),['direct']);
 assert.deepEqual(options.allowed(p,'chosen','2099-12-20/2099-12-22'),['direct','confirmation']);
});
test('closed departures are omitted and reopening retains the original date',()=>{
 const trip={isActive:true,availableDates:['Dec 20-22, 2099','Dec 27-29, 2099'],closedDepartures:['2099-12-20/2099-12-22']};
 assert.deepEqual(dates.getUpcomingDateRanges(trip,new Date('2099-12-01')).map(d=>d.originalLabel),['Dec 27-29, 2099']);
 assert.equal(dates.getUpcomingDateRanges({...trip,closedDepartures:[]},new Date('2099-12-01')).length,2);
});
test('server accepts payment on any bookable v2 trip and rejects unselected request-only submissions',async()=>{
 const {bookingFromCatalog}=await import('../supabase/functions/booking-request/core.mjs');
 const label='Dec 20-22, 2099',catalog={trips:{demo:{active:true,title:'Demo',price:4499,departures:[{label,date:'2099-12-20',dateKey:'2099-12-20/2099-12-22',cutoff:'2099-12-21T16:30:00Z'}]}},payment:{checkoutVersion:2,requestTripIds:[]},coupons:[]};
 const request={trip_id:'demo',departure_label:label,travellers:1,expected_total:4499,special_requests:''};
 const now=new Date('2099-12-01');
 assert.throws(()=>bookingFromCatalog(request,catalog,now),/booking_request_unavailable/);
 catalog.payment.requestTripIds=['demo'];assert.equal(bookingFromCatalog(request,catalog,now).subtotal,4499);
 const report={mode:'direct',type:'half',amount:2249.5,transactionId:'UPI123456789'};
 catalog.payment.requestTripIds=[];
 assert.equal(bookingFromCatalog({...request,special_requests:options.reportText(report)},catalog,now).subtotal,4499);
 assert.throws(()=>bookingFromCatalog({...request,special_requests:options.reportText({...report,amount:1})},catalog,now),/quote_changed/);
 assert.throws(()=>bookingFromCatalog({...request,special_requests:options.reportText(report)},catalog,new Date('2100-01-01')),/departure_unavailable/);
});
