(function (root, factory) {
    const node = typeof module === 'object' && module.exports;
    const api = factory(node ? require('./trip-date-utils') : root.TripDateUtils, node ? require('./trip-links') : root.TripLinks, node ? require('./departure-colors') : root.DepartureColors, node ? require('./inline-format') : root.TripText);
    if (node) module.exports = api;
    else root.TripDiscovery = api;
    if (!node && root.document) root.document.addEventListener('DOMContentLoaded', () => api.initCatalog(root.document));
}(typeof globalThis !== 'undefined' ? globalThis : this, function (dates, links, colors, textFormat) {
    'use strict';
    const experiences = Object.freeze({ trek: 'Treks', beach: 'Beaches', heritage: 'Heritage', getaway: 'Relaxed getaways', adventure: 'Adventure', other: 'Other experiences' });
    const escape = dates.escapeHTML;
    function experiencesFor(trip) {
        const values = Array.isArray(trip.experiences) ? trip.experiences : [trip.experience];
        const selected = [...new Set(values.filter(value => typeof value === 'string' && Object.prototype.hasOwnProperty.call(experiences, value)))];
        return selected.length ? selected : ['other'];
    }
    function experience(trip) { return experiencesFor(trip)[0]; }
    function category(trip) {
        const badge = String(trip.badge || '').toLowerCase();
        if (badge.includes('trek')) return 'trek';
        if (badge.includes('road')) return 'roadtrip';
        if (badge.includes('expedition')) return 'expedition';
        if (badge.includes('backpack') || badge.includes('hill')) return 'backpacking';
        if (badge.includes('adventure')) return 'trek';
        return badge.includes('backwater') ? 'backpacking' : 'other';
    }
    function safeImage(value) {
        if (typeof value !== 'string' || /[\s"'()<>\\\u0000-\u001f]/.test(value)) return false;
        if (/^https:\/\/[^/]+\//i.test(value)) {
            try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; }
            catch (_) { return false; }
        }
        return /^images\/[A-Za-z0-9_./-]+$/.test(value) && !value.split('/').some(part => part === '..' || part === '.');
    }
    function imagePath(trip) { return safeImage(trip.cardImage) ? trip.cardImage : safeImage(trip.image) ? trip.image : 'images/logo.jpg'; }
    function departureOptions(trips, referenceDate) {
        const ranges = new Map();
        trips.forEach(trip => dates.getUpcomingDateRanges(trip, referenceDate).forEach(range => { if (!ranges.has(range.key)) ranges.set(range.key, range); }));
        return [...ranges.values()].sort((a, b) => a.start - b.start || a.end - b.end);
    }
    function filterTrips(trips, state, referenceDate) {
        const terms = String(state.query || '').trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
        return trips.filter(trip => {
            if (!state.showComingSoon && (trip.isActive === false || !dates.getUpcomingDateRanges(trip, referenceDate).length)) return false;
            const window = dates.dateWindow(state.when, referenceDate);
            if(window && !dates.getUpcomingDateRanges(trip, referenceDate).some(range=>range.start.getTime()>=window.start&&range.start.getTime()<window.end))return false;
            if (state.category && state.category !== 'all' && category(trip) !== state.category) return false;
            if (state.experience && state.experience !== 'all' && !experiencesFor(trip).includes(state.experience)) return false;
            if (state.departure && !dates.getUpcomingDateRanges(trip, referenceDate).some(range => range.key === state.departure)) return false;
            const searchable = ['title', 'cardTitle', 'location', 'cardSummary', 'departureCity', 'badge'].map(field => String(trip[field] || '')).concat(experiencesFor(trip).map(key => experiences[key]), trip.isBestseller === true ? 'Bestseller' : '').join(' ').toLocaleLowerCase();
            return terms.every(term => searchable.includes(term));
        });
    }
    function sortTrips(trips, referenceDate) {
        const keyed = trips.map((trip, index) => ({ trip, index, ranges: dates.getUpcomingDateRanges(trip, referenceDate) }));
        const rank = item => item.trip.isActive === false ? 2 : item.ranges.length ? 0 : 1;
        return keyed.sort((a, b) => rank(a) - rank(b) || (a.ranges[0] && b.ranges[0] ? a.ranges[0].start - b.ranges[0].start : 0) || Number(b.trip.featured === true) - Number(a.trip.featured === true) || a.index - b.index).map(item => item.trip);
    }
    function displayTitle(trip) {
        let value = (textFormat ? textFormat.plain(trip.cardTitle || trip.title || '') : String(trip.cardTitle || trip.title || '')).replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu,'').trim();
        const letters = value.replace(/[^A-Za-z]/g,'');
        if (letters && letters === letters.toUpperCase()) value = value.toLowerCase().replace(/\b[a-z]/g,c=>c.toUpperCase());
        return value;
    }
    function formattedTitle(trip){const raw=String(trip.cardTitle||trip.title||'');return textFormat&&raw.includes('*')?textFormat.html(raw):escape(displayTitle(trip));}
    function renderDeparture(trip, range) {
        const title=displayTitle(trip),href=links.departureUrl(trip.id,range.originalLabel);
        return '<a class="departure-bar" data-batch-color="'+(colors?colors.key(trip.batchColor,trip.id):'forest')+'" href="'+escape(href)+'" aria-label="'+escape(title+' — '+range.fullLabel)+'"><time class="departure-date" datetime="'+escape(range.startKey)+'">'+escape(range.shortLabel)+'</time><span class="departure-name">'+formattedTitle(trip)+'</span><span class="departure-arrow" aria-hidden="true">→</span></a>';
    }
    function renderPrice(trip) {
        const amount = value => {
            const text = String(value ?? '').replace(/[₹,]/g, '').trim();
            return /^\d+(?:\.\d{1,2})?$/.test(text) ? Number(text) : NaN;
        };
        const selling = amount(trip.price), original = amount(trip.originalPrice);
        const discounted = Number.isFinite(original) && selling > 0 && original > selling;
        const money = value => '₹' + value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
        if (!trip.price) return '<span class="trip-price-unit">Ask us for pricing</span>';
        return (discounted ? '<del class="trip-original-price" aria-label="Original price '+escape(money(original))+'">'+escape(money(original))+'</del>' : '') +
            '<span class="trip-price"'+(discounted ? ' aria-label="Discounted price '+escape(money(selling))+'"' : '')+'>'+escape(trip.price)+'</span><span class="trip-price-unit">per person</span>';
    }
    function renderCard(trip, referenceDate, state) {
        state = state || {};
        const title = displayTitle(trip), window=dates.dateWindow(state.when,referenceDate);
        const ranges = dates.getUpcomingDateRanges(trip, referenceDate).filter(range=>!window||(range.start.getTime()>=window.start&&range.start.getTime()<window.end));
        const scopedTrip=window?{...trip,availableDates:ranges.map(range=>range.originalLabel)}:trip;
        const teaser=String(trip.cardSummary || (Array.isArray(trip.highlights)?trip.highlights[0]||'':''));
        const selected = ranges.find(range => range.key === state.departure);
        const href = selected && typeof links.departureUrl === 'function' ? links.departureUrl(trip.id, selected.originalLabel) : links.detailUrl(trip.id);
        const fallback = safeImage(trip.image) && trip.image !== imagePath(trip) ? trip.image : 'images/logo.jpg';
        const selectedExperiences = experiencesFor(trip);
        const labels = selectedExperiences.map(key => key === 'other' ? String(trip.badge || 'Trip') : experiences[key]);
        return `<article class="trip-card discovery-card ${trip.isActive === false ? 'trip-inactive' : ''}" data-trip-id="${escape(trip.id)}" data-category="${category(trip)}">
            <div class="trip-image"><img ${typeof ResponsiveImages !== 'undefined' ? ResponsiveImages.attributes(imagePath(trip), trip.cardFocalPoint) : 'src="' + escape(imagePath(trip)) + '"'} data-image-fallback="${escape(fallback)}" alt="${escape(title)}" loading="lazy" decoding="async"><div class="trip-card-types">${labels.map((label, index) => `<span class="trip-badge" data-experience="${escape(selectedExperiences[index])}">${escape(label)}</span>`).join('')}</div>${trip.isBestseller === true ? '<span class="trip-bestseller-badge">Bestseller</span>' : ''}${trip.isActive === false ? '<span class="trip-inactive-badge">Coming Soon</span>' : ''}</div>
            <div class="trip-content"><h3>${formattedTitle(trip)}</h3>
            ${!state.compact && trip.location ? `<p class="trip-location"><i class="fas fa-map-marker-alt" aria-hidden="true"></i> ${escape(trip.location)}</p>` : ''}
            ${(!state.compact || state.enhanced) && teaser.trim() ? `<p class="trip-card-summary">${escape((textFormat?textFormat.plain(teaser):teaser).trim().slice(0, 160))}</p>` : ''}
            ${state.enhanced ? dates.renderTripDateTags(scopedTrip,referenceDate,3) : state.compact ? (ranges[0] ? `<p class="trip-next-departure">Next departure: <time datetime="${escape(ranges[0].startKey)}" title="${escape(ranges[0].fullLabel)}">${escape(ranges[0].shortLabel)}</time></p>` : `<p class="trip-next-departure">${escape(dates.unavailableDateLabel(trip, referenceDate))}</p>`) : dates.renderTripDateTags(selected ? { ...scopedTrip, availableDates: [selected.originalLabel] } : scopedTrip, referenceDate, 2)}
            <div class="trip-meta">${trip.duration ? `<span><i class="fas fa-clock" aria-hidden="true"></i> ${escape(trip.duration)}</span>` : ''}${trip.difficulty ? `<span><i class="fas fa-signal" aria-hidden="true"></i> ${escape(trip.difficulty)}</span>` : ''}</div>
            ${trip.departureCity && String(trip.departureCity).trim() ? `<p class="trip-departure-city">Departs from ${escape(String(trip.departureCity).trim().slice(0, 80))}</p>` : ''}

            <div class="trip-footer"><div${state.hidePrice ? ' hidden' : ''}>${renderPrice(trip)}</div><a href="${escape(href)}" class="btn btn-small" aria-label="${escape((trip.isActive === false ? 'View details for ' : 'View dates and details for ') + title)}">${trip.isActive === false ? 'View Details' : 'View trip'}</a></div></div></article>`;
    }
    function attachImageFallbacks(container) {
        if (!container || typeof container.querySelectorAll !== 'function') return;
        container.querySelectorAll('img[data-image-fallback]').forEach(image => {
            const queue = [...new Set([image.dataset.imageFallback, 'images/logo.jpg'])]
                .filter(path => safeImage(path) && path !== image.getAttribute('src'));
            // Consume the marker now so repeated enhancement cannot attach a
            // second handler. A failed final logo terminates the finite queue.
            delete image.dataset.imageFallback;
            const cleanup = () => { image.removeEventListener('error', recover); image.removeEventListener('load', cleanup); };
            const recover = () => { const fallback = queue.shift(); if (fallback) { image.removeAttribute('srcset'); image.src = fallback; } else cleanup(); };
            image.addEventListener('error', recover);
            image.addEventListener('load', cleanup);
            if (image.complete) { if (image.naturalWidth) cleanup(); else recover(); }
        });
    }
    function mountControls(container, trips, options, referenceDate, onChange) {
        if (!container || typeof container.replaceChildren !== 'function') return null;
        const document = container.ownerDocument, state = { query: '', experience: 'all', departure: '', category: 'all', showComingSoon: false };
        container.hidden = !options.enabled; container.replaceChildren();
        const make = (tag, text) => { const node = document.createElement(tag); if (text) node.textContent = text; return node; };
        const control = (title, node) => { const label = make('label'); label.className = 'discovery-field' + (node.type === 'search' ? ' discovery-search' : ''); node.setAttribute('aria-label', title); label.append(make('span', title), node); container.append(label); };
        const inputs = [];
        const update = reset => { for (const [node, field] of inputs) state[field] = node.value; onChange({ ...state }, reset === true); };
        if (options.showSearch) {
            const input = make('input'); input.type = 'search'; input.placeholder = 'Search trips or places'; input.maxLength = 200; input.addEventListener('input', update); inputs.push([input, 'query']); control('Find your trip', input);
        }
        if (options.showExperienceFilter) {
            const select = make('select'), all = make('option', 'All experiences'); all.value = 'all'; select.append(all);
            const available = new Set(trips.flatMap(experiencesFor));
            Object.entries(experiences).filter(([key]) => available.has(key)).forEach(([key, title]) => { const option = make('option', title); option.value = key; select.append(option); });
            select.addEventListener('change', update); inputs.push([select, 'experience']); control('Choose your experience', select);
        }
        if (options.showWeekendFilter) {
            const select = make('select'), all = make('option', 'All upcoming dates'); all.value = ''; select.append(all);
            departureOptions(trips, referenceDate).forEach(range => { const option = make('option', range.fullLabel); option.value = range.key; select.append(option); });
            select.addEventListener('change', update); inputs.push([select, 'departure']); control('Choose your departure', select);
        }
        const reset = make('button', 'Reset filters'); reset.type = 'button'; reset.className = 'discovery-reset';
        const resetValues = () => { inputs.forEach(([node, field]) => { node.value = field === 'experience' ? 'all' : ''; }); update(true); };
        reset.addEventListener('click', resetValues); container.append(reset);
        return { reset: resetValues, state: () => ({ ...state }), restore: saved => {
            for (const [node, field] of inputs) {
                const value = String(saved[field] || (field === 'experience' ? 'all' : ''));
                node.value = node.tagName === 'SELECT' && ![...node.options].some(option => option.value === value) ? (field === 'experience' ? 'all' : '') : value.slice(0, 200);
                state[field] = node.value;
            }
            return { ...state };
        } };
    }

    function organiseCatalogControls(container) {
        if (!container) return null;
        const document = container.ownerDocument;
        const reset = container.querySelector('.discovery-reset');
        const fields = [...container.querySelectorAll('.discovery-field:not(.discovery-search)')];
        const actions = document.createElement('div'); actions.className = 'catalogue-search-actions';
        container.classList.toggle('catalogue-controls-only', !container.querySelector('.discovery-search'));
        let toggle, caption, resultsButton;
        if (fields.length) {
            const panel = document.createElement('div'); panel.id = container.id + '-panel'; panel.className = 'catalogue-filter-panel'; panel.hidden = true;
            toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'catalogue-filter-toggle';
            toggle.setAttribute('aria-controls', panel.id); toggle.setAttribute('aria-expanded', 'false');
            caption = document.createElement('span'); caption.textContent = 'Filters';
            const arrow = document.createElement('span'); arrow.textContent = '▾'; arrow.setAttribute('aria-hidden', 'true');
            toggle.append(caption, arrow);
            const setOpen = open => { panel.hidden = !open; toggle.setAttribute('aria-expanded', String(open)); arrow.textContent = open ? '▴' : '▾'; };
            toggle.addEventListener('click', () => setOpen(panel.hidden));
            panel.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); setOpen(false); toggle.focus(); } });
            fields.forEach(field => panel.append(field));
            const comingSoon = document.getElementById('show-coming-soon')?.closest('label');
            if (!container.hidden && comingSoon) panel.append(comingSoon);
            resultsButton = document.createElement('button'); resultsButton.type = 'button'; resultsButton.className = 'catalogue-show-results';
            resultsButton.addEventListener('click', () => {
                setOpen(false);
                const status = document.getElementById('trip-results-status');
                if (status) { status.tabIndex = -1; status.focus({ preventScroll: true }); status.scrollIntoView({ block: 'start' }); }
            });
            panel.append(resultsButton);
            actions.append(toggle); container.append(actions, panel);
        } else container.append(actions);
        if (reset) actions.append(reset);
        return { update: (state, resultCount) => {
            const count = Number(Boolean(state.experience && state.experience !== 'all')) + Number(Boolean(state.departure)) + Number(Boolean(state.showComingSoon)) + Number(Boolean(state.when));
            if (caption) caption.textContent = count ? `Filters (${count})` : 'Filters';
            if (toggle) toggle.classList.toggle('has-filters', count > 0);
            if (reset) reset.disabled = !(state.query || count || (state.category && state.category !== 'all') || state.showComingSoon);
            if (resultsButton) resultsButton.textContent = resultCount ? `Show ${resultCount} ${resultCount === 1 ? 'trip' : 'trips'}` : 'See results · no matches';
        } };
    }
    async function initCatalog(document) {
        const grid = document.getElementById('tripsDynamicGrid');
        if (!grid || typeof tripsData !== 'object') return;
        const all = Object.entries(tripsData).map(([id, trip]) => ({ ...trip, id })), referenceDate = new Date();
        const root = document.defaultView, config = root.HomepageSettings ? await root.HomepageSettings.load(root.fetch.bind(root)) : { discovery: { enabled: true, showSearch: true, showExperienceFilter: true, showWeekendFilter: true } };
        let current = { query: '', experience: 'all', departure: '', category: 'all', showComingSoon: false };
        let catalogControls;
        const readFilters = () => {
            const params = new URLSearchParams(root.location.search);
            const category = params.get('type') || 'all';
            return {query:(params.get('q') || '').slice(0,200), experience:params.get('experience') || 'all',
                departure:params.get('departure') || '', category:[...document.querySelectorAll('[data-filter]')].some(button=>button.dataset.filter===category)?category:'all',
                showComingSoon:params.get('unavailable')==='1',when:dates.dateWindow(params.get('when'),referenceDate)?params.get('when'):''};
        };
        const writeFilters = () => {
            if (!root.location.href || !root.history?.replaceState) return;
            const url = new URL(root.location.href);
            for (const [key,value] of Object.entries({q:current.query,experience:current.experience==='all'?'':current.experience,
                departure:current.departure,when:current.when||'',type:current.category==='all'?'':current.category,unavailable:current.showComingSoon?'1':''})) {
                if(value)url.searchParams.set(key,value);else url.searchParams.delete(key);
            }
            if(url.href!==root.location.href)root.history.replaceState(root.history.state,'',url.href);
        };
        const status = document.getElementById('trip-results-status'), comingSoon = document.getElementById('show-coming-soon');
        if (status) status.tabIndex = -1;
        const selectedFilters = document.createElement('div'); selectedFilters.className = 'catalogue-selected-filters'; selectedFilters.setAttribute('aria-label', 'Your trip filters'); selectedFilters.setAttribute('role', 'group');
        if (status) status.after(selectedFilters);
        selectedFilters.hidden = true;
        let selectionSignature = '', lastMarkup;
        const updateSelectedFilters = () => {
            const entries = [];
            if (current.query.trim()) entries.push(['query', `Search: ${current.query.trim()}`]);
            if (current.experience !== 'all') entries.push(['experience', experiences[current.experience] || 'Experience']);
            if (current.when) entries.push(['when',dates.dateWindow(current.when,referenceDate)?.label||'Selected weekend']);
            if (current.departure) entries.push(['departure', departureOptions(all, referenceDate).find(range => range.key === current.departure)?.fullLabel || 'Selected departure']);
            if (current.category !== 'all') entries.push(['category', [...document.querySelectorAll('[data-filter]')].find(button => button.dataset.filter === current.category)?.textContent.trim() || 'Trip type']);
            if (current.showComingSoon) entries.push(['showComingSoon', 'Includes trips without dates']);
            const signature = JSON.stringify(entries);
            if (signature === selectionSignature) return;
            selectionSignature = signature; selectedFilters.replaceChildren(); selectedFilters.hidden = !entries.length;
            entries.forEach(([field, label]) => {
                const button = document.createElement('button'); button.type = 'button'; button.dataset.removeFilter = field; button.className = 'catalogue-filter-chip';
                button.textContent = label + ' ×'; button.setAttribute('aria-label', 'Remove filter: ' + label);
                button.addEventListener('click', () => {
                    current[field] = field === 'showComingSoon' ? false : ['experience', 'category'].includes(field) ? 'all' : '';
                    controls?.restore(current);
                    if (comingSoon) comingSoon.checked = current.showComingSoon;
                    document.querySelectorAll('[data-filter]').forEach(node => { node.classList.toggle('active', node.dataset.filter === current.category); node.setAttribute('aria-pressed', String(node.dataset.filter === current.category)); });
                    render();
                    (selectedFilters.querySelector('button') || document.querySelector('#trip-discovery-controls input[type="search"]') || status)?.focus({ preventScroll: true });
                });
                selectedFilters.append(button);
            });
        };
        const render = () => {
            const visible = sortTrips(filterTrips(all, current, referenceDate), referenceDate);
            const markup = visible.length ? visible.map(trip => renderCard(trip, referenceDate, current)).join('') : '<div class="discovery-empty"><h2>No matching trips</h2><p>Try another departure or experience, or reset the filters.</p><button type="button" class="discovery-reset" data-reset-results>Reset filters</button></div>';
            if (markup !== lastMarkup) { grid.innerHTML = markup; lastMarkup = markup; attachImageFallbacks(grid); }
            const resultText = `${visible.length} ${visible.length === 1 ? 'trip' : 'trips'} found${current.showComingSoon ? ' · includes trips without available dates' : ' · scheduled departures first'}`;
            if (status && status.textContent !== resultText) status.textContent = resultText;
            if (catalogControls) catalogControls.update(current, visible.length);
            updateSelectedFilters();
            writeFilters();
            const reset = grid.querySelector('[data-reset-results]'); if (reset) reset.onclick = () => { current.category = 'all'; current.showComingSoon = false; current.when=''; if (comingSoon) comingSoon.checked = false; document.querySelectorAll('[data-filter]').forEach(button => { button.classList.toggle('active', button.dataset.filter === 'all'); button.setAttribute('aria-pressed', String(button.dataset.filter === 'all')); }); controls ? controls.reset() : render(); };
        };
        const controls = mountControls(document.getElementById('trip-discovery-controls'), all, config.discovery, referenceDate, (state, reset) => {
            current = { ...state, category: reset ? 'all' : current.category, showComingSoon: reset ? false : current.showComingSoon, when:reset?'':current.when };
            if (reset) {
                if (comingSoon) comingSoon.checked = false;
                document.querySelectorAll('[data-filter]').forEach(button => { button.classList.toggle('active', button.dataset.filter === 'all'); button.setAttribute('aria-pressed', String(button.dataset.filter === 'all')); });
            }
            render();
        });
        if (comingSoon) comingSoon.addEventListener('change', () => { current.showComingSoon = comingSoon.checked; render(); });
        document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
            current.category = button.dataset.filter;
            document.querySelectorAll('[data-filter]').forEach(other => { other.classList.toggle('active', other === button); other.setAttribute('aria-pressed', String(other === button)); }); render();
        }));
        const container=document.getElementById('trip-discovery-controls');
        if(container){
            catalogControls = organiseCatalogControls(container);
            const restore = () => {
                const saved = readFilters();
                const restored=controls?.restore(saved)||{query:'',experience:'all',departure:''};
                current = {...saved,query:restored.query,experience:restored.experience,departure:restored.departure};
                if(comingSoon)comingSoon.checked=current.showComingSoon;
                document.querySelectorAll('[data-filter]').forEach(button=>{button.classList.toggle('active',button.dataset.filter===current.category);button.setAttribute('aria-pressed',String(button.dataset.filter===current.category));});
            };
            restore();
            root.addEventListener('popstate',()=>{restore();render();});
        }
        render();
        setInterval(()=>{referenceDate.setTime(Date.now());render();},30000);
    }
    return { renderPrice, renderDeparture, displayTitle, experiences, experiencesFor, experience, category, safeImage, imagePath, departureOptions, filterTrips, sortTrips, renderCard, attachImageFallbacks, mountControls, initCatalog };
}));
