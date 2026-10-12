export class BookingError extends Error {
  constructor(code, status = 400) {super(code); this.code = code; this.status = status;}
}
const fail = () => {throw new BookingError('invalid_request');};
function text(value, limit, required = false) {
  if (typeof value !== 'string' || value.length > limit || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) fail();
  const result = value.trim(); if (required && !result) fail(); return result;
}
export function normalizeRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail();
  const request = {idempotency_key: text(body.idempotency_key, 36, true), trip_id: text(body.trip_id, 80, true),
    departure_label: text(body.departure_label,160,true),travellers:body.travellers,
    full_name:text(body.full_name,150,true),email:text(body.email,254,true).toLowerCase(),phone:text(body.phone,30,true),
    alternate_phone:text(body.alternate_phone || '',30),participant_names:body.participant_names,
    special_requests:text(body.special_requests || '',1500),coupon_code:text(body.coupon_code || '',50).toUpperCase(),expected_total:body.expected_total};
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(request.idempotency_key)
    || !/^[a-z0-9][a-z0-9_-]*$/.test(request.trip_id) || !Number.isInteger(request.travellers) || request.travellers<1 || request.travellers>50
    || /[\r\n\t]/.test(request.full_name) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email)
    || !/^\+?[\d ()-]{7,30}$/.test(request.phone) || request.phone.replace(/\D/g,'').length<7
    || (request.alternate_phone && !/^\+?[\d ()-]{7,30}$/.test(request.alternate_phone))
    || !Array.isArray(request.participant_names) || request.participant_names.length>50
    || !Number.isFinite(request.expected_total) || request.expected_total<0) fail();
  request.participant_names = request.participant_names.map(name=>text(name,150,true));
  return request;
}
export function bookingFromCatalog(request,catalog,now=new Date()) {
  const trip = Object.hasOwn(catalog.trips || {},request.trip_id) ? catalog.trips[request.trip_id] : null;
  const departure = trip?.departures?.find(item=>item.label===request.departure_label);
  if (!trip || !trip.active || !departure || !Number.isFinite(Date.parse(departure.cutoff)) || Date.parse(departure.cutoff)<=now.getTime()) {
    throw new BookingError('departure_unavailable',409);
  }
  if (!Number.isFinite(trip.price) || trip.price<0) throw new BookingError('service_unavailable',503);
  const subtotal = trip.price * request.travellers;
  let discount=0;
  if (request.coupon_code) {
    const coupon=catalog.showCoupons && catalog.coupons?.find(c=>String(c.code).trim().toUpperCase()===request.coupon_code);
    if (!coupon || coupon.enabled===false || (Array.isArray(coupon.tripIds) && coupon.tripIds.length && !coupon.tripIds.includes(request.trip_id))) throw new BookingError('quote_changed',409);
    for (const [field,expired] of [['startsAt',false],['expiresAt',true]]) {
      if (!coupon[field]) continue;
      const time=Date.parse(coupon[field]);
      if (!Number.isFinite(time) || (expired?now.getTime()>=time:now.getTime()<time)) throw new BookingError('quote_changed',409);
    }
    const value=Number(coupon.value);
    if (!Number.isFinite(value) || value<=0 || !['percent','fixed'].includes(coupon.type) || (coupon.type==='percent' && value>100)) throw new BookingError('quote_changed',409);
    discount=coupon.type==='percent'?subtotal*value/100:value;
    if (coupon.maxDiscount!==undefined && coupon.maxDiscount!==null && coupon.maxDiscount!=='') {
      const cap=Number(coupon.maxDiscount); if (!Number.isFinite(cap) || cap<=0) throw new BookingError('quote_changed',409); discount=Math.min(discount,cap);
    }
    discount=Math.min(subtotal,Math.round(discount*100)/100);
  }
  const total=Math.round((subtotal-discount)*100)/100;
  if (Math.abs(request.expected_total-total)>0.005) throw new BookingError('quote_changed',409);
  const {expected_total,...fields}=request;
  return {...fields,trip_name:trip.title,departure_date:departure.date,price_per_person:trip.price,subtotal,discount_amount:discount};
}
export function emailPayload(booking,key) {
  return {access_key:key,subject:'New Trip Booking Request: '+booking.trip_name,from_name:'Team Weekend Trekkers Website',
    'Booking Reference':booking.booking_reference,'Customer Name':booking.full_name,'Customer Email':booking.email,
    'Phone Number':booking.phone,'Alternate Phone':booking.alternate_phone || 'Not provided',
    'Trip Name':booking.trip_name,'Trip Date':booking.departure_label,'Number of People':booking.travellers,
    'Total Amount':'INR '+booking.total_amount,'Subtotal':booking.subtotal,'Coupon Code':booking.coupon_code || 'None',
    'Coupon Savings':booking.discount_amount,'Participant Names':booking.participant_names.join(', ') || 'Single participant',
    'Special Requests':booking.special_requests || 'None','Request Status':'Availability and payment confirmation pending',
    'Booking Time':booking.created_at};
}
export function telegramText(booking) {
  return ['NEW BOOKING REQUEST',booking.booking_reference,booking.trip_name,booking.departure_label,
    'Travellers: '+booking.travellers,'Quoted amount: INR '+booking.total_amount,
    'Contact: '+booking.full_name,'Phone: '+booking.phone,'Email: '+booking.email,
    'Coupon: '+(booking.coupon_code || 'None'),'Availability and payment confirmation pending'].join('\n');
}
export async function deliverNotifications(booking,deps) {
  await Promise.allSettled(['telegram','email'].map(async kind => {
    // Two immediate attempts for temporary errors; successful channels are never resent.
    for (let retry=0;retry<2;retry++) {
      const claimed=await deps.claim(booking.id,kind);
      if (!claimed) break;
      let sent=false,messageId=null,error='delivery_failed',temporary=false;
      try {
        const result=await deps.send(kind,claimed);
        sent=result.sent===true;messageId=result.messageId ?? null;temporary=result.temporary===true;
        error=result.error || error;
      } catch {error='delivery_response_unknown';}
      // A failed status write must not trigger another send: the provider may have accepted it.
      await deps.finish(claimed,kind,sent,messageId,sent?null:error);
      if (sent || !temporary) break;
      await deps.pause(600);
    }
  }));
}
export async function acceptRequest(body,deps) {
  const request=normalizeRequest(body);
  const hash=await deps.hash(JSON.stringify(request));
  const existing=await deps.find(request.idempotency_key);
  if (existing) {
    if (existing.request_hash!==hash) throw new BookingError('request_conflict',409);
    return {accepted:true,booking_reference:existing.booking_reference};
  }
  const booking=bookingFromCatalog(request,await deps.catalog(),deps.now());
  const result=await deps.accept(booking,hash,request.email+'|'+request.phone.replace(/\D/g,''));
  try {await deliverNotifications(result.booking,deps);} catch { /* Persisted request remains accepted; delivery leases allow later repair. */ }
  return {accepted:true,booking_reference:result.booking.booking_reference};
}
