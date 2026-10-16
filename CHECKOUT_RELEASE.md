# Checkout and Trip Manager release

The website now uses QR scanning/download and Copy UPI ID. Checkout version 2
defaults to direct payment for every bookable departure. Only trips in
`payment.requestTripIds` also offer an availability request. A payment report is
customer-reported and never confirms money received or seat availability.

## Publish together

1. Deploy the updated `supabase/functions/booking-request/core.mjs` and existing
   `index.ts` to the existing booking-request function **before merging the
   website change**. The old function only accepts explicitly approved direct
   departures and would reject the new flow for other trips.
2. Merge the website change. Pages generates the authoritative booking catalogue
   including the v2 rules and omitting closed departures.
3. Build/install Trip Manager 1.8.1. In Payments & coupons, edit either of the two
   saved payment profiles. Each has its own label, UPI ID, receiver and original
   QR image. Choose Use this account, review the active account preview, then
   Preview & Publish. Only one profile is displayed. There is no account-history
   tracking. The existing QR and UPI ID are migrated to the primary profile; the
   backup is left empty until the manager configures it.
   The commerce document uses version 2 so older manager releases refuse to edit
   it rather than changing only half of a saved QR/UPI profile.
4. In the same screen, choose the trips that may offer Request availability before
   paying. Payment stays selected first. An empty list means every trip uses the
   payment flow only.

Verify both saved QR images against their UPI IDs and actual receiver names in
your payment app before switching. QR originals are never cropped or passed
through responsive image compression. Customers enter the displayed amount in
their UPI app and submit a transaction ID after paying.

## Optional private booking review

The app also includes Bookings & payment review. Apply
`supabase/migrations/20261016_booking_review.sql`, create/invite a Supabase Auth
user, and grant that user's **app_metadata** the boolean
`trip_manager_admin: true` through Supabase's trusted administrator tooling.
The account must sign in again after the claim changes. Do not use editable
user_metadata for this permission. Never put a service-role key into the app.
The database RPCs check this claim on every read and review, restrict searches
to 50 records per page, and reject stale simultaneous reviews.

Payment verification changes only payment-review fields. Availability and the
booking's existing confirmation status remain separate. The app keeps the login
token in memory, clears the password after login, and provides Sign out. Database
changes and account provisioning are separate from pushing source code.

## Departure controls and corrections

Trip Manager can duplicate a departure into a newly chosen range and close or
reopen bookings without deleting the date. `closedDepartures` stores canonical
range keys. Both website and app exclude those ranges, and the generated server
catalogue omits them. Existing bulk date tools, draft recovery, publishing status,
previews and conflict checks are retained.

Checkout edits dates and travellers in a modal, retaining contact details and
recomputing coupons and amounts. Submitted bookings cannot be silently changed.
Expired/closed dates replace loading text with a final unavailable state and
allow selecting another available departure. Banner headings are white; the
gallery traps focus, labels controls and restores focus; Show coming soon includes
inactive trips and active trips without bookable dates.

## Extra trip sections and compact checkout

In Trip Manager, open a trip's Website sections and choose Add section to create
an independent section such as Why choose us. Sections support text items,
optional item titles and icons, visibility, initial expansion and ordering among
extra sections. They appear after the standard information in generated pages,
the interactive website and previews. Existing highlights and shared defaults
are retained. Install version 1.8.1 before editing trips with extra sections.

Mobile checkout uses tighter cards and form spacing, with optional help inside
an expandable panel. Primary controls retain at least 44px touch targets. The
website uses soft brand-colour accents with dark readable text and white QR
backgrounds. Updated asset versions refresh returning browsers.

## Verification

Run `node --test tests/*.test.js`, then
`node scripts/check-payment-browser.cjs` and
`node scripts/check-checkout-v2-browser.cjs` with Playwright/Chromium. Browser
checks fulfil local assets offline and mock every booking POST. They exercise
mobile/desktop checkout, profile switching, amounts, coupons, transaction reports,
selected requests, date recovery and gallery keyboard focus. No payment or
customer notification is performed by these checks.
