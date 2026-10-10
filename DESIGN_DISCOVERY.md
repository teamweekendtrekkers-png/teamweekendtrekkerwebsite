# Trip discovery and decision-page update

## What changed

- A shorter homepage hero focuses on upcoming departures; Google-linked trust information uses the configured review rating.
- Customers can search destinations, trips and departure cities, then filter by experience or actual upcoming date ranges. Homepage filters cannot bypass the administrator's selected trips or departures.
- Shared trip cards show a cover, concise summary, location, duration, difficulty, departure city, dates and per-person price when those values exist. Scheduled trips appear before undated trips. Inactive trips remain accessible through **Show coming soon**.
- Mobile homepage filters are expandable; desktop filters stay open. Existing trip-type filters remain available.
- Trip detail pages show a clear heading and departure context, with shortcuts to dates, itinerary, inclusions and pickup information. Selected dates carry through to the existing booking form.
- Unsubstantiated crossed-out prices and calculated discount percentages were removed. Actual prices and checkout calculations are unchanged.
- Recognisable single-item legacy packing checklists are split for display only. Original packing content, dates and booking data are not rewritten.
- Default inclusive-language marketing copy now directs visitors to each package's actual inclusions.

## Edit from Trip Manager

Install the updated manager before publishing website records with the new fields. Older manager versions intentionally reject unsupported fields rather than silently deleting them.

1. Edit a trip, then find **Website trip card** after Gallery, immediately before Save.
2. Choose an optional card cover, a summary (up to 160 characters), departure city (up to 80 characters) and experience category. The preview uses unsaved trip data.
3. Save the trip and use the existing publication flow. Uploading a cover adds an image asset; it does not independently modify `trips-data.js`.
4. In Homepage Settings, **Trip discovery** controls search, experience and upcoming-date filters. Existing homepage trip/departure curation still applies.

The card image is separate from the existing display image and brochure/gallery images. Leaving it blank retains the original display image. Missing images have a safe logo fallback.

## Compatible optional schema

Existing records need no migration. Unedited records without these fields remain without them.

| Trip field | Accepted value |
| --- | --- |
| `cardImage` | Empty, an `images/...` path, or a safe HTTPS image URL |
| `cardSummary` | Text, maximum 160 trimmed characters |
| `departureCity` | Text, maximum 80 trimmed characters |
| `experience` | `trek`, `beach`, `heritage`, `getaway`, `adventure`, `other` |

Homepage configuration remains version 1. Its optional `discovery` object contains boolean `enabled`, `showSearch`, `showExperienceFilter` and `showWeekendFilter`, defaulting to true. Unknown manager schema fields or unsafe values block publication.

Google rating is shared across the trust strip, the reserved `rating` statistic and Google Reviews. Review text is administrator-curated and Google-linked, not automatically synchronised with Google. Custom statistic values remain independently editable.

## Safety and verification

No booking/payment implementation, checkout payload, dates, existing price, trip ID, featured membership, trip ordering in source, or existing homepage selections were changed. Additive metadata was applied to 13 active trips using existing trip information and existing image assets.

Regression checks include Node tests, Flutter unit/widget/golden tests, Android emulator tests with fake GitHub clients, and local Chromium checks covering discovery, detail/date handoff, reviews, accordions, brochures, checkout navigation and footer/payment preservation. See the manager's `DESIGN_DISCOVERY_VERIFICATION.md` for actual results and recovery locations.

Local implementation only: no GitHub push, live publication or live payment request was performed by this update.
