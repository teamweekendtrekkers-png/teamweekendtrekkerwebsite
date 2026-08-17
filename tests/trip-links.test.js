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
