(function (root, factory) {
    const node = typeof module === 'object' && module.exports;
    const api = factory(node ? require('./trip-date-utils') : root.TripDateUtils, node ? require('./homepage-sections') : root.HomepageSections);
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.HomepageSettings = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function (dates, sections) {
    'use strict';
    const defaults = {
        version: 1,
        hero: {
            backgroundImage: 'images/wix/hero1.jpg', title: 'Explore. Travel. Experience.',
            tagline: '🧗 Trips | Tours | Unique Experiences 🏕️',
            description: 'A Travel community for the travellers, By the travellers'
        },
        upcomingBatches: {
            enabled: true, title: 'Upcoming Batches',
            subtitle: 'Plan your next escape with our nearest available trip dates',
            maxBatches: 3, tripSelection: 'all', tripIds: [], departureSelection: 'all', departures: [],
            fields: { price: true, status: true, weekday: true, location: false, duration: false, difficulty: false, image: false }
        }
    };
    const clone = value => JSON.parse(JSON.stringify(value));
    defaults.sections = clone(sections.defaults);
    function safeImage(value) {
        if (typeof value !== 'string' || /[\s"'()<>\\\u0000-\u001f]/.test(value)) return false;
        if (/^https:\/\/[^/]+\//i.test(value)) {
            try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; }
            catch (_) { return false; }
        }
        return /^images\/[A-Za-z0-9_./-]+$/.test(value) && !value.split('/').some(part => part === '..' || part === '.');
    }
    function normalize(raw) {
        if (!raw || raw.version !== 1) return clone(defaults);
        const result = clone(defaults);
        const hero = raw.hero || {};
        for (const key of ['title', 'tagline', 'description']) {
            if (typeof hero[key] === 'string' && hero[key].trim()) result.hero[key] = hero[key].trim();
        }
        if (safeImage(hero.backgroundImage)) result.hero.backgroundImage = hero.backgroundImage;
        const batches = raw.upcomingBatches || {};
        for (const key of ['title', 'subtitle']) {
            if (typeof batches[key] === 'string' && batches[key].trim()) result.upcomingBatches[key] = batches[key].trim();
        }
        if (typeof batches.enabled === 'boolean') result.upcomingBatches.enabled = batches.enabled;
        if (Number.isInteger(batches.maxBatches) && batches.maxBatches >= 1 && batches.maxBatches <= 12) result.upcomingBatches.maxBatches = batches.maxBatches;
        for (const key of ['tripSelection', 'departureSelection']) {
            if (['all', 'selected'].includes(batches[key])) result.upcomingBatches[key] = batches[key];
        }
        if (Array.isArray(batches.tripIds)) result.upcomingBatches.tripIds = [...new Set(batches.tripIds.filter(id => typeof id === 'string'))];
        if (Array.isArray(batches.departures)) result.upcomingBatches.departures = batches.departures.filter(item => item && typeof item.tripId === 'string' && typeof item.date === 'string' && dates.parseTripDateRange(item.date));
        for (const key of Object.keys(result.upcomingBatches.fields)) {
            if (batches.fields && typeof batches.fields[key] === 'boolean') result.upcomingBatches.fields[key] = batches.fields[key];
        }
        result.sections = sections.normalize(raw.sections, safeImage);
        return result;
    }
    function selectedTrips(trips, config, referenceDate) {
        const options = normalize(config).upcomingBatches;
        return trips.filter(trip => options.tripSelection === 'all' || options.tripIds.includes(trip.id)).map(trip => ({
            ...trip,
            availableDates: dates.getUpcomingDateRanges(trip, referenceDate).filter(range => options.departureSelection === 'all' || options.departures.some(item => item.tripId === trip.id && dates.parseTripDateRange(item.date).key === range.key)).map(range => range.originalLabel)
        }));
    }
    function buildBatches(trips, config, referenceDate) {
        const options = normalize(config).upcomingBatches;
        if (!options.enabled) return [];
        return dates.buildUpcomingBatches(selectedTrips(trips, config, referenceDate), referenceDate, options.maxBatches);
    }
    function apply(config, document) {
        const normalized = normalize(config);
        for (const [selector, value] of [
            ['.hero h1', normalized.hero.title], ['.hero-tagline', normalized.hero.tagline],
            ['.hero-desc', normalized.hero.description], ['#upcoming-batches-title', normalized.upcomingBatches.title],
            ['.upcoming-batches .section-subtitle', normalized.upcomingBatches.subtitle]
        ]) {
            const element = document.querySelector(selector);
            if (element) element.textContent = value;
        }
        const hero = document.querySelector('.hero');
        if (hero) {
            const images = [normalized.hero.backgroundImage];
            if (normalized.hero.backgroundImage !== defaults.hero.backgroundImage) images.push(defaults.hero.backgroundImage);
            hero.style.backgroundImage = images.map(path => `url("${path}")`).join(', ');
        }
        const section = document.querySelector('.upcoming-batches');
        if (section) section.hidden = !normalized.upcomingBatches.enabled;
        sections.apply(normalized.sections, document);
        return normalized;
    }
    async function load(fetcher) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            try {
                const response = await fetcher('js/homepage-config.json', { cache: 'no-cache', signal: controller.signal });
                return response.ok ? normalize(await response.json()) : clone(defaults);
            } finally { clearTimeout(timeout); }
        } catch (_) { return clone(defaults); }
    }
    return { defaults, normalize, safeImage, selectedTrips, buildBatches, apply, load };
}));
