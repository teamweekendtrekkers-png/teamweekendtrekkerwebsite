// Per-trip packing items and audience tags. Empty lists retain legacy defaults.
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.TripDetailLists = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const defaults = Object.freeze({
        thingsToCarry: Object.freeze([
            'Trekking shoes', '2L water bottle', 'Torch/Headlamp', 'Warm jacket',
            'ID proof (original)', 'Energy bars/snacks', 'Personal medicines', 'Camera (optional)',
        ]),
        perfectFor: Object.freeze(['Solo Travelers', 'Friends', 'First Timers', 'Family']),
    });

    const carryIcons = [
        [/shoe|boot/i, 'fa-shoe-prints'],
        [/water|bottle|hydrat/i, 'fa-tint'],
        [/torch|headlamp|flashlight/i, 'fa-lightbulb'],
        [/jacket|raincoat|poncho|clothes|clothing/i, 'fa-vest'],
        [/\bid\b|identity|passport/i, 'fa-id-card'],
        [/snack|energy bar|food/i, 'fa-cookie'],
        [/medicin|first aid/i, 'fa-capsules'],
        [/camera/i, 'fa-camera'],
    ];
    const audienceIcons = [
        [/solo/i, 'fa-user'],
        [/friend|group|team/i, 'fa-user-friends'],
        [/first timer|beginner/i, 'fa-star'],
        [/famil/i, 'fa-home'],
    ];

    function getItems(trip, field) {
        const values = trip && trip[field];
        const items = Array.isArray(values)
            ? Array.from(values).filter(value => typeof value === 'string').map(value => value.trim()).filter(Boolean)
            : [];
        return items.length ? items : [...defaults[field]];
    }

    function iconFor(label, field) {
        const rules = field === 'thingsToCarry' ? carryIcons : audienceIcons;
        const match = rules.find(([pattern]) => pattern.test(label));
        return match ? match[1] : (field === 'thingsToCarry' ? 'fa-suitcase' : 'fa-users');
    }

    function renderList(document, containerId, trip, field, className) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const elements = getItems(trip, field).map(label => {
            const element = document.createElement('div');
            element.className = className;
            const icon = document.createElement('i');
            icon.className = `fas ${iconFor(label, field)}`;
            icon.setAttribute('aria-hidden', 'true');
            const text = document.createElement('span');
            // Labels are administrator input, never HTML.
            text.textContent = label;
            element.append(icon, text);
            return element;
        });
        container.replaceChildren(...elements);
    }

    function render(trip, document) {
        renderList(document, 'thingsToCarryGrid', trip, 'thingsToCarry', 'carry-item');
        renderList(document, 'suitableForGrid', trip, 'perfectFor', 'suitable-tag');
    }

    return { defaults, getItems, iconFor, render };
}));
