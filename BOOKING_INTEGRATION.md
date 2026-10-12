# Booking storage and team alerts

The checkout sends one booking request to a Supabase Edge Function. The function validates the published trip catalogue, saves the request, and attempts Telegram and Web3Forms delivery independently. A saved request remains accepted if either provider fails. Customer-facing text continues to require team availability and payment confirmation.

## Release

1. Apply `supabase/migrations/20261012_booking_service.sql` to the existing project. The migration preserves RLS and limits helper RPCs to the service role.
2. Save `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` and `WEB3FORMS_ACCESS_KEY` in Supabase Edge Function Secrets. Never put secret keys or bot tokens in this repository.
3. Deploy `supabase/functions/booking-request` with legacy JWT verification enabled. The default Supabase server secrets provide database access. If deploying through the dashboard editor, concatenate `core.mjs` and `index.ts` after removing the relative import from `index.ts`.
4. Publish the staged website with `js/booking-config.json` disabled. The Pages build generates `js/booking-catalog.json` from the same trip and coupon settings used by the website.
5. Put the project's **public legacy anon JWT** into `booking-config.json` (never a service-role JWT or an `sb_secret_` key). Verify a dummy booking, its saved row, Telegram receipt and email inbox receipt before setting `enabled` to true.

## Delivery and recovery

The UUID in each request protects against duplicate database records. A fingerprint rejects reuse of a UUID for different details. RPC delivery leases prevent simultaneous sends for the same channel. Temporary HTTP 5xx responses receive one immediate retry. Each channel is capped at five claims.

Provider acceptance does not establish final inbox delivery. A network timeout can leave delivery uncertain; later retries can create duplicate notifications with the same booking reference. No customer payment is collected by this function.

For failed/pending notifications, an administrator can POST to `/functions/v1/booking-request/retry` using the private legacy service-role JWT. This processes up to five eligible rows and does not resend channels marked sent. No periodic retry schedule is installed. Review `telegram_status`, `email_status`, attempts and error fields in the bookings table. Errors stored there are generic and omit provider responses, tokens and personal details.

Rate limits allow up to five new requests per contact identity and twenty per gateway IP in each ten-minute bucket. Stored rate keys are salted hashes, and old buckets are removed during accepted requests. CORS limits browser origins but is not an abuse control by itself.

## Verification

Run `node --test tests/booking-service.test.js tests/booking-client.test.js`. These check server pricing and departure validation, coupon validity, duplicate/conflicting requests, notification isolation, delivery leases, bounded retries, and frontend failure handling. GitHub's existing validation workflow checks the entire repository before publishing.

To roll back the checkout, set `enabled` to false and publish that configuration. The existing Web3Forms handler is retained for this staged release and rollback. Saved bookings and notification history remain in Supabase.
