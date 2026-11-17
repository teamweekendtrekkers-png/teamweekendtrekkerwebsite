# Automatic Google reviews

The homepage supports two review modes in Website content → Reviews:
- Manual selection: existing selected reviews and order.
- Automatic five-star reviews: the five most recently updated five-star Google reviews with text. Google’s overall rating remains the rating of all reviews, not the selected five-star subset.

Manual selections remain saved and act as fallback if Google is unavailable. The browser uses dated reviews instead of stored “days ago” labels for the automatic feed. It refreshes on page load and every 15 minutes while the page is visible. Google content is cached only in function memory for 15 minutes, never committed to the repository or stored in local storage.

## One-time owner setup

1. Enable Google My Business API in the approved owner’s Cloud project.
2. Configure the owner’s OAuth consent/client, and complete Google account consent. Google’s Business Profile permission scope is `https://www.googleapis.com/auth/business.manage`; the integration code only reads reviews.
3. Store these private values in the existing Supabase project’s Edge Function Secrets (never homepage JSON, source code or chat):
   - `GOOGLE_REVIEW_CLIENT_ID`
   - `GOOGLE_REVIEW_CLIENT_SECRET`
   - `GOOGLE_REVIEW_REFRESH_TOKEN`
   - `GOOGLE_REVIEW_LOCATION` (`accounts/<account-id>/locations/<location-id>`)
4. Deploy `supabase/functions/google-reviews` with JWT verification enabled. Public site calls use the existing project’s public anon key from booking-config.json. No customer data or booking administrator session is needed.
5. Check Google connection in the manager. Switch to automatic and publish Reviews only when the connection is ready. Until then, leave Manual selection enabled.

An OAuth consent app left in Google’s Testing status can issue short-lived refresh credentials; production setup and any required Google verification must be completed before relying on unattended refresh. Revoked/expired access returns a safe unavailable response and the website keeps its manual fallback.

Upstream failures and secrets are never sent to site visitors. The function permits only GET/OPTIONS and reads only the single configured business location. It never replies to reviews or changes the business profile.
