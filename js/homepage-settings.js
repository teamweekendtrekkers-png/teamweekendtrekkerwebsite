(function (root, factory) {
    const node = typeof module === 'object' && module.exports;
    const api = factory(node ? require('./trip-date-utils') : root.TripDateUtils, node ? require('./homepage-sections') : root.HomepageSections, node ? require('./footer-settings') : root.FooterSettings);
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.HomepageSettings = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function (dates, sections, footer) {
    'use strict';
    const defaults = {
        version: 1,
        tripGallery: { autoSlide: true, intervalSeconds: 5 },
        destinationSlider: { autoSlide: true, intervalSeconds: 5 },
        calendarHolidays: [{"date":"2026-12-25","name":"Christmas Day"},{"date":"2027-01-01","name":"New Year’s Day"},{"date":"2027-01-26","name":"Republic Day"}],
        tripDisplayOrder: { explore: [], weekend: [], all: [] },
        hero: {
            backgroundImage: 'images/wix/hero1.jpg', title: 'Explore. Travel. Experience.',
            tagline: '🧗 Trips | Tours | Unique Experiences 🏕️',
            description: 'A travel community for travellers, by travellers'
        },
        discovery: { enabled: true, showSearch: true, showExperienceFilter: true, showWeekendFilter: true },
        upcomingBatches: {
            enabled: true, title: 'Upcoming Batches',
            subtitle: 'Plan your next escape with our nearest available trip dates',
            maxBatches: 3, tripSelection: 'all', tripIds: [], departureSelection: 'all', departures: [],
            fields: { price: true, status: true, weekday: true, location: false, duration: false, difficulty: false, image: false }
        }
    };
    const presentation = typeof module === 'object' && module.exports ? require('./site-presentation') : globalThis.SitePresentation;
    defaults.presentation = presentation ? presentation.defaults : {};
    const pages = typeof module === 'object' && module.exports ? require('./website-pages') : globalThis.WebsitePages;
    defaults.pages = pages ? pages.defaults : {};
    const clone = value => JSON.parse(JSON.stringify(value));
    defaults.sections = clone(sections.defaults);
    defaults.footer = clone(footer.defaults);
    function safeImage(value) {
        if (typeof value !== 'string' || /[\s"'()<>\\\u0000-\u001f]/.test(value)) return false;
        if (/^https:\/\/[^/]+\//i.test(value)) {
            try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; }
            catch (_) { return false; }
        }
        return /^images\/[A-Za-z0-9_./-]+$/.test(value) && !value.split('/').some(part => part === '..' || part === '.');
    }
    function normalizeHolidays(raw) {
        if (!Array.isArray(raw)) return clone(defaults.calendarHolidays);
        const unique = new Map();
        for (const item of raw) {
            if (!item || typeof item.date !== 'string' || typeof item.name !== 'string') continue;
            const name = item.name.trim().slice(0, 80);
            if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) continue;
            const date = new Date(item.date + 'T00:00:00Z');
            if (!Number.isFinite(+date) || date.toISOString().slice(0, 10) !== item.date) continue;
            unique.set(item.date, {date: item.date, name});
        }
        return [...unique.values()].sort((a, b) => a.date.localeCompare(b.date));
    }
    function normalize(raw) {
        if (!raw || raw.version !== 1) return clone(defaults);
        const result = clone(defaults);
        for (const key of Object.keys(result.tripDisplayOrder)) {
            const list = raw.tripDisplayOrder?.[key];
            if (Array.isArray(list)) result.tripDisplayOrder[key] = [...new Set(list.filter(id => typeof id === "string" && /^[a-zA-Z0-9_-]+$/.test(id)))];
        }
        result.calendarHolidays = normalizeHolidays(raw.calendarHolidays);
        result.pages = pages ? pages.normalize(raw.pages) : {};
        const slider = raw.destinationSlider || {};
        if (typeof slider.autoSlide === 'boolean') result.destinationSlider.autoSlide = slider.autoSlide;
        if (Number.isInteger(slider.intervalSeconds) && slider.intervalSeconds >= 3 && slider.intervalSeconds <= 30) result.destinationSlider.intervalSeconds = slider.intervalSeconds;
        const gallery = raw.tripGallery || {};
        if (typeof gallery.autoSlide === 'boolean') result.tripGallery.autoSlide = gallery.autoSlide;
        if (Number.isInteger(gallery.intervalSeconds) && gallery.intervalSeconds >= 3 && gallery.intervalSeconds <= 30) result.tripGallery.intervalSeconds = gallery.intervalSeconds;
        const hero = raw.hero || {};
        for (const key of ['title', 'tagline', 'description']) {
            if (typeof hero[key] === 'string' && hero[key].trim()) result.hero[key] = hero[key].trim();
        }
        if (safeImage(hero.backgroundImage)) result.hero.backgroundImage = hero.backgroundImage;
        for (const key of Object.keys(result.discovery)) {
            if (raw.discovery && typeof raw.discovery[key] === 'boolean') result.discovery[key] = raw.discovery[key];
        }
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
        result.presentation = presentation ? presentation.normalize(raw.presentation) : {};
        result.sections = sections.normalize(raw.sections, safeImage);
        result.footer = footer.normalize(raw.footer);
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

            hero.style.backgroundImage = images.map(path => `url("${path}")`).join(', ');
        }
        const section = document.querySelector('.upcoming-batches');
        if (section) section.hidden = !normalized.upcomingBatches.enabled;
        sections.apply(normalized.sections, document);
        document.defaultView?.GoogleReviewFeed?.refresh(normalized, document);
        if (presentation) presentation.apply(normalized, document, typeof window !== 'undefined' ? window : null);
        return normalized;
    }
    async function load(fetcher) {
        const embedded = typeof document !== 'undefined' && document.getElementById('homepage-initial-config');
        if (embedded) { try { return normalize(JSON.parse(embedded.textContent)); } catch (_) {} }
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            try {
                const response = await fetcher('js/homepage-config.json', { cache: 'no-cache', signal: controller.signal });
                return response.ok ? normalize(await response.json()) : clone(defaults);
            } finally { clearTimeout(timeout); }
        } catch (_) { return clone(defaults); }
    }
    return { defaults, normalize, normalizeHolidays, safeImage, selectedTrips, buildBatches, apply, load };
}));
