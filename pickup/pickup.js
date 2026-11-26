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
  const call = data => pickupApi.request('/rest/v1/rpc/pickup_submission', {p_departure: slug, ...data});
  let privateCode;
  let stops = [];

  submit(byId('unlock'), async () => {
    const code = byId('code').value.trim();
    if (!uuid.test(code)) return announce('Enter the private code supplied by your captain.');
    const data = await call({p_code: code});
    if (!data) return announce('This code is unavailable for this departure.');
    privateCode = code;
    byId('name').value = data.name || '';
    byId('phone').value = data.phone || '';
    byId('people').value = data.people || 1;
    byId('stop').value = data.stop || '';
    byId('checkin').hidden = false;
    byId('unlock').hidden = true;
    byId('name').focus();
    announce(data.updatedAt ? 'Your saved check-in is shown below.' : 'Enter your pickup details below.');
  });

  submit(byId('checkin'), async () => {
    const data = await call({p_code: privateCode, p_name: byId('name').value,
      p_phone: byId('phone').value, p_people: Number(byId('people').value), p_stop: byId('stop').value});
    if (!data) return announce('Check-in has closed. Please contact your captain.');
    const point = stops.find(stop => stop.id === data.stop);
    announce(`Check-in saved for ${data.people} · ${point.name} · ${point.pickup_time}`);
    const map = mapLink(point.map_url);
    if (map) byId('confirmation').append(' · ', map);
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
      item.textContent = [stop.name, stop.pickup_time, stop.landmark].filter(Boolean).join(' · ');
      const map = mapLink(stop.map_url);
      if (map) item.append(' · ', map);
      byId('stops').append(item);
    }
    for (const [index, text] of trip.packing.entries()) {
      const item = document.createElement('li');
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      const key = `pickup-packing:${slug}:${index}:${text}`;
      try { input.checked = localStorage.getItem(key) === 'yes'; } catch {}
      input.addEventListener('change', () => {
        try { localStorage.setItem(key, input.checked ? 'yes' : 'no'); } catch {}
      });
      label.append(input, text);
      item.append(label);
      byId('packing').append(item);
    }
    byId('departure').hidden = false;
    const invite = new URLSearchParams(location.hash.slice(1)).get('checkin');
    if (uuid.test(invite || '')) {
      byId('code').value = invite;
      byId('unlock').requestSubmit();
    }
    byId('share').addEventListener('click', async () => {
      const shareUrl = new URL(location.pathname, location.origin);
      shareUrl.searchParams.set('trip', slug);
      try { await navigator.clipboard.writeText(shareUrl.href); byId('notice').textContent = 'Departure link copied.'; }
      catch { byId('notice').textContent = shareUrl.href; }
    });
  }
  start().catch(error => { byId('notice').textContent = error.message; });
})();
