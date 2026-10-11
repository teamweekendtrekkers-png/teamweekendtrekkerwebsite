const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');

function readProjectFile(relativePath) {
    return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

test('homepage loads tested date utilities before its trip renderer', () => {
    const index = readProjectFile('index.html');
    const dateUtilityPosition = index.indexOf('js/trip-date-utils.js');
    const tripLinksPosition = index.indexOf('js/trip-links.js');
    const homepageRendererPosition = index.indexOf('js/homepage-trips.js');

    assert.match(index, /id="upcoming-batches-grid"/);
    assert.ok(dateUtilityPosition > -1);
    assert.ok(tripLinksPosition > dateUtilityPosition);
    assert.ok(homepageRendererPosition > dateUtilityPosition);
    assert.ok(homepageRendererPosition > tripLinksPosition);
});

test('homepage renderer keeps featured-trip selection and detail links intact', () => {
    const renderer = readProjectFile('js/homepage-trips.js');

    assert.match(renderer, /getFeaturedTrips\(\)/);
    assert.match(renderer, /TripLinks\.detailUrl\(trip\.id\)/);
    assert.doesNotMatch(renderer, /trip-detail\.html\?trip=/);
    assert.doesNotMatch(renderer, /checkout\.html/);
});

test('all-trips page keeps filters and displays shared date tags', () => {
    const tripsPage = readProjectFile('trips.html');
    const discovery = readProjectFile('js/trip-discovery.js');
    assert.match(discovery, /dates\.renderTripDateTags\(/);
    assert.match(tripsPage, /<script src="js\/trip-links\.js"><\/script>/);
    assert.match(discovery, /links\.detailUrl\(trip\.id\)/);
    assert.match(discovery, /function initCatalog\(document\)/);
    assert.match(tripsPage, /id="show-coming-soon"/);
    assert.match(tripsPage, /id="trip-discovery-controls"/);
    assert.match(tripsPage, /js\/trip-discovery\.js/);
});

test('trip detail continues to populate dates and route bookings to checkout', () => {
    const tripDetail = readProjectFile('trip-detail.html');

    assert.match(tripDetail, /TripDateUtils\.getUpcomingDateRanges\(trip\)/);
    assert.match(tripDetail, /id="dateSelect"/);
    assert.match(tripDetail, /checkout\.html\?trip=\$\{tripId\}&date=\$\{encodeURIComponent\(date\)\}&people=\$\{people\}/);
    assert.match(tripDetail, /function redirectLegacyTripURL\(\)/);
    assert.match(tripDetail, /Object\.prototype\.hasOwnProperty\.call\(tripsData, tripId\)/);
});

test('deployment validation accepts a homepage with only external JavaScript', () => {
    const bash = process.platform === 'win32'
        ? path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Git', 'bin', 'bash.exe')
        : 'bash';
    const result = spawnSync(bash, ['./validate-website.sh'], {
        cwd: projectRoot,
        encoding: 'utf8',
        env: {
            ...process.env,
            PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH || ''}`
        }
    });

    assert.equal(
        result.status,
        0,
        `validate-website.sh failed:\n${result.stdout || ''}${result.stderr || ''}`
    );
});
