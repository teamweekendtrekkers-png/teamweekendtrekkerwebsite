'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const dates = require('../js/trip-date-utils.js');
function buildCatalog(root) {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(root, 'js/trips-data.js'), 'utf8') + '\nthis.catalogTrips = tripsData;', context, {timeout: 2000});
  const trips = {};
  for (const [id, trip] of Object.entries(context.catalogTrips)) {
    const price = Number(String(trip.price).replace(/[^\d.]/g, ''));
    if (!Number.isFinite(price) || price < 0) throw new Error('Invalid price for ' + id);
    trips[id] = {title: trip.title.trim(), location: trip.location || '', price, active: trip.isActive !== false,
      departures: (trip.availableDates || []).map(label => {
        const range = dates.parseTripDateRange(label);
        if (!range) throw new Error('Invalid departure for ' + id + ': ' + label);
        return {label, date: range.startKey, cutoff: dates.bookingCutoff(trip, range).toISOString()};
      })};
  }
  const commerce = JSON.parse(fs.readFileSync(path.join(root, 'js/commerce-config.json'), 'utf8'));
  return {version: 1, trips, showCoupons: commerce.showCoupons !== false, coupons: commerce.coupons || []};
}
if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  fs.writeFileSync(path.join(root, 'js/booking-catalog.json'), JSON.stringify(buildCatalog(root)) + '\n');
  console.log('Built booking catalogue from current trip and coupon settings.');
}
module.exports = {buildCatalog};
