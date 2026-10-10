const test = require('node:test');
const assert = require('node:assert/strict');

const TripLinks = require('../js/trip-links');

test('uses generated social-preview routes on deployed websites', () => {
    assert.equal(
        TripLinks.detailUrl('rameshwaram-dhanushkodi', {
            protocol: 'https:',
            hostname: 'www.teamweekendtrekkers.com',
        }),
        'trips/rameshwaram-dhanushkodi/',
    );
    assert.equal(
        TripLinks.detailUrl('trip_123 & more', {
            protocol: 'https:',
            hostname: 'example.github.io',
        }),
        'trips/trip_123%20%26%20more/',
    );
});

test('keeps legacy query links in local and file previews', () => {
    for (const locationLike of [
        { protocol: 'http:', hostname: 'localhost' },
        { protocol: 'http:', hostname: '127.0.0.1' },
        { protocol: 'http:', hostname: '0.0.0.0' },
        { protocol: 'http:', hostname: '[::1]' },
        { protocol: 'file:', hostname: '' },
    ]) {
        assert.equal(
            TripLinks.detailUrl('wayanad-pool-party', locationLike),
            'trip-detail.html?trip=wayanad-pool-party',
        );
    }
});

test('departure links preserve original labels and use the correct query separator', () => {
    const date = 'Oct 30–Nov 1, 2026';
    assert.equal(TripLinks.departureUrl('wayanad', date, { protocol: 'https:', hostname: 'example.com' }),
        'trips/wayanad/?date=Oct%2030%E2%80%93Nov%201%2C%202026');
    assert.equal(TripLinks.departureUrl('wayanad', date, { protocol: 'http:', hostname: 'localhost' }),
        'trip-detail.html?trip=wayanad&date=Oct%2030%E2%80%93Nov%201%2C%202026');
    for (const value of ['', ' ', null, undefined, 123]) {
        assert.equal(TripLinks.departureUrl('wayanad', value), TripLinks.detailUrl('wayanad'));
    }
    const url = new URL(TripLinks.departureUrl('a & b', 'Oct 16-18, 2026&people=99#x', { protocol: 'https:', hostname: 'example.com' }), 'https://example.com/');
    assert.equal(url.searchParams.get('date'), 'Oct 16-18, 2026&people=99#x');
    assert.equal(url.searchParams.has('people'), false);
    assert.equal(url.hash, '');
});
