// Native details/summary provide touch and keyboard controls without dependencies.
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.TripSections = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const keys = Object.freeze(['about', 'highlights', 'includes', 'thingsToCarry']);
    const installedWindows = new WeakSet();

    function expandedSections(trip) {
        const value = trip && trip.expandedSections;
        return Array.isArray(value) ? keys.filter(key => value.includes(key)) : [];
    }

    function apply(trip, document, window) {
        const expanded = expandedSections(trip);
        const panels = () => Array.from(document.querySelectorAll('details[data-trip-section]'));
        panels().forEach(panel => { panel.open = expanded.includes(panel.dataset.tripSection); });
        if (!window || installedWindows.has(window)) return;
        installedWindows.add(window);
        let saved = null;
        window.addEventListener('beforeprint', () => {
            if (saved) return;
            saved = panels().map(panel => [panel, panel.open]);
            saved.forEach(([panel]) => { panel.open = true; });
        });
        window.addEventListener('afterprint', () => {
            if (!saved) return;
            saved.forEach(([panel, open]) => { panel.open = open; });
            saved = null;
        });
    }

    return { keys, expandedSections, apply };
}));
