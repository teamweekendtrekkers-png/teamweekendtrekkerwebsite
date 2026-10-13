(function () {
    'use strict';

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
            ? (HomepageSettings.normalize(config).upcomingBatches.enabled ? TripDateUtils.buildUpcomingBatches(filteredTrips, referenceDate, Number.MAX_SAFE_INTEGER) : [])
            : typeof HomepageSettings === 'undefined'
            ? TripDateUtils.buildUpcomingBatches(allTrips, referenceDate, Number.MAX_SAFE_INTEGER)
            : HomepageSettings.buildBatches(allTrips, config, referenceDate);
        const fields = typeof HomepageSettings === 'undefined'
            ? { price: true, status: true, weekday: true }
            : HomepageSettings.normalize(config).upcomingBatches.fields;
        const escapeHTML = TripDateUtils.escapeHTML;
        const filtered = state && (state.query || state.experience !== 'all' || state.departure);
        const status = document.getElementById('homepage-discovery-status');
        if (status) status.textContent = '';

        if (batches.length === 0) {
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

        grid.innerHTML = batches.flatMap(batch => batch.trips.map(trip => {
            const details = allTrips.find(item => item.id === trip.id) || {};
            const range=TripDateUtils.getUpcomingDateRanges(details,referenceDate).find(item=>item.key===batch.key);
            return range ? TripDiscovery.renderDeparture({...details,id:trip.id},range) : '';
        })).join('');
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
            if (typeof TripDiscovery !== 'undefined') return TripDiscovery.renderCard(trip, referenceDate, {compact:true});
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
            let departureSnapshot=JSON.stringify(getAllTrips().map(t=>TripDateUtils.getUpcomingDateRanges(t,new Date()).map(r=>r.key)));
            setInterval(()=>{const next=JSON.stringify(getAllTrips().map(t=>TripDateUtils.getUpcomingDateRanges(t,new Date()).map(r=>r.key)));if(next!==departureSnapshot){departureSnapshot=next;renderFeaturedTrips(new Date());renderUpcomingBatches(new Date(),config,{query:'',experience:'all',departure:''});}},30000);
        } else {
            renderUpcomingBatches(referenceDate);
        }
    });
}());
