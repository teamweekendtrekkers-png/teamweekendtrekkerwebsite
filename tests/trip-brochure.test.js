const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { readTripsData, renderTripPage, readSiteOrigin } = require('../scripts/generate-trip-pages');
const brochure = require('../js/trip-brochure');
const root = path.resolve(__dirname, '..');
const referenceDate = new Date('2026-08-13T12:00:00Z');
const trip = () => ({ id: 'misty-hills', title: 'Misty Hills 🥾', location: 'Coorg', price: '₹3,499',
    duration: '2 days', difficulty: 'Easy', about: 'Clouds & coffee.', availableDates: ['Aug 14-16, 2026', 'Aug 21-23, 2026'],
    itinerary: [{ day: 'Day 0', title: 'Departure', description: 'Start here.', activities: ['Board at 9 PM', 'Welcome 🧭'] }, { day: 'Day 1', title: 'Trek', activities: ['See sunrise'] }],
    includes: ['Transport'], excludes: ['Lunch'], thingsToCarry: ['Raincoat'], perfectFor: ['Friends'],
    boardingLocations: [{ name: 'Majestic', time: '9 PM', landmark: 'Metro' }] });

test('brochure contains every itinerary activity in order, context, defaults, Unicode and contact', () => {
    const value = trip(), before = JSON.stringify(value);
    const model = brochure.buildModel(value, { referenceDate, whatsapp: '917019235581' });
    const content = model.blocks.map(block => block.text).join('\n');
    for (const text of ['Misty Hills 🥾', '₹3,499', 'Day 0: Departure', 'Start here.', 'Board at 9 PM', 'Welcome 🧭', 'Day 1: Trek', 'See sunrise', 'Transport', 'Lunch', 'Raincoat', 'Majestic — 9 PM — Metro', 'WhatsApp: +917019235581']) assert.ok(content.includes(text), text);
    assert.ok(content.indexOf('Board at 9 PM') < content.indexOf('See sunrise'));
    assert.equal(JSON.stringify(value), before);
    assert.equal(model.filename, 'misty-hills-brochure.pdf');
    assert.equal(model.bookingUrl, 'https://www.teamweekendtrekkers.com/trips/misty-hills/');
});

test('selected departures match normalized current ranges; expired/removed selections fall back safely', () => {
    const selected = brochure.buildModel(trip(), { referenceDate, selectedDate: 'Aug 21 – 23, 2026' });
    assert.ok(selected.blocks.some(block => block.text === 'Selected departure'));
    assert.ok(!selected.blocks.some(block => block.text === 'Aug 14–16, 2026'));
    for (const selectedDate of ['invalid', 'Aug 1-3, 2026', 'Sep 4-6, 2026']) {
        assert.ok(brochure.buildModel(trip(), { referenceDate, selectedDate }).blocks.some(block => block.text === 'Upcoming departures'));
    }
});

test('inactive and empty trips never advertise stale dates and do not require an itinerary', () => {
    for (const value of [{}, { ...trip(), isActive: false }, { ...trip(), availableDates: [] }]) {
        const content = brochure.buildModel(value, { referenceDate }).blocks.map(block => block.text).join('\n');
        assert.ok(content.includes('New dates coming soon'));
        assert.ok(content.includes('Trekking shoes') || content.includes('Raincoat'));
    }
    assert.ok(brochure.buildModel({}, { referenceDate }).blocks.some(block => block.text.includes('Detailed itinerary coming soon')));
    assert.ok(brochure.buildModel({ itinerary: [{ title: 'Arrival' }] }).blocks.some(block => block.text === 'Day 1: Arrival'));
});

test('unsafe labels remain text; filenames/links cannot contain paths or executable content', () => {
    const value = { ...trip(), id: '../evil)', title: '<script>alert(1)</script> / ..\\ trip', itinerary: [{ title: '<img onerror=evil>', activities: ['<script>evil</script>'] }] };
    const model = brochure.buildModel(value, { referenceDate });
    assert.ok(model.blocks.some(block => block.text.includes('<script>evil</script>')));
    assert.match(model.filename, /^[a-z0-9-]+\.pdf$/);
    assert.equal(model.bookingUrl, 'https://www.teamweekendtrekkers.com/trips.html');
    const source = fs.readFileSync(path.join(root, 'js/trip-brochure.js'), 'utf8');
    assert.ok(!source.includes('innerHTML'));
    assert.throws(() => brochure.buildModel({ title: 'x'.repeat(500001) }), /too large/);
});

test('line wrapping preserves paragraphs and unbroken Unicode strings without overflow', () => {
    const measure = value => Array.from(value).length;
    assert.deepEqual(brochure.wrap('one two\nthree\n\nfour', measure, 7), ['one two', 'three', '', 'four']);
    const source = 'A'.repeat(30) + '🧭'.repeat(4);
    const lines = brochure.wrap(source, measure, 8);
    assert.equal(lines.join(''), source);
    assert.ok(lines.every(line => measure(line) <= 8));
});

test('PDF page streams, xref offsets, clickable booking link and hostile URL fallback are valid', () => {
    const jpeg = new Uint8Array([255, 216, 255, 217]);
    const pdf = brochure.encodePdf([jpeg, jpeg], 'javascript:evil)');
    const source = Buffer.from(pdf).toString('latin1');
    assert.ok(source.startsWith('%PDF-1.4'));
    assert.match(source, /\/Count 2/);
    assert.match(source, /\/Filter \/DCTDecode/);
    assert.ok(!source.includes('javascript:'));
    const xref = Number(source.match(/startxref\n(\d+)/)[1]);
    assert.equal(source.slice(xref, xref + 4), 'xref');
    for (const [index, match] of [...source.matchAll(/^(\d{10}) 00000 n /gm)].entries()) {
        const offset = Number(match[1]); assert.ok(source.slice(offset).startsWith(`${index + 1} 0 obj\n`));
    }
    assert.throws(() => brochure.encodePdf([], ''), /1–100/);
    assert.throws(() => brochure.encodePdf([new Uint8Array([1, 2])], ''), /encode/);
});

test('brochure is wired into both legacy/generated pages without replacing booking actions', () => {
    const template = fs.readFileSync(path.join(root, 'trip-detail.html'), 'utf8');
    assert.match(template, /id="tripBrochureButton"/);
    assert.match(template, /id="tripBrochureDialog"/);
    assert.match(template, /onclick="return goToCheckout\(event\)"/);
    assert.match(template, /id="mobileBookBtn"/);
    assert.ok(template.indexOf('src="js/trip-date-utils.js"') < template.indexOf('src="js/trip-brochure.js"'));
    const page = renderTripPage({ template, tripId: 'misty-hills', trip: { ...trip(), image: 'images/logo.jpg' }, projectRoot: root, siteOrigin: readSiteOrigin(root) });
    assert.match(page, /<base href="\.\.\/\.\.\/">/);
    assert.match(page, /src="js\/trip-brochure.js"/);
});

test('all 25 authoritative trips build brochures without losing itinerary activities or mutating data', () => {
    const trips = readTripsData(root); assert.equal(Object.keys(trips).length, 25);
    for (const [id, data] of Object.entries(trips)) {
        const before = JSON.stringify(data), model = brochure.buildModel({ id, ...data }, { referenceDate });
        const body = model.blocks.map(block => block.text).join('\n');
        for (const day of data.itinerary || []) for (const activity of day.activities || []) assert.ok(body.includes(activity.trim()), `${id}: ${activity}`);
        assert.equal(JSON.stringify(data), before);
    }
});
