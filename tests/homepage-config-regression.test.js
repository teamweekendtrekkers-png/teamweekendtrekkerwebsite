const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const settings = require('../js/homepage-settings');

test('published homepage choices load without resetting background or trip selections', async () => {
    const published = require('../js/homepage-config.json');
    const normalized = settings.normalize(published);
    assert.equal(normalized.hero.backgroundImage, published.hero.backgroundImage);
    assert.equal(normalized.upcomingBatches.tripSelection, published.upcomingBatches.tripSelection);
    assert.deepEqual(normalized.upcomingBatches.tripIds, published.upcomingBatches.tripIds);
    assert.deepEqual(await settings.load(async () => ({ok:true, json:async () => published})), normalized);
});

test('the whole homepage behavior suite passes even when published settings are customized', () => {
    // Isolated child process overrides only its cached JSON. Never write live or
    // working-tree content, and never weaken the behavior assertions themselves.
    const script = `
        const location = require.resolve('../js/homepage-config.json');
        const custom = structuredClone(require(location));
        custom.hero = {backgroundImage:'images/custom-home.jpg', title:'Custom title', tagline:'Different tagline', description:'Different description'};
        Object.assign(custom.upcomingBatches, {
            enabled:false, title:'Selected departures', subtitle:'Custom subtitle',
            maxBatches:8, tripSelection:'selected', tripIds:['customer-trip'],
            departureSelection:'selected', departures:[{tripId:'customer-trip', date:'Aug 21-23, 2026'}],
            fields:{price:false,status:false,weekday:false,location:true,duration:true,difficulty:true,image:true}
        });
        custom.sections = structuredClone(require('../js/homepage-sections').defaults);
        custom.sections.reviews.enabled = false;
        custom.sections.reviews.items = [];
        custom.sections.stats.items = [];
        custom.sections.whyUs.title = 'A custom promise';
        custom.sections.cta.title = 'A custom adventure';
        require.cache[location].exports = custom;
        require('./homepage-settings.test.js');
        require('./homepage-sections.test.js');
    `;
    const environment = {...process.env};
    // A child node:test run must select its own TAP reporter instead of
    // inheriting the parent runner's binary IPC serialization mode.
    delete environment.NODE_TEST_CONTEXT;
    const output = execFileSync(process.execPath, ['-e', script], {
        cwd: path.resolve(__dirname), encoding:'utf8', timeout:15000, env:environment,
    });
    assert.match(output, /# fail 0/);
    assert.match(output, /# pass 15/);
});
