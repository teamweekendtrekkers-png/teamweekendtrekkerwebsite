// ============================================
// FEATURED TRIPS CONFIGURATION
// ============================================
// 
// These trips will be displayed on the homepage
// in the "Upcoming Adventures" section.
// 
// Edit using Trip Manager → ⭐ Featured Trips
// Last updated: 2026-04-21 01:55
// ============================================

const featuredTripIds = [
    "rameshwaram-dhanushkodi",
    "kannur-theyyam",
    "dandeli",
    "varkala-kochi-christmas",
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
