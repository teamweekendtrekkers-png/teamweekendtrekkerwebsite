const test = require('node:test');
const assert = require('node:assert/strict');
const discovery = require('../js/trip-discovery');
const settings = require('../js/homepage-settings');
const dates = require('../js/trip-date-utils');
const now = new Date('2026-08-13T12:00:00Z');
const trips = [
    { id: 'later', title: 'Coast & town', location: 'Gokarna', experience: 'beach', image: 'images/coast.jpg', price: '₹3,999', availableDates: ['Aug 21-23, 2026'], departureCity: 'Bengaluru' },
    { id: 'soon', title: 'Green hill', location: 'Coorg', experience: 'trek', image: 'images/hill.jpg', availableDates: ['Aug 14-16, 2026', 'Aug 21-23, 2026'] },
    { id: 'undated', title: 'Heritage', experience: 'heritage', featured: true, availableDates: [] },
    { id: 'inactive', title: 'Next season', isActive: false, featured: true, availableDates: ['Aug 14-16, 2026'] },
];
test('legacy config gains individually configurable safe discovery defaults', () => {
    assert.deepEqual(settings.normalize({version:1}).discovery, {enabled:true, showSearch:true, showExperienceFilter:true, showWeekendFilter:true});
    assert.deepEqual(settings.normalize({version:1, discovery:{enabled:false, showSearch:false, showExperienceFilter:'false', showWeekendFilter:false}}).discovery, {enabled:false, showSearch:false, showExperienceFilter:true, showWeekendFilter:false});
});
test('search, explicit experience and canonical departure filters compose without mutating trips', () => {
    const before = JSON.stringify(trips);
    assert.deepEqual(discovery.filterTrips(trips, {query:' BENGALURU ', experience:'beach', departure:'2026-08-21/2026-08-23'}, now).map(trip => trip.id), ['later']);
    assert.deepEqual(discovery.filterTrips(trips, {query:'Coorg', experience:'beach'}, now), []);
    assert.deepEqual(discovery.filterTrips(trips, {departure:'2026-08-14/2026-08-16'}, now).map(trip => trip.id), ['soon']);
    assert.equal(discovery.filterTrips(trips, {}, now).length, 3);
    assert.equal(discovery.filterTrips(trips, {showComingSoon:true}, now).length, 4);
    assert.equal(JSON.stringify(trips), before);
});
test('scheduled trips precede undated and inactive cards with stable ties', () => {
    const before = [...trips];
    assert.deepEqual(discovery.sortTrips(trips, now).map(trip => trip.id), ['soon','later','undated','inactive']);
    assert.deepEqual(trips, before);
    const tied = [{...trips[1], id:'a'}, {...trips[1],id:'b'}];
    assert.deepEqual(discovery.sortTrips(tied, now).map(trip => trip.id), ['a','b']);
});
test('departure choices deduplicate date variants, omit inactive/expired ranges and sort chronologically', () => {
    const input = trips.concat({...trips[1], availableDates:['Aug 14 – 16.2026','Aug 1-3, 2026','bad']});
    assert.deepEqual(discovery.departureOptions(input, now).map(range => range.key), ['2026-08-14/2026-08-16','2026-08-21/2026-08-23']);
    assert.equal(discovery.departureOptions([trips[1]], new Date('2026-08-16T18:29:59Z')).length, 2);
    assert.equal(discovery.departureOptions([trips[1]], new Date('2026-08-16T18:30:00Z')).length, 1);
});
test('curated homepage restrictions are applied before customer discovery and never bypassed', () => {
    const config = settings.normalize({version:1, upcomingBatches:{tripSelection:'selected',tripIds:['soon'],departureSelection:'selected',departures:[{tripId:'soon',date:'Aug 21-23, 2026'}]}});
    const curated = settings.selectedTrips(trips, config, now);
    assert.deepEqual(discovery.departureOptions(curated, now).map(range => range.key), ['2026-08-21/2026-08-23']);
    assert.deepEqual(discovery.filterTrips(curated, {experience:'beach'}, now), []);
    assert.deepEqual(dates.buildUpcomingBatches(discovery.filterTrips(curated, {departure:'2026-08-21/2026-08-23'}, now), now, 3)[0].trips.map(trip => trip.id), ['soon']);
});
test('experience is never guessed from a title and cover selection rejects unsafe URLs', () => {
    assert.equal(discovery.experience({title:'Mountain beach trek'}), 'other');
    assert.equal(discovery.experience({experience:'__proto__'}), 'other');
    assert.equal(discovery.imagePath({...trips[0],cardImage:'images/cover.webp'}), 'images/cover.webp');
    for (const cardImage of ['javascript:alert(1)', 'images/../secret', 'https://user:pass@example.com/a.jpg', 'images/a.jpg" onerror="evil()']) assert.equal(discovery.imagePath({...trips[0],cardImage}), 'images/coast.jpg');
    assert.equal(discovery.imagePath({image:'data:image/svg+xml,x'}), 'images/logo.jpg');
});
test('card rendering supports browsers without the ES2022 Object.hasOwn helper', () => {
    const vm = require('node:vm');
    const fs = require('node:fs');
    const context = vm.createContext({ TripDateUtils: dates, TripLinks: require('../js/trip-links'), URL });
    vm.runInContext('Object.hasOwn = undefined', context);
    vm.runInContext(fs.readFileSync(require.resolve('../js/trip-discovery'), 'utf8'), context);
    assert.equal(context.TripDiscovery.experience({experience:'beach'}), 'beach');
    assert.equal(context.TripDiscovery.experience({experience:'__proto__'}), 'other');
    assert.match(context.TripDiscovery.renderCard(trips[0], now), /Beaches/);
});
test('shared cards safely escape content, show per-person pricing and preserve selected departure links', () => {
    const html = discovery.renderCard({...trips[0], title:'<script>alert(1)</script>', cardSummary:'A & B', departureCity:'<Bengaluru>', cardImage:'images/cover.webp'}, now, {departure:'2026-08-21/2026-08-23'});
    assert.match(html, /&lt;script&gt;/); assert.doesNotMatch(html, /<script>/);
    assert.match(html, /A &amp; B/); assert.match(html, /Departs from &lt;Bengaluru&gt;/);
    assert.match(html, /src="images\/cover.webp"/); assert.match(html, /data-image-fallback="images\/coast.jpg"/);
    assert.match(html, /per person/); assert.match(html, /View Dates &amp; Details|View Dates & Details/);
    assert.match(html, /date=Aug%2021-23%2C%202026/);
    const legacy = discovery.renderCard({id:'legacy',title:'Legacy',image:'images/legacy.jpg', availableDates:[]}, now);
    assert.match(legacy, /New dates coming soon/); assert.doesNotMatch(legacy, /Moderate|Bengaluru/);
});
test('legacy trip type filters retain existing classification', () => {
    for (const [badge, category] of [['Trek','trek'],['Road Trip','roadtrip'],['Expedition','expedition'],['Backpacking','backpacking'],['Hill Station','backpacking'],['Adventure','trek'],['Backwater','backpacking'],['Trip','other']]) assert.equal(discovery.category({badge}), category);
});
test('cover image recovery tries main image then logo and stops after a missing final logo', () => {
    const listeners = new Map(), attempts = [];
    const image = {
        dataset:{imageFallback:'images/missing-main.jpg'}, complete:false, naturalWidth:0,
        getAttribute:() => 'images/missing-cover.jpg',
        set src(value) { attempts.push(value); },
        addEventListener(name, handler) { listeners.set(name,handler); },
        removeEventListener(name, handler) { if (listeners.get(name) === handler) listeners.delete(name); },
    };
    discovery.attachImageFallbacks({querySelectorAll:() => [image]});
    assert.equal(image.dataset.imageFallback,undefined);
    listeners.get('error')(); assert.deepEqual(attempts,['images/missing-main.jpg']);
    listeners.get('error')(); assert.deepEqual(attempts,['images/missing-main.jpg','images/logo.jpg']);
    listeners.get('error')(); assert.equal(listeners.size,0);
    assert.equal(attempts.length,2,'a missing logo must never create a retry loop');
});
test('successful main fallback removes listeners and never requests the logo', () => {
    const listeners = new Map(), attempts = [];
    const image = {
        dataset:{imageFallback:'images/main.jpg'}, complete:false, naturalWidth:0,
        getAttribute:() => 'images/missing-cover.jpg',
        set src(value) { attempts.push(value); },
        addEventListener(name, handler) { listeners.set(name,handler); },
        removeEventListener(name, handler) { if (listeners.get(name) === handler) listeners.delete(name); },
    };
    discovery.attachImageFallbacks({querySelectorAll:() => [image]});
    listeners.get('error')(); listeners.get('load')();
    assert.deepEqual(attempts,['images/main.jpg']); assert.equal(listeners.size,0);
});
