const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const projectRoot = path.resolve(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

function loadCommonData(relativePath) {
    const source = read(relativePath);
    const context = {};
    vm.runInNewContext(
        `${source}\n;globalThis.__commonData = { commonCancellationPolicy, commonGuidelines, commonFAQs };`,
        context,
        { filename: relativePath, timeout: 2000 },
    );
    return JSON.parse(JSON.stringify(context.__commonData));
}

const expectedPolicy = [
    { days: '6+ days before departure', refund: '25%' },
    { days: '4 days before departure', refund: '50%' },
    { days: '< 3 days before departure', refund: '100%' },
];

test('all managed website data copies use the requested cancellation fees', () => {
    for (const relativePath of ['js/trips-data.js', 'App/js/trips-data.js']) {
        const { commonCancellationPolicy, commonFAQs } = loadCommonData(relativePath);
        assert.deepEqual(
            commonCancellationPolicy.map(({ days, refund }) => ({ days, refund })),
            expectedPolicy,
            `${relativePath} has stale cancellation tiers`,
        );

        const cancellationFaq = commonFAQs.find(({ q }) => /cancel my booking/i.test(q));
        assert.ok(cancellationFaq, `${relativePath} is missing the cancellation FAQ`);
        assert.match(cancellationFaq.a, /25% fee \(6\+ days before departure\)/);
        assert.match(cancellationFaq.a, /50% fee \(4 days before departure\)/);
        assert.match(cancellationFaq.a, /100% fee \(< 3 days before departure\)/);
    }
});

test('public cancellation copy is consistent and rendered as fees', () => {
    const contact = read('contact.html');
    const tripDetail = read('trip-detail.html');
    const androidContext = read('App/ANDROID_APP_CONTEXT.md');

    assert.match(contact, /6\+ days before departure — 25%/);
    assert.match(contact, /4 days before departure — 50%/);
    assert.match(contact, /less than 3 days before departure — 100%/);
    assert.match(tripDetail, /Cancellation Fee: \$\{policy\.refund\}/);
    assert.match(androidContext, /\| 6\+ days \| 25% \|/);
    assert.match(androidContext, /\| 4 days \| 50% \|/);
    assert.match(androidContext, /\| < 3 days \| 100% \|/);

    for (const source of [read('js/trips-data.js'), read('App/js/trips-data.js'), contact]) {
        assert.doesNotMatch(source, /70% fee|80% refund|3-6 days before trip|0-2 days before trip/);
    }
});

test('travel arrangements use the conditional AC or NON AC wording', () => {
    for (const relativePath of ['js/trips-data.js', 'App/js/trips-data.js']) {
        const { commonGuidelines } = loadCommonData(relativePath);
        const travel = commonGuidelines.find(({ title }) => title === 'Travel Arrangements');
        assert.ok(travel, `${relativePath} is missing Travel Arrangements`);
        assert.match(travel.desc, /Travel will be AC or NON AC based on conditions\./);
        assert.doesNotMatch(travel.desc, /AC will be on from 7 AM|Night travel is non-AC/);
    }

    assert.match(
        read('trip-detail.html'),
        /transportation \(AC or NON AC based on conditions\)/,
    );
});

test('every page that loads trip data uses the same refreshed cache key', () => {
    const cacheKeys = ['index.html', 'trips.html', 'trip-detail.html', 'checkout.html']
        .map((relativePath) => {
            const match = read(relativePath).match(/js\/trips-data\.js\?v=(\d+)/);
            assert.ok(match, `${relativePath} must load a versioned trips-data.js`);
            return match[1];
        });

    assert.equal(new Set(cacheKeys).size, 1);
    assert.notEqual(cacheKeys[0], '1767556524');
});
