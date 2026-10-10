(function (root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    root.TripLinks = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const LOCAL_HOSTS = new Set([
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '::1',
        '[::1]'
    ]);

    function isLocalPreview(locationLike) {
        const currentLocation = locationLike || (
            typeof globalThis !== 'undefined' ? globalThis.location : null
        );
        if (!currentLocation) return false;
        return currentLocation.protocol === 'file:' || LOCAL_HOSTS.has(currentLocation.hostname);
    }

    function detailUrl(tripId, locationLike) {
        const encodedTripId = encodeURIComponent(String(tripId));
        return isLocalPreview(locationLike)
            ? `trip-detail.html?trip=${encodedTripId}`
            : `trips/${encodedTripId}/`;
    }

    // Carry the chosen departure without changing legacy detail links or routes.
    // The destination page validates the date against the trip's upcoming ranges.
    function departureUrl(tripId, date, locationLike) {
        const url = detailUrl(tripId, locationLike);
        if (typeof date !== 'string' || !date.trim()) return url;
        return `${url}${url.includes('?') ? '&' : '?'}date=${encodeURIComponent(date)}`;
    }

    return {
        detailUrl,
        departureUrl,
        isLocalPreview
    };
}));
