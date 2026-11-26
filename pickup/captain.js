'use strict';
(() => {
  const el = id => document.getElementById(id);
  const tell = text => { el('notice').textContent = text; };
  const base = '/rest/v1/';
  let loadId = 0;
  let busy = false;
  let pickupStops = [];
  let departures = [];
  let captainAccess;
  let accessDeparture;
  const context = new URLSearchParams(location.search);
  const linkedTrek = (context.get('trek') || '').trim().slice(0, 100);
  const linkedDate = context.get('date') || '';
  const colours = ['forest', 'blue', 'purple', 'rust'];
  const run = async action => {
    if (busy) return;
    busy = true;
    try { tell(''); await action(); } catch (error) { tell(error.message); }
    finally { busy = false; }
  };
  const departureLink = slug => new URL(`./?trip=${encodeURIComponent(slug)}`, location.href);

  async function loadDepartures(selected) {
    departures = await pickupApi.request(`${base}pickup_departures?select=slug,title,departure_date,packing&order=departure_date.asc`);
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
    if (accessDeparture !== slug) {
      el('generated').hidden = true;
      captainAccess = null;
      accessDeparture = null;
      el('credentials').textContent = '';
    }
    el('listAccess').hidden = !slug;
    el('departureTasks').hidden = !slug;
    el('travellerCheckins').hidden = !slug;
    el('checkins').replaceChildren();
    el('stopSettings').hidden = !slug;
    el('reuseSettings').hidden = !slug;
    el('departureTitle').hidden = !slug;
    el('publicLink').hidden = !slug;
    el('copyDeparture').hidden = !slug;
    if (!slug) return tell(departures.length ? 'No departures scheduled for this week.' : 'Create a departure page to start.');
    const departure = departures.find(trip => trip.slug === slug);
    if (el('reuseSettings').dataset.departure !== slug) {
      el('reuseSettings').dataset.departure = slug;
      pickupReuse.match(departure.title);
    }
    el('departureTitle').textContent = `${departure.departure_date} · ${departure.title}`;
    const colourIndex = [...slug].reduce((sum, character) => sum + character.charCodeAt(0), 0) % colours.length;
    el('dashboard').dataset.departureColour = colours[colourIndex];
    el('publicLink').href = departureLink(slug);
    const [stops, rows] = await Promise.all([
      pickupApi.request(`${base}pickup_stops?departure=eq.${slug}&select=id,name,pickup_time,landmark,map_url,position&order=position`),
      pickupApi.request(`${base}pickup_checkins?departure=eq.${slug}&updated_at=not.is.null&select=lead_name,phone,party_size,stop,passenger_names&order=lead_name`),
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
        const names = (party.passenger_names || []).slice(0, Math.max(0, party.party_size - 1)).filter(Boolean);
        if (names.length) row.append(document.createElement('br'), `Travelling with ${names.join(', ')}`);
        list.append(row);
      }
      section.append(heading, location, list);
      el('checkins').append(section);
    }
  }

  async function openDashboard() {
    el('signin').hidden = true;
    el('dashboard').hidden = false;
    const view = context.get('view');
    const list = context.get('list');
    if (['all', 'share', 'access'].includes(view) || list) el('week').value = 'all';
    await loadDepartures(list);
    if (view === 'access' && el('departure').value) el('listAccess').open = true;
    if (view === 'share' && el('departure').value) el('copyDeparture').focus();
    if (context.get('create') === '1') {
      el('setup').closest('details').open = true;
      el('title').focus();
    }
    if (linkedTrek && /^\d{4}-\d{2}-\d{2}$/.test(linkedDate)) {
      const matching = departures.find(trip =>
        trip.departure_date === linkedDate && trip.title.toLowerCase() === linkedTrek.toLowerCase());
      if (matching) {
        el('week').value = 'all';
        await showWeek(matching.slug);
      } else {
        el('title').value = linkedTrek;
        el('date').value = linkedDate;
        el('setup').closest('details').open = true;
        tell('Create the pickup list for this departure to get started.');
      }
    }
  }

  el('signin').addEventListener('submit', event => {
    event.preventDefault();
    run(async () => {
      try { await pickupApi.signIn(el('email').value.trim(), el('password').value); }
      finally { el('password').value = ''; }
      await openDashboard();
    });
  });
  el('signOut').addEventListener('click', async () => {
    el('dashboard').hidden = true;
    el('checkins').replaceChildren();
    el('credentials').textContent = '';
    await pickupApi.signOut();
    location.reload();
  });
  window.addEventListener('storage', event => {
    if (event.key === 'twt-pickup-organizer-refresh' && event.newValue === null && !el('dashboard').hidden) {
      el('dashboard').hidden = true;
      el('checkins').replaceChildren();
      location.reload();
    }
  });
  el('departure').addEventListener('change', () => refresh().catch(error => tell(error.message)));
  el('week').addEventListener('change', () => showWeek().catch(error => tell(error.message)));
  el('refresh').addEventListener('click', () => run(refresh));
  function showCaptainAccess(slug, access) {
    if (el('departure').value !== slug) return;
    captainAccess = access;
    accessDeparture = slug;
    const url = new URL('list.html', location.href);
    el('credentials').innerText = `Captain pickup list: ${url.href}\nUsername: ${access.username}\nPassword: ${access.password}`;
    el('generated').hidden = false;
    el('listAccess').open = true;
  }

  el('generate').addEventListener('click', () => run(async () => {
    const slug = el('departure').value;
    if (!slug || !window.confirm('Generate access for this departure and replace any previous credentials?')) return;
    const access = await pickupApi.request(`${base}rpc/pickup_generate_list_access`, {p_departure: slug});
    showCaptainAccess(slug, access);
  }));

  el('manualAccess').addEventListener('submit', event => {
    event.preventDefault();
    return run(async () => {
      const slug = el('departure').value;
      const password = el('manualPassword').value;
      if (password !== password.trim() || new TextEncoder().encode(password).length > 64) {
        return tell('Use up to 64 bytes for the password and remove spaces at either end.');
      }
      if (!slug || !window.confirm('Save captain access and replace any previous credentials for this departure?')) return;
      const access = await pickupApi.request(`${base}rpc/pickup_set_list_access`, {
        p_departure: slug, p_username: el('manualUsername').value, p_password: password,
      });
      el('manualAccess').reset();
      showCaptainAccess(slug, {...access, password});
    });
  });
  el('copyAccess').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(el('credentials').innerText); tell('Access details copied. Share them privately with the assigned captain.'); }
    catch { tell('Select and copy the access details shown below.'); }
  });
  for (const [button, field] of [['copyCaptainUsername', 'username'], ['copyCaptainPassword', 'password']]) {
    el(button).addEventListener('click', async () => {
      if (!captainAccess) return;
      try { await navigator.clipboard.writeText(captainAccess[field]); tell(`Captain ${field} copied.`); }
      catch { tell(`Select and copy the ${field} from the access details.`); }
    });
  }
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
      el('reuseSettings').open = true;
    });
  });
  el('stopChoice').addEventListener('change', fillStop);
  el('saveReuseStops').addEventListener('click', () => run(async () => {
    const slug = el('departure').value;
    if (!slug || !el('reuseTrip').value) return tell('Choose a website trip first.');
    const identity = stop => [stop.name.trim().toLowerCase(), stop.pickup_time.trim()].join('\n');
    // Repeating an import should not create a second copy of a saved stop.
    const seen = new Set(pickupStops.map(identity));
    const added = [];
    const offset = Math.max(0, ...pickupStops.map(stop => stop.position));
    for (const stop of pickupReuse.selected('stops')) {
      const key = identity(stop);
      if (seen.has(key)) continue;
      seen.add(key);
      added.push({...stop, departure: slug, position: offset + added.length + 1});
    }
    if (!added.length) return tell('No new pickup points selected.');
    await pickupApi.request(`${base}pickup_stops`, added);
    await refresh();
    tell(`Added ${added.length} pickup point(s).`);
  }));
  el('saveReusePacking').addEventListener('click', () => run(async () => {
    const slug = el('departure').value;
    if (!slug || !el('reuseTrip').value) return tell('Choose a website trip first.');
    const departure = departures.find(trip => trip.slug === slug);
    const packing = pickupReuse.selected('packing');
    if (JSON.stringify(departure.packing) === JSON.stringify(packing)) return tell('Packing list is already saved.');
    if (departure.packing.length && !window.confirm('Replace the packing list for this departure?')) return;
    await pickupApi.request(`${base}pickup_departures?slug=eq.${slug}`, {packing}, 'PATCH');
    departure.packing = packing;
    tell('Packing list saved.');
  }));
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
  el('copyDeparture').addEventListener('click', async () => {
    const url = departureLink(el('departure').value).href;
    try { await navigator.clipboard.writeText(url); tell('Shared check-in link copied.'); }
    catch { tell(url); }
  });
  pickupApi.configure().then(async () => {
    try {
      if (await pickupApi.restoreOrganizer()) {
        await openDashboard();
        return;
      }
    } catch (error) {
      tell(error.message);
    }
    if (el('dashboard').hidden) el('signin').hidden = false;
  }).catch(error => tell(error.message));
})();
