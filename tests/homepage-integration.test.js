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
    const homepageRendererPosition = index.indexOf('js/homepage-trips.js');

    assert.match(index, /id="upcoming-batches-grid"/);
    assert.ok(dateUtilityPosition > -1);
    assert.ok(homepageRendererPosition > dateUtilityPosition);
});

test('homepage renderer keeps featured-trip selection and detail links intact', () => {
    const renderer = readProjectFile('js/homepage-trips.js');

    assert.match(renderer, /getFeaturedTrips\(\)/);
    assert.match(renderer, /trip-detail\.html\?trip=/);
    assert.doesNotMatch(renderer, /checkout\.html/);
});

test('all-trips page keeps filters and displays shared date tags', () => {
    const tripsPage = readProjectFile('trips.html');

    assert.match(tripsPage, /TripDateUtils\.renderTripDateTags\(trip\)/);
    assert.match(tripsPage, /function initFilters\(\)/);
    assert.match(tripsPage, /document\.addEventListener\('DOMContentLoaded', loadTrips\)/);
});

test('trip detail continues to populate dates and route bookings to checkout', () => {
    const tripDetail = readProjectFile('trip-detail.html');

    assert.match(tripDetail, /trip\.availableDates\.map\(date =>/);
    assert.match(tripDetail, /id="dateSelect"/);
    assert.match(tripDetail, /checkout\.html\?trip=\$\{tripId\}&date=\$\{encodeURIComponent\(date\)\}&people=\$\{people\}/);
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
