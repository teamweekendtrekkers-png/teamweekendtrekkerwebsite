'use strict';
(() => {
  const el = id => document.getElementById(id);
  const tell = text => { el('notice').textContent = text; };
  const base = '/rest/v1/';
  let loadId = 0;
  let busy = false;
  let pickupStops = [];
  let departures = [];
  const colours = ['forest', 'blue', 'purple', 'rust'];
  const run = async action => {
    if (busy) return;
    busy = true;
    try { tell(''); await action(); } catch (error) { tell(error.message); }
    finally { busy = false; }
  };
  const departureLink = slug => new URL(`./?trip=${encodeURIComponent(slug)}`, location.href);

  async function loadDepartures(selected) {
    departures = await pickupApi.request(`${base}pickup_departures?select=slug,title,departure_date&order=departure_date.asc`);
    if (selected) el('week').value = 'all';
    await showWeek(selected);
  }

  async function showWeek(selected = el('departure').value) {
    const week = el('week').value;
    const parts = new Intl.DateTimeFormat('en-GB', {timeZone: 'Asia/Kolkata',
      year: 'numeric', month: 'numeric', day: 'numeric'}).formatToParts(new Date());
    const value = type => Number(parts.find(part => part.type === type).value);
    const start = new Date(Date.UTC(value('year'), value('month') - 1, value('day')));
    start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7 + (week === '1' ? 7 : 0));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    const visible = departures.filter(trip => week === 'all' ||
      (trip.departure_date >= start.toISOString().slice(0, 10) && trip.departure_date < end.toISOString().slice(0, 10)));
    el('departure').replaceChildren(...visible.map(trip => new Option(`${trip.departure_date} · ${trip.title}`, trip.slug)));
    if (visible.some(trip => trip.slug === selected)) el('departure').value = selected;
    await refresh();
  }

  function fillStop() {
    const stop = pickupStops.find(item => item.id === el('stopChoice').value);
    el('stopName').value = stop?.name || '';
    el('stopTime').value = stop?.pickup_time || '';
    el('landmark').value = stop?.landmark || '';
    el('mapUrl').value = stop?.map_url || '';
  }

  async function refresh() {
    const slug = el('departure').value;
    const id = ++loadId;
    el('inviteLink').hidden = el('copyInvite').hidden = true;
    el('checkins').replaceChildren();
    el('stopSettings').hidden = !slug;
    el('inviteSettings').hidden = !slug;
    el('departureTitle').hidden = !slug;
    el('publicLink').hidden = !slug;
    if (!slug) return tell(departures.length ? 'No departures scheduled for this week.' : 'Create a departure page to start.');
    const departure = departures.find(trip => trip.slug === slug);
    el('departureTitle').textContent = `${departure.departure_date} · ${departure.title}`;
    const colourIndex = [...slug].reduce((sum, character) => sum + character.charCodeAt(0), 0) % colours.length;
    el('dashboard').dataset.departureColour = colours[colourIndex];
    el('publicLink').href = departureLink(slug);
    const [stops, rows] = await Promise.all([
      pickupApi.request(`${base}pickup_stops?departure=eq.${slug}&select=id,name,pickup_time,landmark,map_url,position&order=position`),
      pickupApi.request(`${base}pickup_checkins?departure=eq.${slug}&updated_at=not.is.null&select=lead_name,phone,party_size,stop&order=lead_name`),
    ]);
    if (id !== loadId) return;
    pickupStops = stops;
    el('stopChoice').replaceChildren(new Option('Add a stop', ''), ...stops.map(stop => new Option(stop.name, stop.id)));
    fillStop();
    if (!rows.length) return tell('Nobody has checked in for this departure yet.');
    for (const stop of stops) {
      const parties = rows.filter(row => row.stop === stop.id);
      if (!parties.length) continue;
      const section = document.createElement('section');
      const heading = document.createElement('h2');
      heading.textContent = `${stop.name} · ${parties.reduce((total, row) => total + row.party_size, 0)} travellers`;
      const location = document.createElement('p');
      location.textContent = [stop.pickup_time, stop.landmark].filter(Boolean).join(' · ');
      const list = document.createElement('ul');
      for (const party of parties) {
        const row = document.createElement('li');
        const digits = party.phone.replace(/[^0-9+]/g, '');
        const call = document.createElement('a');
        call.href = `tel:${digits}`;
        call.textContent = `Call ${party.phone}`;
        row.append(`${party.lead_name} · ${party.party_size} travelling · `, call);
        list.append(row);
      }
      section.append(heading, location, list);
      el('checkins').append(section);
    }
  }

  el('signin').addEventListener('submit', event => {
    event.preventDefault();
    run(async () => {
      await pickupApi.signIn(el('email').value.trim(), el('password').value);
      el('password').value = '';
      el('signin').hidden = true;
      el('dashboard').hidden = false;
      await loadDepartures();
    });
  });
  el('departure').addEventListener('change', () => refresh().catch(error => tell(error.message)));
  el('week').addEventListener('change', () => showWeek().catch(error => tell(error.message)));
  el('refresh').addEventListener('click', () => run(refresh));
  el('setup').addEventListener('submit', event => {
    event.preventDefault();
    run(async () => {
      const title = el('title').value.trim();
      const date = el('date').value;
      const label = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 55);
      const slug = `${label || 'trip'}-${date}`;
      const packing = el('carry').value.split('\n').map(item => item.trim()).filter(Boolean);
      await pickupApi.request(`${base}pickup_departures`, {slug, title, departure_date: date, packing, open: true});
      el('setup').reset();
      await loadDepartures(slug);
      el('stopSettings').open = true;
    });
  });
  el('stopChoice').addEventListener('change', fillStop);
  el('stopForm').addEventListener('submit', event => {
    event.preventDefault();
    run(async () => {
      const id = el('stopChoice').value;
      const stop = {name: el('stopName').value.trim(), pickup_time: el('stopTime').value.trim(),
        landmark: el('landmark').value.trim(), map_url: el('mapUrl').value.trim()};
      if (stop.map_url && new URL(stop.map_url).protocol !== 'https:') throw new Error('Use an HTTPS map link.');
      if (id) await pickupApi.request(`${base}pickup_stops?id=eq.${id}`, stop, 'PATCH');
      else await pickupApi.request(`${base}pickup_stops`, {...stop, departure: el('departure').value,
        position: Math.max(0, ...pickupStops.map(point => point.position)) + 1});
      await refresh();
      tell('Pickup point saved.');
    });
  });
  el('invite').addEventListener('submit', event => {
    event.preventDefault();
    run(async () => {
      const slug = el('departure').value;
      const ref = el('reference').value.trim().toUpperCase();
      if (!slug || !ref) return;
      const code = await pickupApi.request(`${base}rpc/pickup_invite`, {p_departure: slug, p_reference: ref});
      const url = departureLink(slug);
      url.hash = new URLSearchParams({checkin: code});
      const link = el('inviteLink');
      link.textContent = 'Private check-in link';
      link.href = url.href;
      link.hidden = el('copyInvite').hidden = false;
    });
  });
  el('copyInvite').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(el('inviteLink').href); tell('Private link copied. Share it with this booking’s lead traveller.'); }
    catch { tell('Copy the private check-in link from the link menu.'); }
  });
  pickupApi.configure().then(() => { el('signin').hidden = false; }).catch(error => tell(error.message));
})();
