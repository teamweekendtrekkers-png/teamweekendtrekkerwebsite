# Customer journey analytics

Apply supabase/migrations/20261021_journey_analytics.sql in the booking project before deploying the website. Verify the cron job twt-journey-retention is active (daily 02:17 UTC); it removes events older than 90 days and short-lived salted rate buckets older than one day. If pg_cron is unavailable, schedule public.twt_purge_journey() externally before enabling collection.

Manager > Customer journey uses the existing booking administrator account. No new password, API account or paid analytics provider is required. Raw event tables have no client access. Public collection accepts only predefined fields; administrator reports return aggregates.

The website asks before optional analytics starts and honours GPC and DNT. Preferences can be changed in the footer. No cookies are used for analytics; sessionStorage holds a random session UUID for at most 24 hours and a bounded source category, and localStorage holds the consent choice. No contact data, transaction IDs, full URLs, campaign names or recordings are collected. Service infrastructure may keep its normal request logs separately.

Counts begin at launch and include only consenting, unblocked visitors. Sessions are not people. The ordered funnel requires the same session and trip, in sequence, within the selected IST window. Direct checkout entries are reported separately. QR and copy clicks are engagement, not payments. Payment reports are browser events emitted only after server acceptance; retries are deduplicated per page. Team verification totals come separately from booking records in the selected creation-date cohort and reflect current review status. They include non-consenting visitors, have no session/device linkage, and do not prove seat confirmation.

Use the daily activity list to compare dates. Recent journeys can still be in progress. Client events are directional and can be blocked or spoofed; use booking records for operational and financial decisions.

Checks: node --test tests/journey-analytics.test.js tests/booking-client.test.js; node scripts/check-journey-analytics-browser.cjs; isolated PostgreSQL grant/cohort tests in CI; Manager service and phone/desktop widget tests.
