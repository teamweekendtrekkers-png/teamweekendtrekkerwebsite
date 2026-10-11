// Small, additive trip-page improvements; checkout and payment handlers stay unchanged.
(function (root, factory) {
    const api = factory(typeof module === 'object' && module.exports
        ? require('./trip-date-utils') : root.TripDateUtils);
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.TripDecision = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function (dates) {
    'use strict';

    const installedDocuments = new WeakSet();
    const installedDateSelects = new WeakSet();
    const factFields = Object.freeze({
        glanceDuration: 'duration', glanceDifficulty: 'difficulty', glanceAltitude: 'elevation',
        glanceLocation: 'location', glanceDistance: 'distance', glanceAge: 'ageRange',
        glanceGroupSize: 'groupSize', glanceBestTime: 'bestTime',
    });

    function stringValue(value) {
        return typeof value === 'string' ? value.trim() : '';
    }

    function matchingDeparture(trip, candidate, referenceDate) {
        if (!dates || typeof candidate !== 'string' || candidate.length > 160) return null;
        const requested = dates.parseTripDateRange(candidate);
        if (!requested) return null;
        // India-local expiration, inactive trips and duplicate ranges use the same
        // rules as the homepage. Return the stored label, not a rewritten date.
        const match = dates.getUpcomingDateRanges(trip, referenceDate)
            .find(range => range.key === requested.key);
        return match ? match.originalLabel : null;
    }

    function queryDeparture(trip, search, referenceDate) {
        const values = new URLSearchParams(search || '').getAll('date');
        return values.length === 1 ? matchingDeparture(trip, values[0], referenceDate) : null;
    }

    function setOptionalText(document, id, text) {
        const element = document.getElementById(id);
        if (!element) return;
        element.textContent = text;
        element.hidden = !text;
    }

    function installShortcuts(document) {
        if (installedDocuments.has(document)) return;
        const nav = document.getElementById('tripSectionLinks');
        if (!nav) return;
        installedDocuments.add(document);
        nav.addEventListener('click', event => {
            const link = event.target.closest('a[href*="#"]');
            if (!link || !nav.contains(link)) return;
            const target = document.getElementById(new URL(link.href, document.baseURI).hash.slice(1));
            // Leave native anchor/keyboard navigation intact while revealing
            // the content of the independently collapsible inclusions panel.
            if (target && target.tagName === 'DETAILS') target.open = true;
        });
    }

    function apply(trip, document, window, referenceDate) {
        const currentTrip = trip || {};
        const title = document.getElementById('tripTitle');
        if (title) title.textContent = stringValue(currentTrip.title) || 'Trip details';
        setOptionalText(document, 'tripHeadingLocation', stringValue(currentTrip.location));
        setOptionalText(document, 'tripHeadingSummary', stringValue(currentTrip.cardSummary));
        const city = stringValue(currentTrip.departureCity);
        setOptionalText(document, 'tripHeadingDeparture', city ? `Departing from ${city}` : '');
        for (const [id, field] of Object.entries(factFields)) {
            const value = document.getElementById(id);
            if (!value) continue;
            const configured = currentTrip[field];
            const present = (typeof configured === 'string' && configured.trim()) ||
                (typeof configured === 'number' && Number.isFinite(configured));
            const item = value.closest('.glance-item');
            if (item) item.hidden = !present;
            if (present) value.textContent = String(configured).trim();
        }
        const dateSelect = document.getElementById('dateSelect');
        const selection = queryDeparture(currentTrip, window && window.location.search, referenceDate);
        if (dateSelect && selection !== null && Array.from(dateSelect.options).some(option => option.value === selection)) {
            dateSelect.value = selection;
        }
        const syncSelection = () => setOptionalText(document, 'tripSelectedDeparture', dateSelect && dateSelect.value
            ? `Selected departure: ${dateSelect.value}` : '');
        syncSelection();
        if (dateSelect && !installedDateSelects.has(dateSelect)) {
            installedDateSelects.add(dateSelect);
            dateSelect.addEventListener('change', syncSelection);
        }
        installShortcuts(document);
    }

    return { factFields, matchingDeparture, queryDeparture, apply };
}));
