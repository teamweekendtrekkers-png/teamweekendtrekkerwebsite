# QR and Copy UPI checkout

Trip Manager 1.8.0 makes payment the default for every bookable trip. In
**Payments & coupons → Allow booking requests for selected trips**, select only
the trips that may also offer **Request availability before paying**. Payment is
still selected first. Closed, inactive and expired departures cannot accept a new
payment submission.

## Two saved payment accounts

Choose **Edit payment account** to edit Primary or Backup. Each profile stores an
account label, UPI ID, receiver name and original QR image. Editing a profile does
not activate it. **Use this account**, then **Preview & Publish**, switches the
QR, displayed UPI ID, Copy button and receiver together. The other account remains
saved. No account-history tracking is added.

Existing settings migrate into Primary. Backup remains empty until configured;
it cannot be activated without a UPI ID, receiver name and QR image. Check that
each QR pays the displayed ID and receiver before publishing. Uploading stores
the original PNG/JPG/WebP in GitHub; publication makes that selection visible.
QR images are never cropped or passed through responsive image recompression.

Customers scan the QR, download it to choose inside their payment app, or copy
and paste the full UPI ID. There are no app-launch payment buttons. A missing QR
shows a fallback and leaves Copy UPI ID available.

## Customer flow

1. Enter contact and booking details. Change date or travellers directly on
   checkout; existing contact fields are retained and the quote is recomputed.
2. Continue to payment and choose a 50% advance or full payment. Check the amount
   and remaining balance. A static QR requires entering that amount in the app.
3. After paying, enter the transaction ID and confirm the payment was made.
4. An accepted submission displays the booking reference and **Payment details
   submitted — verification pending**. Share the screenshot through WhatsApp.

On selected trips, a customer may instead submit an availability request and
wait for team confirmation before paying. Submitting a request and reporting a
payment remain separate actions. No customer receipt/message is sent automatically.
The team verifies actual credit and availability before confirming a place.

## Release and private review

Deploy the updated booking-request function before merging the website change;
the older function restricts direct payments to approved departures. Pages builds
the current catalogue from the same payment/trip settings. The new catalogue also
omits manually closed departures. See CHECKOUT_RELEASE.md for release order.

The optional app booking-review screen requires the included database migration
and a separately authorized Supabase administrator. It records manual verification
without changing seat availability or booking confirmation. No service-role key
is placed in the app.

Run `node --test tests/*.test.js` and both checkout browser checks. Browser checks
mock every booking POST and perform no payment or customer notification.
