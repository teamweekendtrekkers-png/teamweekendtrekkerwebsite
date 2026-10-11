const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const decision = require('../js/trip-decision');
const {readTripsData, renderTripPage, readSiteOrigin} = require('../scripts/generate-trip-pages');
const root = path.resolve(__dirname, '..');
const template = fs.readFileSync(path.join(root, 'trip-detail.html'), 'utf8');
const now = new Date('2026-10-11T06:00:00Z');
const trip = {availableDates: ['Oct 9-11, 2026', 'Oct 16-18, 2026', 'Oct 30-Nov 1, 2026']};

test('departure matching accepts only canonical-equivalent stored upcoming ranges', () => {
    assert.equal(decision.matchingDeparture(trip, '  October 16 — 18.2026 ', now), 'Oct 16-18, 2026');
    assert.equal(decision.matchingDeparture(trip, 'Oct 30–Nov 1, 2026', now), 'Oct 30-Nov 1, 2026');
    assert.equal(decision.matchingDeparture(trip, 'Oct 9-11, 2026', now), null);
    for (const value of ['', null, 123, 'Oct 23-25, 2026', 'Oct 32-33, 2026',
        '<img src=x onerror=alert(1)>', 'Oct 16-18, 2026&people=99', 'x'.repeat(200)]) {
        assert.equal(decision.matchingDeparture(trip, value, now), null);
    }
    assert.equal(decision.matchingDeparture({...trip, isActive: false}, 'Oct 16-18, 2026', now), null);
    assert.equal(decision.matchingDeparture({availableDates: []}, 'Oct 16-18, 2026', now), null);
    assert.equal(decision.matchingDeparture({}, 'Oct 16-18, 2026', now), null);
});

test('departure matching expires exactly 24 hours after departure in India time', () => {
    const ending = {availableDates: ['Oct 9-11, 2026']};
    assert.equal(decision.matchingDeparture(ending, ending.availableDates[0], new Date('2026-10-10T16:29:59Z')), ending.availableDates[0]);
    assert.equal(decision.matchingDeparture(ending, ending.availableDates[0], new Date('2026-10-10T16:30:00Z')), null);
    assert.equal(decision.matchingDeparture(ending, ending.availableDates[0], new Date('2026-10-12T00:00:00Z')), null);
});

test('query parsing rejects ambiguous multiple dates and leaves unrelated parameters untouched', () => {
    const value = 'Oct 16–18, 2026';
    const search = `?trip=wayanad&date=${encodeURIComponent(value)}&people=2`;
    assert.equal(decision.queryDeparture(trip, search, now), 'Oct 16-18, 2026');
    assert.equal(decision.queryDeparture(trip, `${search}&date=${encodeURIComponent(value)}`, now), null);
    assert.equal(decision.queryDeparture(trip, '?people=2', now), null);
    assert.equal(decision.queryDeparture(trip, '?date=%E0%A4%A', now), null);
});

function documentFixture() {
    const elements = {};
    const element = id => elements[id] = {hidden: false, textContent: '',
        closest: () => elements[`${id}-item`] || null};
    for (const id of ['tripTitle', 'tripHeadingLocation', 'tripHeadingSummary', 'tripHeadingDeparture', 'tripSelectedDeparture']) element(id);
    for (const id of Object.keys(decision.factFields)) { element(id); elements[`${id}-item`] = {hidden: false}; }
    elements.dateSelect = {options: [{value: ''}, {value: 'Oct 16-18, 2026'}], value: '',
        listeners: [], addEventListener: (event, callback) => {
            assert.equal(event, 'change'); elements.dateSelect.listeners.push(callback);
        }};
    return {elements, getElementById: id => elements[id] || null};
}

test('heading input is text-only, optional metadata is additive, and absent facts are not invented', () => {
    const document = documentFixture();
    const data = {...trip, title: '<img src=x onerror=alert(1)>', location: 'Coorg, Karnataka',
        cardSummary: 'Waterfalls & weekend walks', departureCity: 'Bangalore', duration: '2D/1N', groupSize: 0};
    const before = JSON.stringify(data);
    decision.apply(data, document, {location: {search: '?date=Oct%2016%E2%80%9318%2C%202026'}}, now);
    assert.equal(document.elements.tripTitle.textContent, data.title);
    assert.equal(document.elements.tripHeadingSummary.textContent, data.cardSummary);
    assert.equal(document.elements.tripHeadingDeparture.textContent, 'Departing from Bangalore');
    assert.equal(document.elements.dateSelect.value, 'Oct 16-18, 2026');
    assert.equal(document.elements.tripSelectedDeparture.textContent, 'Selected departure: Oct 16-18, 2026');
    assert.equal(document.elements['glanceDuration-item'].hidden, false);
    assert.equal(document.elements['glanceGroupSize-item'].hidden, false);
    assert.equal(document.elements.glanceGroupSize.textContent, '0');
    assert.equal(document.elements['glanceAge-item'].hidden, true);
    assert.equal(document.elements['glanceAltitude-item'].hidden, true);
    assert.equal(JSON.stringify(data), before);
    decision.apply({}, document, {location: {search: ''}}, now);
    assert.equal(document.elements.tripHeadingSummary.hidden, true);
    assert.equal(document.elements.tripHeadingDeparture.hidden, true);
    assert.equal(document.elements.tripTitle.textContent, 'Trip details');
    assert.equal(document.elements.dateSelect.listeners.length, 1);
    document.elements.dateSelect.value = 'Oct 23-25, 2026';
    document.elements.dateSelect.listeners[0]();
    assert.equal(document.elements.tripSelectedDeparture.textContent, 'Selected departure: Oct 23-25, 2026');
    document.elements.dateSelect.value = '';
    document.elements.dateSelect.listeners[0]();
    assert.equal(document.elements.tripSelectedDeparture.hidden, true);
});

test('query cannot introduce options or select a departure not already in the dropdown', () => {
    const document = documentFixture();
    decision.apply(trip, document, {location: {search: '?date=Oct%2030-Nov%201%2C%202026'}}, now);
    assert.equal(document.elements.dateSelect.value, '');
    assert.equal(document.elements.dateSelect.options.length, 2);
    assert.equal(document.elements.tripSelectedDeparture.hidden, true);
});

test('template preserves transactional handlers while removing duplicated facts and fabricated discounts', () => {
    assert.equal((template.match(/<h1\b/g) || []).length, 1);
    assert.match(template, /<h1 id="tripTitle">/);
    assert.doesNotMatch(template, /class="overview-cards"|id="originalPrice"|id="discountBadge"|priceNum \* 1\.28/);
    assert.match(template, /Per person/);
    assert.match(template, /TripDecision\.apply\(trip, document, window\)/);
    assert.ok(template.indexOf('src="js/trip-date-utils.js"') < template.indexOf('src="js/trip-decision.js"'));
    for (const id of ['tripItinerary', 'tripIncludes', 'tripPickup', 'bookingCard']) assert.match(template, new RegExp(`id="${id}"`));
    assert.match(template, /option\.value = date/);
    assert.match(template, /option\.textContent = date/);
    assert.match(template, /New dates coming soon/);
    assert.match(template, /checkout\.html\?trip=\$\{tripId\}&date=\$\{encodeURIComponent\(date\)\}&people=\$\{people\}/);
    const trips = readTripsData(root);
    for (const [tripId, data] of Object.entries(trips)) {
        const page = renderTripPage({template, tripId, trip: data, projectRoot: root, siteOrigin: readSiteOrigin(root)});
        assert.match(page, /id="tripTitle"/);
        assert.match(page, /css\/trip-decision.css/);
        assert.match(page, /id="mobileBookBtn"/);
        assert.match(page, /id="tripBrochureButton"/);
    }
});
