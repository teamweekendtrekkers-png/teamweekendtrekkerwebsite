# 🏔️ Team Weekend Trekkers - Trip Management Guide

## 📁 Folder Structure

```
TravelBooking/
├── admin/
│   ├── trip-manager.py     ← Run this to manage trips
│   └── README.md           ← This file
├── images/
│   └── trips/              ← All trip photos go here
│       ├── netravati.jpg
│       ├── coorg.jpg
│       └── [trip-id].jpg
├── js/
│   └── trips-data.js       ← Main trip database
└── ... (other files)
```

---

## 🚀 Quick Start

### Run Trip Manager
```bash
cd admin
python3 trip-manager.py
```

---

## 📝 Common Tasks

### 💰 Change a Trip's Price
1. Open `js/trips-data.js`
2. Find the trip (use Ctrl+F)
3. Change: `price: "₹4,177",` → `price: "₹4,999",`
4. Save and refresh

### 📸 Update a Trip's Photo
1. Name your photo: `tripid.jpg` (e.g., `coorg.jpg`)
2. Copy to: `images/trips/`
3. Done! Website auto-updates

### 📅 Update Trip Dates
1. Open `js/trips-data.js`
2. Find the trip's `availableDates` array
3. Add/remove dates in format: `"Jan 11-12, 2026"`
4. Save and refresh

### ➕ Add a New Trip
1. Run: `python3 admin/trip-manager.py`
2. Choose option 1
3. Fill in trip details
4. Copy generated code to `js/trips-data.js`
5. Add photo to `images/trips/newtripid.jpg`

### ❌ Remove a Trip
1. Open `js/trips-data.js`
2. Delete the entire trip block (from `tripid: {` to `},`)
3. Optionally delete photo from `images/trips/`

---

## 📋 Trip Data Format

```javascript
tripid: {
    title: "Trip Title",
    location: "Location, State",
    badge: "Trek/Road Trip/etc",
    price: "₹X,XXX",
    image: "images/trips/tripid.jpg",
    distance: "XXX km from Bangalore",
    elevation: "X,XXX m",
    difficulty: "Easy/Moderate/Challenging",
    bestTime: "Oct - Feb",
    duration: "2D/1N",
    availableDates: ["Jan 11-12, 2026", "Jan 18-19, 2026"],
    about: "Description...",
    highlights: ["Item 1", "Item 2"],
    itinerary: [...],
    includes: ["Item 1", "Item 2"],
    excludes: ["Item 1", "Item 2"]
},
```

---

## 🏷️ Badge Options
- Trek
- Road Trip
- Backpacking
- Expedition
- Hill Station
- Adventure
- Cultural
- Backwaters
- Heritage
- Beach Trek
- Day Trip

---

## 📸 Photo Guidelines
- **Size**: 800x600 pixels (or 16:9 ratio)
- **Format**: JPG preferred
- **File size**: Under 500KB
- **Naming**: `tripid.jpg` (lowercase, no spaces)

---

## ⚠️ Important Notes

1. **Trip ID**: Must be lowercase, no spaces (use hyphens for multi-word: `nandi-hills`)
2. **Price Format**: Always `₹X,XXX` with rupee symbol and comma
3. **After changes**: Refresh browser with Ctrl+F5 to clear cache
4. **Backup**: Keep a backup of `trips-data.js` before major changes

---

## 🆘 Need Help?

Run the trip manager for guided assistance:
```bash
cd admin && python3 trip-manager.py
```
