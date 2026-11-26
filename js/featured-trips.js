// ============================================
// FEATURED TRIPS CONFIGURATION
// ============================================
// 
// These trips will be displayed on the homepage
// in the "Upcoming Adventures" section.
// 
// Edit using Trip Manager → ⭐ Featured Trips
// Last updated: 2026-08-10 16:18
// ============================================

const featuredTripIds = [
    "kannur-theyyam",
    "gokarna-new-year-party",
    "varkala-kochi-christmas",
    "rameshwaram-dhanushkodi",
    "scuba-day-trip",
    "trip_1792519339566",
    "trip_1793817467369",
];

// Function to get featured trips data
function getFeaturedTrips() {
    return featuredTripIds.map(id => {
        const trip = tripsData[id];
        if (trip) {
            return { id, ...trip };
        }
        return null;
    }).filter(t => t !== null);
}
