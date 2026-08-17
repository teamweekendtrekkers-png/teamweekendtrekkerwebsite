const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
    escapeHtml,
    generateTripPages,
    readSiteOrigin,
    readTripsData,
    renderTripPage,
    validateTripId,
} = require('../scripts/generate-trip-pages');

const projectRoot = path.resolve(__dirname, '..');
const templatePath = path.join(projectRoot, 'trip-detail.html');
const managedTripDataPath = path.join(projectRoot, 'js', 'trips-data.js');
const managedFeaturedPath = path.join(projectRoot, 'js', 'featured-trips.js');

let temporaryRoot;
let outputDirectory;
let generatedPages;
let trips;
let siteOrigin;
let template;
let tripDataBeforeGeneration;
let featuredBeforeGeneration;

function read(relativePath) {
    return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

function headFrom(page) {
    const match = page.match(/<head>([\s\S]*?)<\/head>/i);
    assert.ok(match, 'generated page must contain a head element');
    return match[1];
}

function metadataFrom(page) {
    const match = page.match(/<!-- TRIP_META_START -->([\s\S]*?)<!-- TRIP_META_END -->/);
    assert.ok(match, 'generated page must contain a metadata block');
    return match[0];
}

test.before(() => {
    temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'twt-trip-pages-'));
    outputDirectory = path.join(temporaryRoot, 'trips');
    trips = readTripsData(projectRoot);
    siteOrigin = readSiteOrigin(projectRoot);
    template = fs.readFileSync(templatePath, 'utf8');
    tripDataBeforeGeneration = fs.readFileSync(managedTripDataPath, 'utf8');
    featuredBeforeGeneration = fs.readFileSync(managedFeaturedPath, 'utf8');
    generatedPages = generateTripPages({ projectRoot, outputDir: outputDirectory });
});

test.after(() => {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
});

test('generates one crawler-readable page for every managed trip', () => {
    const tripIds = Object.keys(trips);
    assert.equal(generatedPages.length, tripIds.length);
    assert.deepEqual(
        fs.readdirSync(outputDirectory).sort(),
        [...tripIds].sort(),
    );

    for (const tripId of tripIds) {
        const trip = trips[tripId];
        const pagePath = path.join(outputDirectory, tripId, 'index.html');
        const page = fs.readFileSync(pagePath, 'utf8');
        const head = headFrom(page);
        const metadata = metadataFrom(page);
        const pageUrl = `${siteOrigin}/trips/${encodeURIComponent(tripId)}/`;
        const imageUrl = new URL(`/${trip.image}`, siteOrigin).href;
        const expectedTitle = escapeHtml(`${trip.title.trim()} - Team Weekend Trekkers`);

        assert.match(page, new RegExp(`data-trip-id="${tripId}"`));
        assert.match(head, /<base href="\.\.\/\.\.\/">/);
        assert.ok(head.indexOf('<base href="../../">') < head.indexOf('css/style.css'));
        assert.ok(metadata.includes(`<title>${expectedTitle}</title>`));
        assert.ok(metadata.includes(`<link rel="canonical" href="${pageUrl}">`));
        assert.ok(metadata.includes(`<meta property="og:url" content="${pageUrl}">`));
        assert.ok(metadata.includes(`<meta property="og:image" content="${imageUrl}">`));
        assert.ok(metadata.includes('<meta name="twitter:card" content="summary_large_image">'));
        assert.doesNotMatch(metadata, /Trip Details - Team Weekend Trekkers/);
    }
});

test('Rameshwaram source exposes Rameshwaram metadata without running JavaScript', () => {
    const page = fs.readFileSync(
        path.join(outputDirectory, 'rameshwaram-dhanushkodi', 'index.html'),
        'utf8',
    );
    const metadata = metadataFrom(page);

    assert.match(
        metadata,
        /<title>Rameshwaram-Dhanushkodi-Thanjavur - Team Weekend Trekkers<\/title>/,
    );
    assert.match(
        metadata,
        /<meta property="og:title" content="Rameshwaram-Dhanushkodi-Thanjavur - Team Weekend Trekkers">/,
    );
    assert.match(
        metadata,
        /https:\/\/www\.teamweekendtrekkers\.com\/trips\/rameshwaram-dhanushkodi\//,
    );
    assert.doesNotMatch(metadata, /Netravati Peak Trek/);
});

test('escapes manager-controlled metadata and supports app-style underscore IDs', () => {
    assert.equal(validateTripId('trip_1780000000000'), 'trip_1780000000000');

    const page = renderTripPage({
        template,
        tripId: 'trip_1780000000000',
        trip: {
            title: 'Rock & "Roll" <Trek>',
            about: "Line one\n<script>alert('x')</script> & more",
            image: 'images/logo.jpg',
        },
        projectRoot,
        siteOrigin,
    });
    const metadata = metadataFrom(page);

    assert.match(page, /data-trip-id="trip_1780000000000"/);
    assert.ok(metadata.includes('Rock &amp; &quot;Roll&quot; &lt;Trek&gt;'));
    assert.ok(metadata.includes('&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt; &amp; more'));
    assert.doesNotMatch(metadata, /<script>alert/);
});

test('rejects unsafe trip routes and non-local social images', () => {
    for (const tripId of [
        '',
        '../trip',
        'trip/path',
        'Trip',
        'trip%2fpath',
        'trip path',
        '__proto__',
        'constructor',
        'prototype',
    ]) {
        assert.throws(() => validateTripId(tripId), /trip ID|Reserved trip ID/);
    }

    assert.throws(
        () => renderTripPage({
            template,
            tripId: 'safe-trip',
            trip: {
                title: 'Safe Trip',
                about: 'Description',
                image: 'https://example.com/untrusted.jpg',
            },
            projectRoot,
            siteOrigin,
        }),
        /unsupported image path/,
    );
});

test('generation leaves the Flutter app managed data files untouched', () => {
    assert.equal(fs.readFileSync(managedTripDataPath, 'utf8'), tripDataBeforeGeneration);
    assert.equal(fs.readFileSync(managedFeaturedPath, 'utf8'), featuredBeforeGeneration);
});

test('deployment generates trip pages before uploading the Pages artifact', () => {
    const workflow = read('.github/workflows/validate.yml');
    const generationStep = workflow.indexOf('node scripts/generate-trip-pages.js');
    const uploadStep = workflow.indexOf('uses: actions/upload-pages-artifact@v3');

    assert.ok(generationStep >= 0, 'deployment must run the trip-page generator');
    assert.ok(uploadStep > generationStep, 'generation must happen before artifact upload');
});
