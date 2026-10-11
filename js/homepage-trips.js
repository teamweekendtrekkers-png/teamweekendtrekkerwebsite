(function () {
    'use strict';
    let expandedDepartures = false;

    function getAllTrips() {
        if (typeof tripsData !== 'object' || tripsData === null) return [];
        return Object.entries(tripsData).map(([id, trip]) => ({ ...trip, id }));
    }

    function renderUpcomingBatches(referenceDate, config, state, resetFilters) {
        const grid = document.getElementById('upcoming-batches-grid');
        if (!grid || typeof TripDateUtils === 'undefined') return;

        const allTrips = getAllTrips();
        const filteredTrips = typeof TripDiscovery !== 'undefined' && typeof HomepageSettings !== 'undefined'
            ? TripDiscovery.filterTrips(HomepageSettings.selectedTrips(allTrips, config, referenceDate), state || {}, referenceDate)
            : allTrips;
        const batches = typeof HomepageSettings !== 'undefined' && typeof TripDiscovery !== 'undefined'
            ? (HomepageSettings.normalize(config).upcomingBatches.enabled ? TripDateUtils.buildUpcomingBatches(filteredTrips, referenceDate, 50) : [])
            : typeof HomepageSettings === 'undefined'
            ? TripDateUtils.buildUpcomingBatches(allTrips, referenceDate, 3)
            : HomepageSettings.buildBatches(allTrips, config, referenceDate);
        const fields = typeof HomepageSettings === 'undefined'
            ? { price: true, status: true, weekday: true }
            : HomepageSettings.normalize(config).upcomingBatches.fields;
        const visibleCount = typeof HomepageSettings === 'undefined' ? 2 : HomepageSettings.normalize(config).upcomingBatches.maxBatches;
        const escapeHTML = TripDateUtils.escapeHTML;
        const filtered = state && (state.query || state.experience !== 'all' || state.departure);
        const status = document.getElementById('homepage-discovery-status');
        if (status) status.textContent = batches.length ? `Showing ${expandedDepartures ? batches.length : Math.min(visibleCount,batches.length)} of ${batches.length} ${batches.length === 1 ? 'departure' : 'departures'}${filtered ? ' matching your filters' : ''}` : '';

        if (batches.length === 0) {
            const more = document.getElementById('moreDepartures'); if (more) more.hidden = true;
            grid.innerHTML = `
                <div class="upcoming-empty">
                    <i class="far fa-calendar-check" aria-hidden="true"></i>
                    <h3>${filtered ? 'No matching departures' : 'New departures are on the way'}</h3>
                    <p>${filtered ? 'Try another experience or departure date within our selected upcoming trips.' : 'Browse every adventure now and check back soon for the next batch dates.'}</p>
                    ${filtered ? '<button type="button" class="discovery-reset" data-reset-home>Reset filters</button>' : ''}
                    <a href="trips.html" class="btn btn-primary">Browse All Trips</a>
                </div>`;
            if (typeof grid.querySelector === 'function') {
                const reset = grid.querySelector('[data-reset-home]'); if (reset) reset.onclick = resetFilters;
            }
            return;
        }

        grid.innerHTML = batches.map((batch, batchIndex) => {
            const tripRows = batch.trips.map(trip => {
                const details = allTrips.find(item => item.id === trip.id) || {};
                const range = TripDateUtils.getUpcomingDateRanges(details, referenceDate).find(item => item.key === batch.key);
                const href = range && typeof TripLinks.departureUrl === 'function' ? TripLinks.departureUrl(trip.id, range.originalLabel) : TripLinks.detailUrl(trip.id);
                const extra = ['location', 'duration', 'difficulty'].filter(field => fields[field] && details[field])
                    .map(field => `<span class="batch-trip-detail">${escapeHTML(String(details[field]))}</span>`).join('');
                const imagePath = typeof TripDiscovery !== 'undefined' ? TripDiscovery.imagePath(details) : details.image;
                const image = fields.image && typeof HomepageSettings !== 'undefined' && HomepageSettings.safeImage(imagePath)
                    ? `<img class="batch-trip-thumbnail" src="${escapeHTML(imagePath)}" alt="" loading="lazy">` : '';
                return `
                <li class="batch-trip-row">
                    ${image}
                    <div class="batch-trip-copy">
                        <a href="${escapeHTML(href)}" class="batch-trip-title">
                            ${escapeHTML(String(trip.title || '').trim())}
                        </a>
                        ${fields.status ? '<span class="batch-trip-status">Scheduled</span>' : ''}
                        ${extra}
                        ${fields.location && details.departureCity ? `<span class="batch-trip-detail">Departs from ${escapeHTML(details.departureCity)}</span>` : ''}
                    </div>
                    ${fields.price ? `<span class="batch-trip-price">${escapeHTML(trip.price || '')}${trip.price ? '<small>per person</small>' : ''}</span>` : ''}
                </li>`;
            }).join('');

            return `
                <article class="batch-card" ${batchIndex >= visibleCount ? (expandedDepartures ? 'data-later-batch' : 'hidden data-later-batch') : ''}>
                    <header class="batch-card-header">
                        <i class="far fa-calendar-alt" aria-hidden="true"></i>
                        <div>
                            <time datetime="${batch.datetime}" class="batch-date">${escapeHTML(batch.dateLabel)}</time>
                            ${fields.weekday ? `<span class="batch-weekday">${escapeHTML(batch.weekdayLabel)}</span>` : ''}
                        </div>
                    </header>
                    <ul class="batch-trip-list">${tripRows}</ul>
                </article>`;
        }).join('');
        const more = document.getElementById('moreDepartures');
        if (more) { more.hidden = batches.length <= visibleCount; more.setAttribute('aria-expanded',String(expandedDepartures)); more.textContent=expandedDepartures?'Show fewer departures':'Show more departures'; more.onclick=()=>{const expanded=more.getAttribute('aria-expanded')==='true';expandedDepartures=!expanded;grid.querySelectorAll('[data-later-batch]').forEach(card=>card.hidden=expanded);more.setAttribute('aria-expanded',String(!expanded));more.textContent=expanded?'Show more departures':'Show fewer departures';if(status)status.textContent='Showing '+(expanded?Math.min(visibleCount,batches.length):batches.length)+' of '+batches.length+' departures';}; }
    }

    function renderFeaturedTrips(referenceDate) {
        const grid = document.getElementById('featured-trips-grid');
        if (!grid || typeof getFeaturedTrips !== 'function' || typeof TripDateUtils === 'undefined') return;

        const featuredTrips = getFeaturedTrips();
        const escapeHTML = TripDateUtils.escapeHTML;

        if (featuredTrips.length === 0) {
            grid.innerHTML = '<p class="trips-empty">No featured trips are available right now.</p>';
            return;
        }

        grid.innerHTML = featuredTrips.map(trip => {
            if (typeof TripDiscovery !== 'undefined') return TripDiscovery.renderCard(trip, referenceDate);
            const isInactive = trip.isActive === false;
            const inactiveClass = isInactive ? 'trip-inactive' : '';
            const title = String(trip.title || '').trim();
            const location = String(trip.location || '').trim();

            return `
                <article class="trip-card ${inactiveClass}">
                    <div class="trip-image">
                        <img src="${escapeHTML(trip.image || '')}" alt="${escapeHTML(title)}" loading="lazy">
                        <span class="trip-badge">${escapeHTML(trip.badge || 'Trip')}</span>
                        ${isInactive ? '<span class="trip-inactive-badge">Coming Soon</span>' : ''}
                    </div>
                    <div class="trip-content">
                        <h3>${escapeHTML(title)}</h3>
                        <p class="trip-location"><i class="fas fa-map-marker-alt" aria-hidden="true"></i> ${escapeHTML(location)}</p>
                        <div class="trip-meta">
                            <span><i class="fas fa-clock" aria-hidden="true"></i> ${escapeHTML(trip.duration || 'Multiple Days')}</span>
                            <span><i class="fas fa-signal" aria-hidden="true"></i> ${escapeHTML(trip.difficulty || 'Moderate')}</span>
                        </div>
                        ${TripDateUtils.renderTripDateTags(trip, referenceDate)}
                        <div class="trip-footer">
                            <span class="trip-price">${escapeHTML(trip.price || '')}</span>
                            <a href="${TripLinks.detailUrl(trip.id)}" class="btn btn-small">Explore</a>
                        </div>
                    </div>
                </article>`;
        }).join('');
        if (typeof TripDiscovery !== 'undefined') TripDiscovery.attachImageFallbacks(grid);
    }

    document.addEventListener('DOMContentLoaded', async function () {
        const referenceDate = new Date();
        renderFeaturedTrips(referenceDate);
        if (typeof HomepageSettings !== 'undefined') {
            const config = await HomepageSettings.load(window.fetch.bind(window));
            HomepageSettings.apply(config, document);
            const primary = document.querySelector('.hero .btn-primary');
            if (primary) primary.href = config.upcomingBatches.enabled ? '#upcoming-batches' : 'trips.html';
            const trust = document.getElementById('hero-trust'), rating = document.getElementById('hero-trust-rating'), link = document.getElementById('hero-trust-link');
            if (trust) trust.hidden = !config.sections.reviews.enabled;
            if (rating) rating.textContent = '⭐ ' + config.sections.reviews.rating + '/5 on Google';
            if (link) link.href = config.sections.reviews.googleMapsUrl;
            let controls;
            const update = state => renderUpcomingBatches(referenceDate, config, state, () => controls && controls.reset());
            // Homepage discovery is the single hero search across all published trips.
            const panel = document.getElementById('homepage-discovery-panel');
            if (panel) {
                panel.hidden = true;
                const mobile = typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 600px)') : null;
                panel.open = !mobile || !mobile.matches;
                if (mobile) mobile.addEventListener('change', event => { panel.open = !event.matches; });
            }
            update({ query: '', experience: 'all', departure: '' });
            setInterval(()=>{renderFeaturedTrips(new Date());renderUpcomingBatches(new Date(),config,{query:'',experience:'all',departure:''});},30000);
        } else {
            renderUpcomingBatches(referenceDate);
        }
    });
}());
