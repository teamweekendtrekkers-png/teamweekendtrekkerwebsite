const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const settings = require('../js/homepage-settings');
const dates = require('../js/trip-date-utils');
// Fixed characterization fixture, never the manager-editable published content.
const defaults = require('./fixtures/homepage-defaults.json');
const now = new Date('2026-08-13T12:00:00Z');
const trips = [
    { id: 'a', title: 'Alpha <script>', price: '₹999', location: 'Hill & Lake', duration: '2 days', difficulty: 'Easy', image: 'images/a.jpg', availableDates: ['Aug 14-16, 2026', 'Aug 21-23, 2026', 'Aug 28-30, 2026', 'Sep 4-6, 2026'] },
    { id: 'b', title: 'Beta', price: '₹1,999', availableDates: ['Aug 14-16, 2026', 'Aug 21-23, 2026'] },
    { id: 'inactive', title: 'Inactive', isActive: false, availableDates: ['Aug 14-16, 2026'] },
];
const config = () => structuredClone(defaults);

test('fixed legacy defaults retain automatic first-three batches exactly', () => {
    // Existing config stays byte-for-byte unchanged; new sections get safe defaults.
    assert.deepEqual(settings.normalize(defaults), settings.defaults);
    assert.deepEqual(settings.buildBatches(trips, defaults, now), dates.buildUpcomingBatches(trips, now, 3));
    assert.deepEqual(settings.normalize(null), settings.defaults);
    assert.deepEqual(settings.normalize({ version: 2 }), settings.defaults);
});
test('selected trips filter by ID, preserve catalog ordering, and never mutate trips', () => {
    const before = JSON.stringify(trips), custom = config();
    custom.upcomingBatches.tripSelection = 'selected';
    custom.upcomingBatches.tripIds = ['b', 'inactive', 'missing'];
    assert.deepEqual(settings.buildBatches(trips, custom, now).map(batch => batch.trips.map(trip => trip.id)), [['b'], ['b']]);
    assert.equal(JSON.stringify(trips), before);
    custom.upcomingBatches.tripIds = [];
    assert.deepEqual(settings.buildBatches(trips, custom, now), []);
});
test('exact departures are trip-specific and match legacy date variants', () => {
    const custom = config();
    custom.upcomingBatches.departureSelection = 'selected';
    custom.upcomingBatches.departures = [
        { tripId: 'a', date: 'Aug 21–23.2026' }, { tripId: 'b', date: 'Aug 14-16, 2026' },
        { tripId: 'a', date: 'Aug 21-23, 2026' }, { tripId: 'missing', date: 'Aug 28-30, 2026' }
    ];
    assert.deepEqual(settings.buildBatches(trips, custom, now).map(batch => [batch.key, batch.trips.map(trip => trip.id)]), [
        ['2026-08-14/2026-08-16', ['b']], ['2026-08-21/2026-08-23', ['a']]
    ]);
    custom.upcomingBatches.tripSelection = 'selected'; custom.upcomingBatches.tripIds = ['a'];
    assert.equal(settings.buildBatches(trips, custom, now).length, 1);
});
test('expired, invalid and removed departures never reappear; ongoing India ranges remain', () => {
    const custom = config(); custom.upcomingBatches.departureSelection = 'selected';
    custom.upcomingBatches.departures = [{ tripId: 'a', date: 'Aug 14-16, 2026' }, { tripId: 'a', date: 'bad' }];
    assert.equal(settings.buildBatches(trips, custom, new Date('2026-08-16T18:29:59Z')).length, 1);
    assert.equal(settings.buildBatches(trips, custom, new Date('2026-08-16T18:30:00Z')).length, 0);
    assert.equal(settings.buildBatches([{ ...trips[0], availableDates: [] }], custom, now).length, 0);
});
test('batch count and section visibility are independent of catalog dates', () => {
    const custom = config(); custom.upcomingBatches.maxBatches = 1;
    assert.equal(settings.buildBatches(trips, custom, now).length, 1);
    custom.upcomingBatches.maxBatches = 12;
    assert.equal(settings.buildBatches(trips, custom, now).length, 4);
    custom.upcomingBatches.enabled = false;
    assert.deepEqual(settings.buildBatches(trips, custom, now), []);
});
test('background image validation rejects executable URLs, CSS injection and traversal', () => {
    for (const path of ['images/bg.jpg', 'images/trips/homepage_123.webp', 'https://example.com/photo.jpg?width=200']) assert.equal(settings.safeImage(path), true, path);
    for (const path of ['javascript:alert(1)', 'data:image/svg+xml,a', '//example.com/x', 'http://example.com/x', 'images/../secret', 'images/a.jpg")', 'https://user:pass@example.com/x', 'images/a\nb.jpg']) assert.equal(settings.safeImage(path), false, path);
});
test('hero and section copy use safe text and preserve action links', () => {
    const elements = new Map();
    const document = { querySelector(selector) { if (!elements.has(selector)) elements.set(selector, { style: {} }); return elements.get(selector); } };
    const custom = config(); custom.hero.title = '<img src=x onerror=alert(1)>';
    custom.hero.backgroundImage = 'images/new.jpg'; custom.upcomingBatches.enabled = false;
    settings.apply(custom, document);
    assert.equal(elements.get('.hero h1').textContent, custom.hero.title);
    assert.equal(elements.get('.hero').style.backgroundImage, 'url("images/new.jpg"), url("images/wix/hero1.jpg")');
    assert.equal(elements.get('.upcoming-batches').hidden, true);
    assert.equal([...elements.keys()].some(key => key.includes('buttons') || key.includes('href')), false);
});
test('404, API, JSON and offline errors fall back to legacy defaults', async () => {
    for (const fetcher of [async () => ({ ok: false }), async () => { throw Error('offline'); }, async () => ({ ok: true, json: async () => { throw Error('bad JSON'); } })]) {
        assert.deepEqual(await settings.load(fetcher), settings.defaults);
    }
    assert.deepEqual(await settings.load(async (url, options) => { assert.equal(url, 'js/homepage-config.json'); assert.equal(options.cache, 'no-cache'); return { ok: true, json: async () => defaults }; }), settings.defaults);
});
test('actual renderer respects detail toggles and retains featured cards / safe detail links', async () => {
    const custom = config(); Object.assign(custom.upcomingBatches.fields, { price: false, status: false, weekday: false, location: true, duration: true, difficulty: true, image: true });
    let ready;
    const grid = { innerHTML: '' }, featured = { innerHTML: '' };
    const document = { addEventListener(_, callback) { ready = callback; }, getElementById(id) { return id === 'upcoming-batches-grid' ? grid : featured; }, querySelector() { return { style: {} }; } };
    vm.runInNewContext(fs.readFileSync(require.resolve('../js/homepage-trips'), 'utf8'), {
        document, HomepageSettings: settings, TripDateUtils: dates, tripsData: { a: { ...trips[0], availableDates: ['Aug 14-16, 2099'] } },
        TripLinks: { detailUrl: id => `trips/${id}/` }, getFeaturedTrips: () => [], window: { fetch: async () => ({ ok: true, json: async () => custom }) }
    });
    await ready();
    assert.match(grid.innerHTML, /Alpha &lt;script&gt;/); assert.match(grid.innerHTML, /Hill &amp; Lake/);
    assert.match(grid.innerHTML, /2 days/); assert.match(grid.innerHTML, /images\/a.jpg/);
    assert.match(grid.innerHTML, /trips\/a\//);
    assert.doesNotMatch(grid.innerHTML, /batch-trip-price|batch-trip-status|batch-weekday/);
    assert.match(featured.innerHTML, /No featured trips/);
});
