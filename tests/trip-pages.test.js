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
        [...new Set(tripIds.flatMap(id => [id, trips[id].publicSlug || id, ...(trips[id].previousSlugs || [])]))].sort(),
    );

    for (const tripId of tripIds) {
        const trip = trips[tripId];
        const pagePath = path.join(outputDirectory, trips[tripId].publicSlug || tripId, 'index.html');
        const page = fs.readFileSync(pagePath, 'utf8');
        const head = headFrom(page);
        const metadata = metadataFrom(page);
        const pageUrl = `${siteOrigin}/trips/${encodeURIComponent(trips[tripId].publicSlug || tripId)}/`;
        const imageUrl = new URL(`/${trip.image}`, siteOrigin).href;
        const expectedTitle = escapeHtml(`${trip.title.trim()} - Team Weekend Trekkers`);

        assert.match(page, new RegExp(`data-trip-id="${tripId}"`));
        assert.ok(page.includes(`<h1 id="tripTitle">${escapeHtml(trip.title.trim())}</h1>`));
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
    assert.ok(page.includes('<h1 id="tripTitle">Rock &amp; &quot;Roll&quot; &lt;Trek&gt;</h1>'));
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

test('generated section shortcuts stay on their trip despite the root base URL', () => {
    const fragments = [...template.matchAll(/href="#([^"]+)"/g)].map(match => match[1]);
    assert.ok(fragments.includes('bookingCard'));
    assert.ok(fragments.includes('tripItinerary'));
    for (const tripId of Object.keys(trips)) {
        const page = fs.readFileSync(path.join(outputDirectory, trips[tripId].publicSlug || tripId, 'index.html'), 'utf8');
        const slug = trips[tripId].publicSlug || tripId;
        const pageUrl = new URL('/trips/' + slug + '/', siteOrigin);
        const baseUrl = new URL('../../', pageUrl);
        for (const fragment of fragments) {
            const href = 'trips/' + slug + '/#' + fragment;
            assert.ok(page.includes('href="' + href + '"'));
            const target = new URL(href, baseUrl);
            assert.equal(target.pathname, pageUrl.pathname);
            assert.equal(target.hash, '#' + fragment);
        }
    }
});
