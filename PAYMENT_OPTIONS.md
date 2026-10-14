# Payment options and QR controls

In Trip Manager 1.6.0, open **Payments → Payment mode** and choose **Pay after confirmation**, **Pay directly**, or **Offer both options**. Existing settings default to confirmation-first.

For direct payment, expand **Approve direct-payment departures** and select the trips and date ranges you approve. Approvals are independent of homepage Upcoming Batches selection. Unapproved, missing, inactive or closed departures do not offer direct payment. There is no automatic seat reservation or capacity guarantee.

## QR section

Under **Payments → UPI QR code**, upload or replace the original PNG/JPG/WebP image, preview it, edit instructions and switch **Show UPI QR section** on or off. Hiding retains the image for later reuse; removing clears its configuration without deleting the uploaded original. The QR is displayed without cropping or responsive recompression. Check the QR's destination and receiver name against your UPI account before publishing. The customer must enter the displayed advance/full amount when using a static QR. A missing image shows a fallback and leaves the UPI buttons available.

The app uploads QR originals to GitHub immediately, but checkout uses the selected image only after **Preview & Publish**. Publication checks the current repository files and retains local edits on conflict.

## Customer paths and team notifications

- **Request first:** submitting contact details saves a booking request. The customer sees “Booking request received” and waits for team confirmation before paying. Team alerts remain booking requests.
- **Direct payment:** contact details open payment instructions without creating a booking record or reporting payment. Customers choose a 50% advance or full payment. They then enter their UPI transaction ID, affirm that they have paid, and submit a payment report. Only an accepted report displays “Payment details submitted — verification pending.” The team receives a **Payment Verification Request** with the amount and transaction ID.
- **Already paid after team confirmation:** the “I've paid” action prepares the payment details for sharing on WhatsApp against the existing booking. It does not create a second booking record.
- **Send booking details on WhatsApp:** appears after successful submission. It includes the customer's name/phone, trip, departure, traveller count, amount, payment choice and booking reference. Direct-payment messages also include the reported transaction ID. Customers tap the button and then press **Send** in WhatsApp. No message or receipt is sent automatically.

Payment app opening, QR scanning, and a customer's transaction ID are not bank verification. The team must verify the actual credit and availability before confirming a place. Payment and remaining balance use paise precision. Checkout rechecks payment settings and booking cutoff before opening a UPI app or saving a payment report.

## Booking service release

The Pages build includes payment rules in the authoritative booking catalogue. Deploy the matching `supabase/functions/booking-request/core.mjs` together with the existing request handler before enabling direct payment. It validates approved departures and reported amounts, and distinguishes email and Telegram alerts. The existing database schema is retained: payment reports are tagged inside `special_requests`; status remains pending. No automatic payment verification or payment-status dashboard is introduced.

Run `node --test tests/*.test.js` and `scripts/check-payment-browser.cjs` with Playwright and a local Chromium executable. Browser checks mock every external booking POST and never send messages or perform payments.
