'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('supabase/functions/booking-status/index.js', 'utf8');
const origin = 'https://www.teamweekendtrekkers.com';
const token = '98765432-1234-4123-8123-123456789abc';
const request = (body, headers = {origin}) => new Request('https://edge.example/', {
    method: 'POST', headers, body: JSON.stringify(body),
});

test('booking status requires a valid private key and returns only public-facing status', async () => {
    let handler;
    let fetched = 0;
    vm.runInNewContext(source, {
        Request, Response, URL, URLSearchParams, AbortSignal, TextDecoder,
        Deno: {
            env: {get: (key) => ({SUPABASE_URL:'https://db.example', SUPABASE_SERVICE_ROLE_KEY:'mock-private-key'})[key]},
            serve: (callback) => {handler = callback;},
        },
        fetch: async (url) => {
            fetched++;
            assert.equal(url.pathname, '/rest/v1/bookings');
            assert.equal(url.searchParams.get('idempotency_key'), 'eq.' + token);
            assert.equal(url.searchParams.get('limit'), '1');
            return Response.json([{
                booking_reference: 'TWT-TEST',
                booking_status: 'awaiting_payment',
                payment_review_status: 'pending',
                special_requests: '[TWT_PAYMENT:{"transactionId":"private"}]',
                phone: 'private',
            }]);
        },
    });
    assert.equal((await handler(request({reference: 'TWT-TEST'}))).status, 400);
    assert.equal((await handler(request({token}, {origin: 'https://other.example'}))).status, 403);
    assert.equal(fetched, 0);
    const response = await handler(request({token}));
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.deepEqual(await response.json(), {
        reference: 'TWT-TEST', bookingStatus: 'awaiting_payment', paymentReview: 'pending', paymentReported: true,
    });
    assert.equal(fetched, 1);
});
