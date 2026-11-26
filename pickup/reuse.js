'use strict';
const pickupReuse = (() => {
  const byId = id => document.getElementById(id);
  const source = byId('reuseTrip');
  const trips = Object.entries(tripsData).filter(([, trip]) => trip.title);
  const choice = {stops: [], packing: []};
  let managerItems;
  try {
    const url = new URL(location.href);
    const data = new URLSearchParams(url.hash.slice(1)).get('library');
    if (data && data.length <= 12000) {
      managerItems = JSON.parse(data);
      if (!Array.isArray(managerItems?.packing) || !Array.isArray(managerItems?.stops)) managerItems = null;
      url.hash = '';
      history.replaceState(null, '', url.href);
    }
  } catch {}

  function render(kind, target) {
    const options = choice[kind];
    target.replaceChildren(...options.map((option, index) => {
      const row = document.createElement('li');
      row.className = 'reuse-choice';
      const label = document.createElement('label');
      const selected = document.createElement('input');
      selected.type = 'checkbox';
      selected.checked = option.selected;
      selected.addEventListener('change', () => { option.selected = selected.checked; });
      label.append(selected, option.label);
      row.append(label);
      for (const direction of [-1, 1]) {
        const button = document.createElement('button');
        const to = index + direction;
        button.type = 'button';
        button.textContent = direction < 0 ? '↑' : '↓';
        button.setAttribute('aria-label', `Move ${option.label} ${direction < 0 ? 'up' : 'down'}`);
        button.disabled = to < 0 || to >= options.length;
        button.addEventListener('click', () => {
          options.splice(to, 0, options.splice(index, 1)[0]);
          render(kind, target);
          target.children[to].querySelector('input').focus();
        });
        row.append(button);
      }
      return row;
    }));
  }

  function load() {
    const trip = tripsData[source.value];
    const local = source.value === ':manager' ? managerItems : null;
    const packing = local ? local.packing.filter(text => typeof text === 'string' && text.trim())
      : trip ? TripDetailLists.getItems(trip, 'thingsToCarry') : [];
    const stops = local ? local.stops.filter(stop => typeof stop?.name === 'string' && stop.name.trim())
      : trip ? TripDateUtils.pickupPoints(trip, typeof commonPickupPoints === 'undefined' ? [] : commonPickupPoints) : [];
    choice.packing = packing.map(text => ({label: text, value: text, selected: true}));
    choice.stops = stops.map(stop => ({label: [stop.name, stop.time, stop.landmark].filter(Boolean).join(' · '), value: {
      name: stop.name.trim(), pickup_time: stop.time || '', landmark: stop.landmark || '',
      map_url: /^https:\/\//i.test(stop.mapLink || '') ? stop.mapLink : '',
    }, selected: true}));
    render('packing', byId('reusePacking'));
    render('stops', byId('reuseStops'));
  }

  source.replaceChildren(new Option('Choose a website trip', ''), ...trips.map(([id, trip]) => new Option(trip.title.trim(), id)));
  if (managerItems) source.add(new Option('Items selected in Manager', ':manager'));
  source.addEventListener('change', load);
  return {
    match(title) {
      source.value = managerItems ? ':manager' : trips.find(([, trip]) => trip.title.trim().toLowerCase() === title.trim().toLowerCase())?.[0] || '';
      load();
    },
    selected: kind => choice[kind].filter(option => option.selected).map(option => option.value),
  };
})();
