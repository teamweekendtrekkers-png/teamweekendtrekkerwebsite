// Per-trip packing items and audience tags. Empty lists retain legacy defaults.
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.TripDetailLists = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const defaults = Object.freeze({
        thingsToCarry: Object.freeze([
            'Comfortable walking shoes', 'Water bottle', 'Phone charger', 'Weather-appropriate clothes',
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
        [/power bank|charg/i, 'fa-battery-full'],
        [/cash|money/i, 'fa-money-bill-wave'],
        [/toiletr|soap|sunscreen/i, 'fa-soap'],
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
        return Array.isArray(values) ? items : [...defaults[field]];
    }

    function iconFor(label, field) {
        const rules = field === 'thingsToCarry' ? carryIcons : audienceIcons;
        const match = rules.find(([pattern]) => pattern.test(label));
        return match ? match[1] : (field === 'thingsToCarry' ? 'fa-suitcase' : 'fa-users');
    }

    function splitLegacyPackingItem(label) {
        // Existing structured items and ordinary multiline prose are unchanged.
        if (label.length < 200) return [label];
        const bullets = [...label.matchAll(/[•▪●]\s*(?=\S)/gu)].map(match => match.index);
        const lineBullets = [...label.matchAll(/(?:^|\n)[ \t]*(?:[-*]\s+|\d+[.)]\s+)/gu)]
            .map(match => match.index);
        // Only recognise an emoji when followed by a known packing-item label.
        // This avoids treating scenic/expressive emoji in arbitrary prose as bullets.
        const packingLabels = '(?:Small\\s+)?Backpack|(?:Good\\s+)?Trekking\\s+Shoes|Water\\s+Bottle|Raincoat|Extra(?:\\s+Pair\\s+of)?\\s+Clothes|Extra\\s+Socks|Flip[-\\s]?flops|Slippers|Power\\s+Bank|Mobile\\s+Charger|Phone\\s*&|Camera|(?:Extra\\s+)?Cash|Personal\\s+(?:Medicines|Toiletries)|Toiletries|(?:Plastic\\s+)?(?:Waterproof\\s*\\/\\s*)?Zip[-\\s]?lock\\s+Bags|Cap\\s*(?:&|\\/|$)|Sunglasses|Sunscreen|Energy\\s+Snacks|Small\\s+Waterproof\\s+Bags';
        const packingMarkers = new RegExp('(?:🎒|💧|🧥|👕|🧦|👟|🥾|🩴|📱|🔋|📷|📸|💵|💊|🧴|🛍|🧢|🕶|🩹|🗑|🌧)\\uFE0F?\\s*(?=' + packingLabels + ')', 'giu');
        const emojiBullets = [...label.matchAll(packingMarkers)].map(match => match.index);
        const boundaries = bullets.length >= 3 ? bullets : (lineBullets.length >= 3 ? lineBullets : emojiBullets);
        if (boundaries.length < 3) return [label];
        const notes = [...label.matchAll(/(?:✨\s*(?:Pack light|Travel light)|⚠️?\s*Trek Essentials)/giu)].map(match => match.index);
        const starts = [...new Set([0, ...boundaries, ...notes])].sort((left, right) => left - right);
        // Slices preserve every word, punctuation mark and emoji. No source data
        // is rewritten: this is a display-only repair for legacy pasted checklists.
        return starts.map((start, index) => label.slice(start, starts[index + 1]).trim()).filter(Boolean);
    }

    function getDisplayItems(trip, field) {
        const items = getItems(trip, field);
        return field === 'thingsToCarry' ? items.flatMap(splitLegacyPackingItem) : items;
    }

    function renderList(document, containerId, trip, field, className) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const elements = getDisplayItems(trip, field).map(label => {
            const element = document.createElement('div');
            const longPackingText = field === 'thingsToCarry' && (label.length > 220 || /^.{0,24}(?:things to carry|trip packing checklist|trek essentials|pack light|travel light)/iu.test(label));
            element.className = className + (longPackingText ? ' carry-item-long' : '');
            const icon = document.createElement('i');
            icon.className = `fas ${iconFor(label, field)}`;
            icon.setAttribute('aria-hidden', 'true');
            const text = document.createElement('span');
            // Labels are administrator input, never HTML.
            if(typeof TripText!=='undefined')TripText.set(text,label);else text.textContent = label;
            element.append(icon, text);
            return element;
        });
        container.replaceChildren(...elements);
    }

    function render(trip, document) {
        renderList(document, 'thingsToCarryGrid', trip, 'thingsToCarry', 'carry-item');
        renderList(document, 'suitableForGrid', trip, 'perfectFor', 'suitable-tag');
    }

    return { defaults, getItems, getDisplayItems, splitLegacyPackingItem, iconFor, render };
}));
