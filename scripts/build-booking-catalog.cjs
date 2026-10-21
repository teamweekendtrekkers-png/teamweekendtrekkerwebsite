'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const dates = require('../js/trip-date-utils.js');
const paymentOptions = require('../js/payment-options.js');
function validatePublicConfig(config) {
  if (!config.anonKey && config.enabled === false) return;
  let payload;
  try {payload=JSON.parse(Buffer.from(config.anonKey.split('.')[1], 'base64url').toString());}
  catch {throw new Error('Checkout requires the public anon JWT, never a secret key.');}
  if (payload.role !== 'anon' || payload.ref !== 'vdxunrhcahgkwtzvjjdj') throw new Error('Checkout key must be public and belong to this project.');
}
function buildCatalog(root) {
  validatePublicConfig(JSON.parse(fs.readFileSync(path.join(root, 'js/booking-config.json'), 'utf8')));
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(root, 'js/trips-data.js'), 'utf8') + '\nthis.catalogTrips = tripsData;', context, {timeout: 2000});
  const trips = {};
  for (const [id, trip] of Object.entries(context.catalogTrips)) {
    const price = Number(String(trip.price).replace(/[^\d.]/g, ''));
    if (!Number.isFinite(price) || price < 0) throw new Error('Invalid price for ' + id);
    const maxTravellers = trip.maxTravellers ?? 50;
    if (!Number.isInteger(maxTravellers) || maxTravellers < 1 || maxTravellers > 50) throw new Error('Invalid traveller limit for ' + id);
    trips[id] = {maxTravellers, title: trip.title.trim(), location: trip.location || '', price, active: trip.isActive !== false,
      departures: (trip.availableDates || []).filter(label => !(trip.closedDepartures || []).includes(dates.parseTripDateRange(label)?.key)).map(label => {
        const range = dates.parseTripDateRange(label);
        if (!range) throw new Error('Invalid departure for ' + id + ': ' + label);
        return {label, date: range.startKey, dateKey: range.key, cutoff: dates.bookingCutoff(trip, range).toISOString()};
      })};
  }
  const commerce = JSON.parse(fs.readFileSync(path.join(root, 'js/commerce-config.json'), 'utf8'));
  return {version: 1, trips, payment: paymentOptions.normalize(commerce.payment), showCoupons: commerce.showCoupons !== false, coupons: commerce.coupons || []};
}
if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  fs.writeFileSync(path.join(root, 'js/booking-catalog.json'), JSON.stringify(buildCatalog(root)) + '\n');
  console.log('Built booking catalogue from current trip and coupon settings.');
}
module.exports = {buildCatalog, validatePublicConfig};
