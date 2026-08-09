// ============================================
// FEATURED TRIPS CONFIGURATION
// ============================================
// 
// These trips will be displayed on the homepage
// in the "Upcoming Adventures" section.
// 
// Edit using Trip Manager → ⭐ Featured Trips
// Last updated: 2026-08-10 03:59
// ============================================

const featuredTripIds = [
    "rameshwaram-dhanushkodi",
    "wayanad",
    "wayanad-pool-party",
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
