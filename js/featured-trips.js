// ============================================
// FEATURED TRIPS CONFIGURATION
// ============================================
// 
// These trips will be displayed on the homepage
// in the "Upcoming Adventures" section.
// 
// Edit using Trip Manager → ⭐ Featured Trips
// Last updated: 2026-02-21 16:04
// ============================================

const featuredTripIds = [
    "rameshwaram-dhanushkodi",
    "yercaud",
    "nandi-hills",
    "gokarna-new-year-party",
    "varkala-kochi-christmas",
    "kannur-theyyam",
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
