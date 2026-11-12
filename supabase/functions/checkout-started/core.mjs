import {normalizeRequest, bookingFromCatalog, BookingError} from '../booking-request/core.mjs';

export function leadFromCatalog(body, catalog, now) {
  const request = normalizeRequest(body);
  if (request.special_requests.startsWith('[TWT_PAYMENT:')) throw new BookingError('invalid_request');
  const trip = catalog.trips?.[request.trip_id];
  const departure = trip?.departures?.find(d => d.label === request.departure_label);
  const payment = catalog.payment || {};
  const direct = payment.checkoutVersion === 2 ||
    (['direct', 'both'].includes(payment.mode) &&
      (payment.directDepartures || []).some(d => d.tripId === request.trip_id && d.dateKey === departure?.dateKey));
  if (!direct) throw new BookingError('direct_payment_unavailable', 409);
  // Validate the same quote and departure without creating a booking request.
  const allowed = {...catalog, payment: {...payment, requestTripIds: [request.trip_id]}};
  const lead = bookingFromCatalog(request, allowed, now);
  return {...lead, total_amount: lead.subtotal - lead.discount_amount};
}

export function leadTelegramText(lead) {
  return ['CHECKOUT STARTED — PAYMENT PENDING',
    lead.trip_name, lead.departure_label, 'Travellers: ' + lead.travellers,
    'Quoted total: INR ' + lead.total_amount, 'Name: ' + lead.full_name,
    'Phone: ' + lead.phone, 'Email: ' + lead.email,
    ...(lead.alternate_phone ? ['Alternate phone: ' + lead.alternate_phone] : []),
    'Coupon: ' + (lead.coupon_code || 'None'),
    'Payment has not been submitted. This is not a confirmed booking.'].join('\n');
}

export async function acceptLead(body, deps) {
  const lead = leadFromCatalog(body, await deps.catalog(), deps.now());
  const result = await deps.claim(lead, await deps.hash(JSON.stringify(lead)));
  if (result.send) {
    let status = 'unknown';
    try { status = await deps.send(result.lead.payload) ? 'sent' : 'failed'; }
    catch { /* A timeout may mean Telegram accepted it. Do not resend blindly. */ }
    await deps.finish(result.lead.idempotency_key, result.lead.attempts, status);
  }
  return {accepted: true};
}
