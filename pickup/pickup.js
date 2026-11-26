'use strict';
(() => {
  const byId = id => document.getElementById(id);
  const slug = new URLSearchParams(location.search).get('trip') || '';
  const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
  const announce = text => { byId('confirmation').textContent = text; };
  const submit = (form, action) => form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button');
    if (button.disabled) return;
    button.disabled = true;
    try { await action(); } catch (error) { announce(error.message); }
    finally { button.disabled = false; }
  });
  const previousInvite = new URLSearchParams(location.hash.slice(1)).get('checkin');
  const legacy = uuid.test(previousInvite || '');
  const storageKey = `twt-shared-checkin:${slug}`;
  let code;
  const call = data => pickupApi.request('/rest/v1/rpc/pickup_party_checkin',
    {p_departure: slug, p_code: code, p_legacy: legacy, ...data});
  let stops = [];
  let passengerNames = [];

  function renderPassengers() {
    const count = Number(byId('people').value);
    const fields = byId('passengerFields');
    const extra = Number.isInteger(count) && count >= 2 && count <= 50 ? count - 1 : 0;
    byId('passengers').hidden = extra === 0;
    fields.replaceChildren(...Array.from({length: extra}, (_, index) => {
      const row = document.createElement('div');
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.id = `passenger-${index + 2}`;
      input.maxLength = 100;
      input.autocomplete = 'off';
      input.value = passengerNames[index] || '';
      input.addEventListener('input', () => { passengerNames[index] = input.value; });
      label.htmlFor = input.id;
      label.textContent = `Traveller ${index + 2} name (optional)`;
      row.append(label, input);
      return row;
    }));
  }
  byId('people').addEventListener('input', renderPassengers);

  function complete(data) {
    const point = stops.find(stop => stop.id === data.stop);
    if (!point) return false;
    byId('checkin').hidden = true;
    byId('checkinComplete').hidden = false;
    const details = byId('checkinDetails');
    details.textContent = `${data.people} traveller${data.people === 1 ? '' : 's'} · ${point.name} · ${point.pickup_time}`;
    const map = mapLink(point.map_url);
    if (map) details.append(' · ', map);
    const names = (data.passengers || []).filter(Boolean);
    if (names.length) details.append(document.createElement('br'), `Travelling with ${names.join(', ')}`);
    announce('');
    byId('checkinCompleteTitle').focus();
    return true;
  }

  function fill(data) {
    byId('name').value = data.name || '';
    byId('phone').value = data.phone || '';
    byId('people').value = data.people || 1;
    passengerNames = data.passengers || [];
    renderPassengers();
    byId('stop').value = data.stop || '';
  }

  submit(byId('checkin'), async () => {
    if (!legacy) {
      try { localStorage.setItem(storageKey, code); } catch {}
    }
    const data = await call({p_name: byId('name').value,
      p_phone: byId('phone').value, p_people: Number(byId('people').value), p_stop: byId('stop').value,
      p_passengers: [...byId('passengerFields').querySelectorAll('input')].map(input => input.value.trim())});
    if (!data) return announce('Check-in has closed. Please contact your captain.');
    if (data.rateLimited) return announce('Too many check-ins at once. Please try again in a minute.');
    if (data.contactOrganizer) return announce('Please reopen this link in the browser where you checked in, or contact your captain for help.');
    if (!complete(data)) announce('Your check-in was saved. Refresh to see the latest pickup details.');
  });

  byId('editCheckin').addEventListener('click', () => {
    byId('checkinComplete').hidden = true;
    byId('checkin').hidden = false;
    byId('stop').focus();
  });

  function mapLink(value) {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:') return null;
      const a = document.createElement('a');
      a.href = url.href;
      a.textContent = 'Open map';
      return a;
    } catch { return null; }
  }

  async function start() {
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug)) throw new Error('Open the departure link shared by your captain.');
    await pickupApi.configure();
    const [departures, locations] = await Promise.all([
      pickupApi.request(`/rest/v1/pickup_departures?slug=eq.${slug}&select=title,departure_date,packing`),
      pickupApi.request(`/rest/v1/pickup_stops?departure=eq.${slug}&select=id,name,pickup_time,landmark,map_url&order=position`),
    ]);
    if (!departures.length) throw new Error('This departure is unavailable.');
    const trip = departures[0];
    stops = locations;
    byId('trip').textContent = `${trip.title} · ${trip.departure_date}`;
    byId('stop').add(new Option('Choose a pickup point', ''));
    for (const stop of stops) {
      byId('stop').add(new Option(stop.name, stop.id));
      const item = document.createElement('li');
      item.className = 'pickup-point';
      const name = document.createElement('details');
      name.open = true;
      const summary = document.createElement('summary');
      const landmark = document.createElement('p');
      summary.textContent = stop.name;
      landmark.textContent = stop.landmark || 'No extra landmark details.';
      name.append(summary, landmark);
      const time = document.createElement('span');
      time.className = 'pickup-time';
      time.textContent = stop.pickup_time;
      const map = mapLink(stop.map_url);
      if (map) map.textContent = 'Map';
      item.append(name, time, map || document.createElement('span'));
      byId('stops').append(item);
    }
    if (!stops.length) byId('stops').textContent = 'Pickup points will appear here once the organizer adds them.';
    byId('packingSection').hidden = !trip.packing.length;
    const grid = byId('thingsToCarryGrid');
    for (const [index, text] of trip.packing.entries()) {
      const item = document.createElement('div');
      item.className = 'carry-item';
      item.textContent = text;
      // Retain ticks saved by the first version of the departure checklist.
      try {
        const previous = `pickup-packing:${slug}:${index}:${text}`;
        if (localStorage.getItem(previous) === 'yes') {
          const state = PackingChecklist.createState(localStorage, `twt-packing:v1:pickup:${slug}`);
          const key = text.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
          const count = [...grid.children].filter(row => row.textContent.normalize('NFC')
            .replace(/\s+/g, ' ').trim().toLowerCase() === key).length;
          state.checked.add(`${key.slice(0, 1100)}#${count}`);
          state.save();
          if (state.persistent) localStorage.removeItem(previous);
        }
      } catch {}
      grid.append(item);
    }
    PackingChecklist.install(window, `pickup:${slug}`);
    byId('departure').hidden = false;
    let saved;
    try { saved = localStorage.getItem(storageKey); } catch {}
    code = legacy ? previousInvite : uuid.test(saved || '') ? saved : crypto.randomUUID();
    if (legacy || uuid.test(saved || '')) {
      const previous = await call({});
      if (previous) {
        fill(previous);
        if (previous.updatedAt && complete(previous)) return bindShare();
      } else if (legacy) {
        announce('This older link is closed. Ask your captain for the shared departure link.');
        return bindShare();
      }
    }
    byId('checkin').hidden = false;
    if (!stops.length) {
      byId('checkin').querySelector('button').disabled = true;
      announce('Check-in opens when a pickup point is available.');
    }
    bindShare();
  }

  function bindShare() {
    byId('share').addEventListener('click', async () => {
      const shareUrl = new URL(location.pathname, location.origin);
      shareUrl.searchParams.set('trip', slug);
      try { await navigator.clipboard.writeText(shareUrl.href); byId('notice').textContent = 'Departure link copied.'; }
      catch { byId('notice').textContent = shareUrl.href; }
    });
  }
  start().catch(error => { byId('notice').textContent = error.message; });
})();
