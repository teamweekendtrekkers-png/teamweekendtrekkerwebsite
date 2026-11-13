const test=require('node:test'),assert=require('node:assert/strict');
const planner=require('../js/travel-planner'),discovery=require('../js/trip-discovery');
const now=new Date('2030-10-01T12:00:00Z');
test('calendar retains closed and sold-out status, deduplicates dates and excludes expired/inactive trips',()=>{
 const trips=[{id:'a',availableDates:['Oct 4-6, 2030','Oct 4-6, 2030','Sep 1-3, 2030'],soldOutDepartures:['2030-10-04/2030-10-06']},{id:'b',availableDates:['Oct 4-6, 2030'],closedDepartures:['2030-10-04/2030-10-06']},{id:'c',isActive:false,availableDates:['Oct 4-6, 2030']}];
 const before=JSON.stringify(trips),entries=planner.entries(trips,now);assert.equal(entries.length,2);assert.deepEqual(entries.map(item=>item.status.key),['sold-out','closed']);assert.equal(JSON.stringify(trips),before);
});
test('collection links use authored duration and exclude trips without bookable departures',()=>{
 const trips=[{id:'a',duration:'3D/2N',experience:'heritage',availableDates:['Oct 4-6, 2030']},{id:'b',duration:'2D/1N',experience:'trek',availableDates:['Oct 4-6, 2030']},{id:'c',duration:'4D/3N',isActive:false,availableDates:['Oct 4-6, 2030']}];
 assert.deepEqual(planner.collections(trips,discovery,now).find(item=>item.long).trips.map(item=>item.id),['a']);
 assert.deepEqual(discovery.filterTrips(trips,{collection:'long'},now).map(item=>item.id),['a']);
});
test('enquiry payload validates real phone and party size, bounds text and identifies requests without claiming bookings',()=>{
 const valid={name:'Test Traveller',phone:'+91 99999 99999',travellers:'6',type:'group',trip:'Kannur',date:'Flexible',notes:'x'.repeat(2000)};
 const payload=planner.enquiryPayload(valid);assert.equal(payload.phone,'919999999999');assert.match(payload.subject,/Custom group trip/);assert.match(payload.message,/Travellers: 6/);assert.ok(payload.message.length<1900);
 for(const change of [{name:'x'},{phone:'1234x567890'},{travellers:'0'},{travellers:'101'},{travellers:'1.5'}])assert.throws(()=>planner.enquiryPayload({...valid,...change}));
});
test('savings are genuine and never fabricated for equal, invalid or hidden original prices',()=>{
 assert.match(discovery.renderPrice({price:5999,originalPrice:6499}),/Save ₹500/);
 assert.doesNotMatch(discovery.renderPrice({price:5999,originalPrice:5999}),/Save/);
 assert.doesNotMatch(discovery.renderPrice({price:'Ask us',originalPrice:5999}),/Save/);
});
