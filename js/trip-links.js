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

    return {
        detailUrl,
        isLocalPreview
    };
}));
