# Team Weekend Trekkers - Android App Context Document

## Project Overview

**App Name:** Team Weekend Trekkers  
**Platform:** Android (Kotlin/Jetpack Compose)  
**Target Audience:** Adventure seekers, solo travelers, groups looking for weekend trips from Bangalore  
**Business Model:** Trek/Trip booking platform with online payments

---

## 1. App Features & Screens

### 1.1 Home Screen
- **Hero Banner:** Featured trips carousel with auto-scroll
- **Quick Stats:** Total trips, happy travelers, years of experience
- **Featured Trips:** Grid/List of highlighted upcoming trips
- **Categories:** Treks, Road Trips, Beach, Hill Station, Heritage, Adventure
- **Search Bar:** Search trips by name, location, or type
- **Bottom Navigation:** Home, Trips, Bookings, Profile

### 1.2 Trips Listing Screen
- **Filter Options:**
  - Duration (1 Day, 2D/1N, 3D/2N, etc.)
  - Difficulty (Easy, Moderate, Hard)
  - Price Range (slider)
  - Location (Karnataka, Kerala, Tamil Nadu, etc.)
  - Trip Type (Trek, Road Trip, Beach, etc.)
- **Sort Options:** Price (Low-High, High-Low), Popularity, Date
- **Trip Cards:** Image, Title, Price, Duration, Difficulty badge, Rating
- **Inactive Trip Handling:** Use `isActive` flag to grey out unavailable trips

#### Grey Out Inactive Trips Implementation
```kotlin
// In TripCard composable or RecyclerView adapter
@Composable
fun TripCard(trip: Trip, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .alpha(if (trip.isActive) 1f else 0.5f)
            .clickable(enabled = trip.isActive) { onClick() }
    ) {
        // Card content
        if (!trip.isActive) {
            // Show "Coming Soon" or "Not Available" overlay
            Box(modifier = Modifier.fillMaxSize()) {
                Text(
                    text = "Coming Soon",
                    modifier = Modifier.align(Alignment.Center),
                    style = MaterialTheme.typography.labelLarge
                )
            }
        }
    }
}

// Or in RecyclerView adapter
class TripViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
    fun bind(trip: Trip) {
        itemView.alpha = if (trip.isActive) 1.0f else 0.5f
        itemView.isClickable = trip.isActive
        comingSoonBadge.visibility = if (trip.isActive) View.GONE else View.VISIBLE
    }
}
```

### 1.3 Trip Detail Screen
- **Image Gallery:** Swipeable images with fullscreen lightbox
- **Trip Info Header:**
  - Title, Location, Price
  - Badges (Weekend Trek, Road Trip, etc.)
  - Rating & Reviews count
- **Trek at a Glance:** Grid with Distance, Elevation, Difficulty, Best Time, Duration, Group Size
- **About Section:** Trip description with expandable text
- **Highlights:** Bullet list of key attractions
- **Itinerary:** Day-wise expandable accordion
  - Day 0: Night Departure
  - Day 1: Activities
  - Day 2: Return
- **Pickup Points Table:**
  - Location, Time columns
  - Majestic, Koramangala, Silk Board, Electronic City
- **Inclusions/Exclusions:** Two-column layout with ✅/❌ icons
- **Policies Section:**
  - Cancellation Policy (color-coded cards)
  - Payment Policy
  - Important Notes
- **Guidelines:** Grid with icons (What to carry, Rules, etc.)
- **FAQ Accordion:** Common questions with expandable answers
- **Date Selection:** Calendar/Date picker for available dates
- **Book Now Button:** Sticky bottom CTA

### 1.4 Booking Flow
1. **Select Date:** From available dates calendar
2. **Traveler Details:**
   - Number of travelers
   - For each: Name, Age, Gender, Phone, Email
   - Emergency Contact
3. **Pickup Point Selection:** Radio buttons
4. **Payment Options:**
   - Full Payment (100%)
   - Advance Payment (50%) - remaining before trip
5. **Payment Gateway:** Razorpay integration
   - UPI (with deep links for PhonePe, GPay, Paytm)
   - Cards
   - Net Banking
   - Wallets
6. **Booking Confirmation:** Success screen with booking ID

### 1.5 My Bookings Screen
- **Tabs:** Upcoming, Completed, Cancelled
- **Booking Card:**
  - Trip image & name
  - Date & Status badge
  - Payment status (Paid/Partial/Pending)
  - View Details CTA
- **Booking Details:**
  - Trip info
  - Traveler list
  - Payment breakdown
  - Pickup point & time
  - Download ticket/invoice
  - Cancel booking option
  - Contact coordinator

### 1.6 Profile Screen
- **User Info:** Name, Photo, Phone, Email
- **Edit Profile**
- **Saved Travelers:** Quick add for repeat bookings
- **Payment History**
- **Notifications Settings**
- **Help & Support**
- **About Us**
- **Terms & Conditions**
- **Logout**

### 1.7 Additional Screens
- **Splash Screen:** Logo animation
- **Onboarding:** 3-4 slides introducing app features
- **Login/Signup:** Phone OTP based
- **Notifications:** Trip reminders, offers, updates
- **Reviews:** View & submit trip reviews with photos

---

## 2. Data Models

### 2.1 Trip Model
```kotlin
data class Trip(
    val id: String,
    val title: String,
    val location: String,
    val badge: String,
    val price: Int,
    val originalPrice: Int?,
    val discount: Int?,
    val image: String,
    val gallery: List<String>,
    val distance: String,
    val elevation: String,
    val difficulty: String,
    val bestTime: String,
    val duration: String,
    val groupSize: String,
    val availableDates: List<String>,
    val about: String,
    val highlights: List<String>,
    val itinerary: List<ItineraryDay>,
    val pickupPoints: List<PickupPoint>,
    val includes: List<String>,
    val excludes: List<String>,
    val cancellationPolicy: List<PolicyItem>,
    val guidelines: List<Guideline>,
    val faqs: List<FAQ>,
    val rating: Float,
    val reviewCount: Int,
    val isActive: Boolean
)

data class ItineraryDay(
    val day: String,
    val title: String,
    val activities: List<String>
)

data class PickupPoint(
    val location: String,
    val landmark: String,
    val time: String
)

data class PolicyItem(
    val condition: String,
    val charge: String,
    val color: String
)

data class Guideline(
    val icon: String,
    val title: String,
    val items: List<String>
)

data class FAQ(
    val question: String,
    val answer: String
)
```

### 2.2 Booking Model
```kotlin
data class Booking(
    val id: String,
    val tripId: String,
    val userId: String,
    val tripDate: String,
    val travelers: List<Traveler>,
    val pickupPoint: String,
    val totalAmount: Int,
    val amountPaid: Int,
    val paymentStatus: PaymentStatus,
    val bookingStatus: BookingStatus,
    val createdAt: Long,
    val paymentId: String?,
    val coordinatorPhone: String
)

data class Traveler(
    val name: String,
    val age: Int,
    val gender: String,
    val phone: String,
    val email: String,
    val isEmergencyContact: Boolean
)

enum class PaymentStatus { PENDING, PARTIAL, PAID, REFUNDED }
enum class BookingStatus { CONFIRMED, CANCELLED, COMPLETED }
```

### 2.3 User Model
```kotlin
data class User(
    val id: String,
    val name: String,
    val phone: String,
    val email: String?,
    val photoUrl: String?,
    val savedTravelers: List<Traveler>,
    val createdAt: Long
)
```

---

## 3. API Endpoints (Backend Required)

### Trips
```
GET    /api/trips                    # List all trips (with filters)
GET    /api/trips/{id}               # Get trip details
GET    /api/trips/featured           # Featured trips for home
GET    /api/trips/{id}/availability  # Check date availability
```

### Bookings
```
POST   /api/bookings                 # Create booking
GET    /api/bookings                 # User's bookings
GET    /api/bookings/{id}            # Booking details
PUT    /api/bookings/{id}/cancel     # Cancel booking
```

### Payments
```
POST   /api/payments/create-order    # Create Razorpay order
POST   /api/payments/verify          # Verify payment signature
GET    /api/payments/{bookingId}     # Payment history
```

### Users
```
POST   /api/auth/send-otp            # Send OTP
POST   /api/auth/verify-otp          # Verify & login
GET    /api/users/profile            # Get profile
PUT    /api/users/profile            # Update profile
```

### Reviews
```
GET    /api/trips/{id}/reviews       # Trip reviews
POST   /api/trips/{id}/reviews       # Add review
```

---

## 4. Third-Party Integrations

### 4.1 Razorpay Payment Gateway
- **SDK:** razorpay-android
- **Features:**
  - UPI Intent (PhonePe, GPay, Paytm)
  - Cards (Credit/Debit)
  - Net Banking
  - Wallets
- **Webhook:** Payment success/failure callbacks

### 4.2 Firebase Services
- **Authentication:** Phone OTP
- **Cloud Messaging:** Push notifications
- **Analytics:** User tracking
- **Crashlytics:** Crash reporting
- **Remote Config:** Feature flags, dynamic content

### 4.3 Other
- **Coil/Glide:** Image loading
- **Google Maps SDK:** Pickup point locations
- **WhatsApp Business API:** Direct chat with coordinator

---

## 5. Technical Stack (Recommended)

### Architecture
- **Pattern:** MVVM + Clean Architecture
- **DI:** Hilt/Dagger
- **Navigation:** Jetpack Navigation Component

### UI
- **Framework:** Jetpack Compose
- **Design System:** Material 3
- **Theme:** Green (#22C55E) primary, Dark mode support

### Networking
- **HTTP Client:** Retrofit + OkHttp
- **Serialization:** Kotlinx Serialization / Moshi
- **Image Loading:** Coil

### Local Storage
- **Database:** Room
- **Preferences:** DataStore
- **Cache:** OkHttp Cache

### Testing
- **Unit Tests:** JUnit, MockK
- **UI Tests:** Compose Testing, Espresso

---

## 6. Pickup Points (Common Data)

| Location | Landmark | Typical Time |
|----------|----------|--------------|
| Majestic | Metro Station / Shantala Silks | 8:30 PM - 10:00 PM |
| Koramangala | Kota Kochari, Opp Forum Mall | 8:55 PM - 10:30 PM |
| Silk Board | Silk Board Junction | 9:10 PM - 10:50 PM |
| Electronic City | Infosys Gate | 9:50 PM - 11:30 PM |

---

## 7. Current Trip Categories & Count

| Category | Count | Examples |
|----------|-------|----------|
| Weekend Trek | 5 | Netravati, Kudremukh, Kumara Parvatha |
| Road Trip | 8 | Coorg, Rameshwaram, Hampi |
| Beach | 4 | Gokarna, Pondicherry, Goa |
| Hill Station | 5 | Ooty, Chikmagalur, Wayanad |
| Heritage | 3 | Hampi, Rameshwaram-Thanjavur |
| Backwaters | 3 | Kerala, Alleppey-Varkala |
| Cultural | 2 | Kannur Theyyam |
| Adventure | 3 | Scuba Diving, Rafting |
| **Total** | **30** | |

---

## 8. Cancellation Policy (Standard)

| Time Before Trip | Refund |
|------------------|--------|
| 6+ days | 75% refund (25% fee) |
| 4-6 days | 50% refund |
| < 3 days | No refund |

---

## 9. Payment Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ Select Date │ ──► │ Add Travelers│ ──► │ Choose      │
│ & Travelers │     │ Details      │     │ Payment %   │
└─────────────┘     └──────────────┘     └─────────────┘
                                                │
                                                ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ Booking     │ ◄── │ Verify       │ ◄── │ Razorpay    │
│ Confirmed   │     │ Payment      │     │ Checkout    │
└─────────────┘     └──────────────┘     └─────────────┘
```

---

## 10. Notifications

| Type | Trigger | Content |
|------|---------|---------|
| Booking Confirmed | Payment success | Trip details, pickup info |
| Payment Reminder | 3 days before (if partial) | Remaining amount due |
| Trip Reminder | 1 day before | Pickup point, time, coordinator |
| Trip Started | Trip start time | Have a great trip! |
| Review Request | 1 day after trip | Rate your experience |
| New Trip Alert | New trip added | Check out our new trip! |
| Offer Alert | Discount available | Limited time offer |

---

## 11. Contact & Support

- **Phone:** 7019235581
- **WhatsApp:** wa.me/917019235581
- **Email:** Teamweekendtrekkers@gmail.com
- **Instagram:** @teamweekendtrekkers
- **Website:** teamweekendtrekkers.com

---

## 12. Future Enhancements

1. **Group Booking:** Create/join travel groups
2. **Referral Program:** Earn credits for referrals
3. **Loyalty Points:** Rewards for repeat travelers
4. **Trip Wishlist:** Save trips for later
5. **Social Features:** Trip photos, travel buddies
6. **Live Tracking:** Real-time trip location
7. **Offline Mode:** Downloaded trip details
8. **Multi-language:** Kannada, Hindi support

---

## 13. Design Assets Required

- [ ] App Icon (512x512 for Play Store)
- [ ] Splash Screen
- [ ] Onboarding illustrations
- [ ] Empty states illustrations
- [ ] Category icons
- [ ] Badge icons (Trek, Road Trip, etc.)
- [ ] Guideline icons
- [ ] Loading animations (Lottie)

---

## 14. Play Store Metadata

**App Name:** Team Weekend Trekkers - Trips & Treks  
**Short Description:** Book weekend treks & trips from Bangalore. Explore South India!  
**Category:** Travel & Local  
**Content Rating:** Everyone  
**Target SDK:** 34 (Android 14)  
**Min SDK:** 24 (Android 7.0)

---

*Document Version: 1.0*  
*Created: January 4, 2026*  
*Based on Website: teamweekendtrekkers.com*
