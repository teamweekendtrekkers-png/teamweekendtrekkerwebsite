const test = require('node:test');
const assert = require('node:assert/strict');

const {
    parseTripDateRange,
    getUpcomingDateRanges,
    getTripDateTags,
    buildUpcomingBatches,
    renderTripDateTags
} = require('../js/trip-date-utils.js');

const referenceDate = new Date('2026-08-10T12:00:00+05:30');

test('parses same-month ranges and single-day departures', () => {
    const range = parseTripDateRange('Aug 07-09, 2026');
    const single = parseTripDateRange('Jan 04, 2026');

    assert.equal(range.startKey, '2026-08-07');
    assert.equal(range.endKey, '2026-08-09');
    assert.equal(range.shortLabel, 'Aug 7–9');
    assert.equal(range.fullLabel, 'AUG 7–9, 2026');

    assert.equal(single.startKey, '2026-01-04');
    assert.equal(single.endKey, '2026-01-04');
    assert.equal(single.shortLabel, 'Jan 4');
});

test('parses cross-month, cross-year and legacy punctuation formats', () => {
    const crossMonth = parseTripDateRange('Jan 31-Feb 02, 2026');
    const crossYear = parseTripDateRange('Dec 30-Jan 01, 2025-26');
    const legacyDot = parseTripDateRange('Dec 27-29.2026');
    const september = parseTripDateRange('Sept 11-14, 2026');

    assert.deepEqual(
        [crossMonth.startKey, crossMonth.endKey],
        ['2026-01-31', '2026-02-02']
    );
    assert.deepEqual(
        [crossYear.startKey, crossYear.endKey],
        ['2025-12-30', '2026-01-01']
    );
    assert.deepEqual(
        [legacyDot.startKey, legacyDot.endKey],
        ['2026-12-27', '2026-12-29']
    );
    assert.equal(september.fullLabel, 'SEP 11–14, 2026');
});

test('returns null for invalid or impossible dates', () => {
    assert.equal(parseTripDateRange('Dates coming soon'), null);
    assert.equal(parseTripDateRange('Feb 30-31, 2026'), null);
    assert.equal(parseTripDateRange(''), null);
});

test('filters expired dates and sorts future departures chronologically', () => {
    const trip = {
        isActive: true,
        availableDates: [
            'Sept 11-14, 2026',
            'Aug 07-09, 2026',
            'Aug 21-23, 2026',
            'Aug 14-16, 2026'
        ]
    };

    const dates = getUpcomingDateRanges(trip, referenceDate);

    assert.deepEqual(
        dates.map(date => date.startKey),
        ['2026-08-14', '2026-08-21', '2026-09-11']
    );
});

test('limits visible date tags and reports the remaining count', () => {
    const trip = {
        isActive: true,
        availableDates: [
            'Aug 14-16, 2026',
            'Aug 21-23, 2026',
            'Aug 28-30, 2026',
            'Sept 11-14, 2026'
        ]
    };

    const tags = getTripDateTags(trip, referenceDate, 3);

    assert.equal(tags.visible.length, 3);
    assert.equal(tags.remaining, 1);
    assert.deepEqual(
        tags.visible.map(date => date.shortLabel),
        ['Aug 14–16', 'Aug 21–23', 'Aug 28–30']
    );
});

test('groups active trips into normalized upcoming batches', () => {
    const trips = [
        {
            id: 'first',
            title: 'First Trip',
            price: '₹4199',
            location: 'Coorg',
            isActive: true,
            availableDates: ['Aug 14-16, 2026', 'Aug 21-23, 2026']
        },
        {
            id: 'second',
            title: 'Second Trip',
            price: '₹5999',
            location: 'Tamil Nadu',
            isActive: true,
            availableDates: ['Aug 14-16, 2026']
        },
        {
            id: 'inactive',
            title: 'Inactive Trip',
            price: '₹3999',
            isActive: false,
            availableDates: ['Aug 14-16, 2026']
        }
    ];

    const batches = buildUpcomingBatches(trips, referenceDate, 3);

    assert.equal(batches.length, 2);
    assert.equal(batches[0].dateLabel, 'AUG 14–16, 2026');
    assert.equal(batches[0].weekdayLabel, 'Friday Departures');
    assert.deepEqual(
        batches[0].trips.map(trip => trip.id),
        ['first', 'second']
    );
    assert.equal(batches[1].dateLabel, 'AUG 21–23, 2026');
});

test('renders accessible date tags without changing booking URLs', () => {
    const html = renderTripDateTags({
        id: 'coorg',
        isActive: true,
        availableDates: ['Aug 14-16, 2026', 'Aug 21-23, 2026']
    }, referenceDate);

    assert.match(html, /aria-label="Available trip dates"/);
    assert.match(html, /<time datetime="2026-08-14">Aug 14–16<\/time>/);
    assert.doesNotMatch(html, /checkout\.html/);
});

test('renders a calm fallback when a trip has no future dates', () => {
    const html = renderTripDateTags({
        isActive: true,
        availableDates: ['Jan 04, 2026']
    }, referenceDate);

    assert.match(html, /New dates coming soon/);
});
