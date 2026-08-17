(function () {
    'use strict';

    function getAllTrips() {
        if (typeof tripsData !== 'object' || tripsData === null) return [];
        return Object.entries(tripsData).map(([id, trip]) => ({ id, ...trip }));
    }

    function renderUpcomingBatches(referenceDate) {
        const grid = document.getElementById('upcoming-batches-grid');
        if (!grid || typeof TripDateUtils === 'undefined') return;

        const batches = TripDateUtils.buildUpcomingBatches(getAllTrips(), referenceDate, 3);
        const escapeHTML = TripDateUtils.escapeHTML;

        if (batches.length === 0) {
            grid.innerHTML = `
                <div class="upcoming-empty">
                    <i class="far fa-calendar-check" aria-hidden="true"></i>
                    <h3>New departures are on the way</h3>
                    <p>Browse every adventure now and check back soon for the next batch dates.</p>
                    <a href="trips.html" class="btn btn-primary">Browse All Trips</a>
                </div>`;
            return;
        }

        grid.innerHTML = batches.map(batch => {
            const tripRows = batch.trips.map(trip => `
                <li class="batch-trip-row">
                    <div class="batch-trip-copy">
                        <a href="${TripLinks.detailUrl(trip.id)}" class="batch-trip-title">
                            ${escapeHTML(String(trip.title || '').trim())}
                        </a>
                        <span class="batch-trip-status">Upcoming</span>
                    </div>
                    <span class="batch-trip-price">${escapeHTML(trip.price || '')}</span>
                </li>`).join('');

            return `
                <article class="batch-card">
                    <header class="batch-card-header">
                        <i class="far fa-calendar-alt" aria-hidden="true"></i>
                        <div>
                            <time datetime="${batch.datetime}" class="batch-date">${escapeHTML(batch.dateLabel)}</time>
                            <span class="batch-weekday">${escapeHTML(batch.weekdayLabel)}</span>
                        </div>
                    </header>
                    <ul class="batch-trip-list">${tripRows}</ul>
                </article>`;
        }).join('');
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
    }

    document.addEventListener('DOMContentLoaded', function () {
        const referenceDate = new Date();
        renderUpcomingBatches(referenceDate);
        renderFeaturedTrips(referenceDate);
    });
}());
