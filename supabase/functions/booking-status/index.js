const allowedOrigins = new Set(['https://www.teamweekendtrekkers.com', 'https://teamweekendtrekkers.com']);
const base = Deno.env.get('SUPABASE_URL') || '';
const key = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}').default ||
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async request => {
  const origin = request.headers.get('origin') || '';
  const headers = {
    'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin',
    'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : 'https://www.teamweekendtrekkers.com',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  const reply = (body, status = 200) => Response.json(body, {status, headers});
  if (!allowedOrigins.has(origin)) return reply({error: 'origin_not_allowed'}, 403);
  if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers});
  if (request.method !== 'POST') return reply({error: 'method_not_allowed'}, 405);
  const reader = request.body?.getReader();
  if (!reader) return reply({error: 'invalid_link'}, 400);
  let raw = '';
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const {value, done} = await reader.read();
      if (done) break;
      if (value.length > 256 || (raw += decoder.decode(value, {stream: true})).length > 256) {
        await reader.cancel();
        return reply({error: 'invalid_link'}, 400);
      }
    }
    const {token} = JSON.parse(raw + decoder.decode());
    if (typeof token !== 'string' || !uuid.test(token)) return reply({error: 'invalid_link'}, 400);
    if (!base || !key) return reply({error: 'service_unavailable'}, 503);
    const url = new URL('/rest/v1/bookings', base);
    url.search = new URLSearchParams({
      select: 'booking_reference,booking_status,payment_review_status,special_requests',
      idempotency_key: 'eq.' + token,
      limit: '1',
    }).toString();
    const auth = {apikey: key};
    if (key.startsWith('eyJ')) auth.Authorization = 'Bearer ' + key;
    const response = await fetch(url, {headers: auth, signal: AbortSignal.timeout(8000)});
    if (!response.ok) return reply({error: 'service_unavailable'}, 503);
    const [booking] = await response.json();
    if (!booking) return reply({error: 'not_found'}, 404);
    return reply({
      reference: booking.booking_reference,
      bookingStatus: booking.booking_status,
      paymentReview: booking.payment_review_status,
      paymentReported: booking.special_requests?.startsWith('[TWT_PAYMENT:') === true,
    });
  } catch (error) {
    return error instanceof SyntaxError || error instanceof TypeError && !raw
      ? reply({error: 'invalid_link'}, 400) : reply({error: 'service_unavailable'}, 503);
  }
});
