'use strict';
(() => {
  const el = id => document.getElementById(id);
  let credentials;
  let revision = 0;
  let busy = false;
  const status = text => { el('notice').textContent = text; };

  function render(data) {
    el('tripLabel').textContent = `${data.date} · ${data.title}`;
    const total = data.stops.reduce((sum, stop) => sum + stop.parties.reduce((n, row) => n + row.people, 0), 0);
    el('total').textContent = `${total} travellers checked in`;
    const items = data.stops.map(stop => {
      const section = document.createElement('section');
      const title = document.createElement('h3');
      const detail = document.createElement('p');
      const list = document.createElement('ul');
      title.textContent = `${stop.name} · ${stop.parties.reduce((sum, row) => sum + row.people, 0)} travellers`;
      detail.textContent = [stop.time, stop.landmark].filter(Boolean).join(' · ');
      for (const party of stop.parties) {
        const row = document.createElement('li');
        const call = document.createElement('a');
        call.href = `tel:${party.phone.replace(/[^0-9+]/g, '')}`;
        call.textContent = `Call ${party.phone}`;
        row.append(`${party.name} · ${party.people} travelling · `, call);
        const names = (party.passengers || []).filter(Boolean);
        if (names.length) row.append(document.createElement('br'), `Travelling with ${names.join(', ')}`);
        list.append(row);
      }
      section.append(title, detail, list);
      return section;
    });
    el('groups').replaceChildren(...items);
    el('access').hidden = true;
    el('manifest').hidden = false;
  }

  function closeList() {
    revision++;
    credentials = null;
    el('access').reset();
    el('groups').replaceChildren();
    el('tripLabel').textContent = '';
    el('total').textContent = '';
    el('manifest').hidden = true;
    el('access').hidden = false;
  }

  async function refresh() {
    if (!credentials || busy) return;
    const requestId = ++revision;
    busy = true;
    try {
      status('Loading pickup list…');
      const result = await pickupApi.request('/rest/v1/rpc/pickup_read_captain_list', credentials);
      if (revision !== requestId) return;
      if (!result) {
        closeList();
        status('That username and password did not open a current departure list.');
        return;
      }
      el('listPassword').value = '';
      render(result);
      status('');
    } catch (error) { if (revision === requestId) status(error.message); }
    finally { busy = false; }
  }

  el('access').addEventListener('submit', event => {
    event.preventDefault();
    if (busy) return;
    credentials = {p_username: el('username').value.trim(), p_password: el('listPassword').value.trim()};
    refresh();
  });
  el('reload').addEventListener('click', refresh);
  el('lock').addEventListener('click', () => { closeList(); status(''); });
  pickupApi.configure().then(() => { el('access').hidden = false; }).catch(error => status(error.message));
})();
