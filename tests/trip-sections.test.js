const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sections = require('../js/trip-sections');
const {readTripsData, renderTripPage, readSiteOrigin} = require('../scripts/generate-trip-pages');
const root = path.resolve(__dirname, '..');
const template = fs.readFileSync(path.join(root, 'trip-detail.html'), 'utf8');

function fixture() {
    const panels = sections.keys.map(key => ({dataset: {tripSection: key}, open: true}));
    const listeners = {};
    return {
        panels, listeners,
        document: {querySelectorAll: selector => {
            assert.equal(selector, 'details[data-trip-section]'); return panels;
        }},
        window: {addEventListener: (event, callback) => {
            assert.equal(listeners[event], undefined, 'printing listeners installed exactly once');
            listeners[event] = callback;
        }},
    };
}

test('legacy and malformed preferences collapse safely without mutating data', () => {
    for (const value of [undefined, null, false, 'about', {}, [], [123, 'unknown']]) {
        const trip = {expandedSections: value};
        const before = JSON.stringify(trip);
        assert.deepEqual(sections.expandedSections(trip), []);
        assert.equal(JSON.stringify(trip), before);
    }
    assert.deepEqual(sections.expandedSections(null), []);
});

test('all independent combinations of independent trip preferences are honored', () => {
    for (let mask = 0; mask < (1 << sections.keys.length); mask++) {
        const expanded = sections.keys.filter((_, index) => mask & (1 << index));
        const f = fixture();
        sections.apply({expandedSections: expanded}, f.document, f.window);
        assert.deepEqual(f.panels.map(panel => panel.open), sections.keys.map(key => expanded.includes(key)));
    }
    assert.deepEqual(sections.expandedSections({expandedSections: ['includes', 'about', 'about', 'unknown']}), ['about', 'includes']);
});

test('printing opens every section and restores visitor state even after cancellation', () => {
    const f = fixture();
    sections.apply({}, f.document, f.window);
    sections.apply({}, f.document, f.window); // No duplicate hooks.
    f.panels[1].open = true; // Visitor interaction, not the saved preference.
    f.listeners.beforeprint();
    f.listeners.beforeprint(); // Browsers may dispatch repeatedly.
    assert.ok(f.panels.every(panel => panel.open));
    f.listeners.afterprint();
    assert.deepEqual(f.panels.map(panel => panel.open), [false, true, false, false]);
    f.listeners.afterprint();
    f.panels[2].open = true;
    f.listeners.beforeprint(); f.listeners.afterprint();
    assert.deepEqual(f.panels.map(panel => panel.open), [false, true, true, false]);
});

test('native semantic controls are scoped away from itinerary, booking, and brochures', () => {
    assert.equal((template.match(/<details class="content-section trip-section"/g) || []).length, sections.keys.length);
    for (const key of sections.keys) assert.ok(template.includes(`data-trip-section="${key}" open>`));
    assert.match(template, /TripSections\.apply\(trip, document, window\)/);
    assert.ok(template.indexOf('src="js/trip-sections.js?v=1"') < template.indexOf('TripSections.apply'));
    assert.match(template, /<div class="itinerary-accordion">/);
    assert.match(template, /id="bookNowBtn"/);
    assert.match(template, /id="tripBrochureButton"/);
    const css = fs.readFileSync(path.join(root, 'css/trip-sections.css'), 'utf8');
    assert.match(css, /:focus-visible/);
    assert.match(css, /@media print/);
});

test('all published trips and generated routes retain their accordion preferences', () => {
    const trips = readTripsData(root);
    assert.ok(Object.keys(trips).length > 0);
    for (const [tripId, trip] of Object.entries(trips)) {
        const page = renderTripPage({template, tripId, trip, projectRoot: root, siteOrigin: readSiteOrigin(root)});
        assert.match(page, /css\/trip-sections.css/);
        assert.match(page, /js\/trip-sections.js/);
        const f = fixture(); sections.apply(trip, f.document, f.window);
        assert.deepEqual(f.panels.map(panel => panel.open), sections.keys.map(key => sections.expandedSections(trip).includes(key)));
    }
});
