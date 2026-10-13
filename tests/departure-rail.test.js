const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const settings = require('../js/homepage-settings');
const dates = require('../js/trip-date-utils');
const discovery = require('../js/trip-discovery');

async function render(trips, config) {
    const grid = {innerHTML: '', querySelector: () => null};
    let ready;
    const document = {
        getElementById: id => id === 'upcoming-batches-grid' ? grid : null,
        querySelector: () => null,
        addEventListener: (_event, callback) => { ready = callback; },
    };
    class FixedDate extends Date {
        constructor(...args) { super(...(args.length ? args : ['2026-10-14T06:00:00Z'])); }
    }
    vm.runInNewContext(fs.readFileSync(require.resolve('../js/homepage-trips'), 'utf8'), {
        document, Date: FixedDate, tripsData: trips, TripDateUtils: dates, TripDiscovery: discovery,
        HomepageSettings: {...settings, load: async () => config, apply: () => {}},
        window: {fetch: async () => {}}, setInterval: () => {},
    });
    await ready();
    return grid.innerHTML;
}

test('departure rail exposes every eligible date in order without an initial-count limit', async () => {
    const availableDates = Array.from({length: 60}, (_, i) => {
        const date = new Date(Date.UTC(2026, 10, i + 1));
        return date.toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric', timeZone:'UTC'});
    });
    const config = structuredClone(settings.defaults);
    config.upcomingBatches.maxBatches = 1;
    const html = await render({a: {id:'a', title:'Trip A', isActive:true, availableDates:[...availableDates].reverse()}}, config);
    assert.equal((html.match(/class="departure-bar"/g) || []).length, 60);
    assert.ok(html.indexOf('Nov%201%2C%202026') < html.indexOf('Dec%2030%2C%202026'));
});

test('departure rail preserves manager selections and excludes expired and inactive trips', async () => {
    const config = structuredClone(settings.defaults);
    Object.assign(config.upcomingBatches, {tripSelection:'selected', tripIds:['a','inactive'], departureSelection:'selected', departures:[{tripId:'a',date:'Oct 16-18, 2026'},{tripId:'a',date:'Oct 1-3, 2026'},{tripId:'inactive',date:'Oct 16-18, 2026'}]});
    const html = await render({
        a: {id:'a', title:'Selected trip', isActive:true, availableDates:['Oct 23-25, 2026','Oct 1-3, 2026','Oct 16-18, 2026']},
        b: {id:'b', title:'Unselected trip', availableDates:['Oct 16-18, 2026']},
        inactive: {id:'inactive', title:'Inactive trip', isActive:false, availableDates:['Oct 16-18, 2026']},
    }, config);
    assert.equal((html.match(/class="departure-bar"/g) || []).length, 1);
    assert.match(html, /Oct%2016-18%2C%202026/);
    assert.doesNotMatch(html, /Oct%2023|Oct%201-3|Unselected trip|Inactive trip/);
});
