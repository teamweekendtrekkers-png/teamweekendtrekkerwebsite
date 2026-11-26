(function () {
    'use strict';
    const lookup = document.getElementById('pickupLookup');
    const edit = document.getElementById('pickupEdit');
    const link = document.getElementById('privateBookingLink');
    const phone = document.getElementById('pickupPhone');
    const select = document.getElementById('pickupStop');
    const note = document.getElementById('pickupMessage');
    const map = document.getElementById('pickupMap');
    let options = [];
    let session = null;
    let lookupRevision = 0;

    for (const input of [link, phone]) input.addEventListener('input', () => {
        lookupRevision++;
        session = null;
        edit.hidden = true;
        note.textContent = '';
    });

    function refreshMap() {
        const point = options.find(item => item.name === select.value);
        map.textContent = point?.time || '';
        if (!point?.mapLink) return;
        try {
            const url = new URL(point.mapLink);
            if (url.protocol !== 'https:') return;
            const anchor = document.createElement('a');
            anchor.href = url.href;
            anchor.textContent = 'Open pickup map';
            map.append(' ', anchor);
        } catch {}
    }

    async function submit(form, body, onSuccess) {
        const button = form.querySelector('button');
        if (button.disabled) return;
        button.disabled = true;
        note.textContent = 'Updating pickup details…';
        try {
            const configResponse = await fetch('js/booking-config.json', {signal: AbortSignal.timeout(8000)});
            if (!configResponse.ok) throw new Error();
            const config = await configResponse.json();
            const response = await fetch('https://vdxunrhcahgkwtzvjjdj.supabase.co/rest/v1/rpc/twt_pickup_details', {
                method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(12000),
                headers: {'Content-Type': 'application/json', apikey: config.anonKey, Authorization: 'Bearer ' + config.anonKey},
                body: JSON.stringify(body),
            });
            if (!response.ok) throw new Error();
            const data = await response.json();
            if (data) onSuccess(data);
            else note.textContent = 'Check your private link and booking phone number. Pickup changes are available for confirmed upcoming bookings.';
        } catch {
            note.textContent = 'Pickup details are temporarily unavailable. Try again or contact our team on WhatsApp.';
        } finally {
            button.disabled = false;
        }
    }

    lookup.addEventListener('submit', event => {
        event.preventDefault();
        if (lookup.querySelector('button').disabled) return;
        session = null;
        edit.hidden = true;
        let key;
        try {
            const url = new URL(link.value);
            if (url.origin === location.origin && url.pathname === location.pathname) {
                key = new URLSearchParams(url.hash.slice(1)).get('key');
            }
        } catch {}
        if (!/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(key || '')) {
            note.textContent = 'Paste the full private booking link above.';
            return;
        }
        const credentials = {p_key: key, p_phone: phone.value};
        const revision = lookupRevision;
        submit(lookup, credentials, data => {
            if (revision !== lookupRevision) return;
            const trip = Object.hasOwn(tripsData, data.trip) ? tripsData[data.trip] : null;
            options = trip ? TripDateUtils.pickupPoints(trip, typeof commonPickupPoints === 'undefined' ? [] : commonPickupPoints)
                .map(point => ({...point, name: point.name.trim()})) : [];
            if (!options.length) {
                note.textContent = 'Contact our team on WhatsApp to arrange pickup for this trip.';
                return;
            }
            select.replaceChildren(new Option('Choose a pickup point', ''));
            for (const point of options) select.add(new Option(point.name, point.name));
            const current = data.pickup || (data.originalPickups.length === 1 ? data.originalPickups[0] : '');
            select.value = options.some(point => point.name === current) ? current : '';
            document.getElementById('pickupParty').textContent = `${data.name} · ${data.travellers} traveller(s) · ${data.departure}`;
            refreshMap();
            session = credentials;
            edit.hidden = false;
            note.textContent = data.originalPickups.length > 1 && !data.pickup
                ? 'Your booking has multiple pickup points. Save here only if everyone will use the same point.' : '';
        });
    });
    select.addEventListener('change', refreshMap);
    edit.addEventListener('submit', event => {
        event.preventDefault();
        if (!session || !options.some(point => point.name === select.value)) return;
        const credentials = session;
        submit(edit, {...credentials, p_stop: select.value}, data => {
            if (session !== credentials) return;
            select.value = data.pickup;
            refreshMap();
            note.textContent = `Pickup details saved for ${data.travellers} traveller(s) at ${data.pickup}.`;
        });
    });
}());
