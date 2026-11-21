(function () {
    'use strict';
    const fields = [
        {key: 'name', label: 'Full name', type: 'text', maxLength: 150, autocomplete: 'name'},
        {key: 'age', label: 'Age', type: 'number', min: 0, max: 120, step: 1},
        {key: 'phone', label: 'Phone number', type: 'tel', maxLength: 30, pattern: '\\+?[0-9 \(\)\-]{10,30}', autocomplete: 'tel'},
        {key: 'email', label: 'Email address', type: 'email', maxLength: 254, autocomplete: 'email'}
    ];
    const contactFields = {name: 'fullName', phone: 'phone', email: 'email'};
    const edited = new Set();
    let solo = false;
    function syncContact() {
        if (!solo) return;
        for (const [key, id] of Object.entries(contactFields)) {
            const field = document.getElementById('traveller-1-' + key);
            if (field && !edited.has(key)) field.value = document.getElementById(id).value;
        }
    }
    function contactChanged(event) {
        for (const [key, id] of Object.entries(contactFields)) {
            if (event.target.id === 'traveller-1-' + key) edited.add(key);
            if (event.target.id === id) syncContact();
        }
    }
    document.addEventListener('input', contactChanged);
    document.addEventListener('change', contactChanged);
    function button(label, action) {
        const element = document.createElement('button');
        element.type = 'button';
        element.className = 'traveller-action';
        element.textContent = label;
        element.addEventListener('click', action);
        return element;
    }
    function addField(parent, input, label, index, key) {
        input.id = 'traveller-' + index + '-' + key;
        input.dataset.label = label.toLowerCase();
        input.required = true;
        const wrapper = document.createElement('div');
        wrapper.className = 'form-group';
        const caption = document.createElement('label');
        caption.htmlFor = input.id;
        caption.textContent = label;
        wrapper.append(caption, input);
        parent.append(wrapper);
    }
    function read() {
        return Array.from(document.querySelectorAll('#travellerCards fieldset'), card => {
            const value = key => card.querySelector('[id$="-' + key + '"]')?.value.trim() || '';
            return {name: value('name'), age: Number(value('age')), phone: value('phone'),
                email: value('email'), pickup: value('pickup')};
        });
    }
    function render(trip, count) {
        const host = document.getElementById('travellerCards');
        const previous = [...host.querySelectorAll('fieldset')].map(card =>
            Object.fromEntries([...card.querySelectorAll('input, select')].map(field => [field.id, field.value])));
        const points = TripDateUtils.pickupPoints(trip, typeof commonPickupPoints === 'undefined' ? [] : commonPickupPoints);
        const stops = [...new Map(points.map(point => [point.name.trim(), point])).entries()];
        const cards = [];
        for (let index = 1; index <= count; index++) {
            const card = document.createElement('fieldset');
            card.className = 'traveller-card';
            const legend = document.createElement('legend');
            legend.textContent = 'Traveller ' + index;
            const grid = document.createElement('div');
            grid.className = 'traveller-fields';
            card.append(legend);
            if (index === 1) card.append(button('Use booking contact details', () => {
                for (const [key, id] of Object.entries(contactFields)) {
                    edited.delete(key);
                    document.getElementById('traveller-1-' + key).value = document.getElementById(id).value;
                }
            }));
            if (count === 1) {
                const hint = document.createElement('p');
                hint.textContent = 'Contact details are filled in for you. You can edit them below.';
                card.append(hint);
            }
            card.append(grid);
            if (stops.length) {
                const select = document.createElement('select');
                select.add(new Option('Choose a pickup point', ''));
                for (const [name, point] of stops) select.add(new Option(point.time ? name + ' · ' + point.time : name, name));
                addField(grid, select, 'Pickup point', index, 'pickup');
                if (index === 1 && count > 1) card.append(button('Use this pickup point for everyone', () => {
                    if (!select.value) return select.reportValidity();
                    for (const other of host.querySelectorAll('select')) other.value = select.value;
                }));
            } else {
                const message = document.createElement('p');
                message.textContent = 'Our team will confirm your pickup point.';
                card.append(message);
            }
            for (const {key, label, ...attributes} of fields) {
                const input = Object.assign(document.createElement('input'), attributes);
                if (attributes.autocomplete) input.autocomplete = 'section-traveller' + index + ' ' + attributes.autocomplete;
                addField(grid, input, label, index, key);
            }
            for (const field of grid.querySelectorAll('input, select')) field.value = previous[index - 1]?.[field.id] ?? '';
            cards.push(card);
        }
        host.replaceChildren(...cards);
        solo = count === 1;
        syncContact();
    }
    window.TravellerDetails = {render, read};
}());
