const test=require('node:test'),assert=require('node:assert/strict');
const dates=require('../js/trip-date-utils'),finder=require('../js/homepage-discovery'),discovery=require('../js/trip-discovery');
const reference=new Date('2026-12-31T20:00:00Z'); // Already January 1 in India.
const trips=[{id:'a',title:'Coast',experience:'beach',availableDates:['Jan 1-3, 2027','Jan 8-10, 2027']},{id:'b',title:'Hills',experience:'trek',availableDates:['Jan 1-3, 2027'],soldOutDepartures:['2027-01-01/2027-01-03']}];
test('finder windows use India time and handle month/year boundaries',()=>{
 const choices=finder.choices(reference);assert.equal(choices[3].value,'month:2027-01');
 assert.equal(new Date(dates.dateWindow('weekend',reference).start).toISOString().slice(0,10),'2027-01-01');
 assert.equal(new Date(dates.dateWindow('next-weekend',reference).start).toISOString().slice(0,10),'2027-01-08');
 assert.equal(dates.dateWindow('month:2027-13',reference),null);
 assert.equal(dates.dateWindow('month:2027-01',reference).end,Date.UTC(2027,1,1));
});
test('finder counts bookable departures rather than trips or sold-out dates',()=>{
 assert.equal(finder.matchingDepartures(trips,{when:'weekend',experience:'all'},reference,discovery),1);
 assert.equal(finder.matchingDepartures(trips,{when:'month:2027-01',experience:'beach'},reference,discovery),2);
 assert.equal(finder.matchingDepartures(trips,{when:'weekend',experience:'trek'},reference,discovery),0);
 assert.deepEqual(discovery.filterTrips(trips,{when:'next-weekend'},reference).map(trip=>trip.id),['a']);
});
test('departure labels require explicit confirmation and sold-out flags win',()=>{
 const key='2027-01-01/2027-01-03';
 assert.equal(dates.departureStatus({},key).key,'available');
 assert.equal(dates.departureStatus({confirmedDepartures:[key]},key).key,'confirmed');
 assert.equal(dates.departureStatus({confirmedDepartures:[key],soldOutDepartures:[key]},key).key,'sold-out');
 assert.equal(dates.unavailableDateLabel(trips[1],reference),'Sold out for current dates');
});
test('filtered cards show dates within the selected weekend',()=>{
 const html=discovery.renderCard(trips[0],reference,{when:'next-weekend'});
 assert.ok(html.includes('2027-01-08'));
 assert.ok(!html.includes('datetime="2027-01-01"'));
});
