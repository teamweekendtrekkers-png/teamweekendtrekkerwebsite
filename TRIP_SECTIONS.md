# Collapsible trip information

About This Trip, What Makes It Special, and What's Included & Excluded now
use independent, keyboard-accessible native accordions. They match the
itinerary's bordered-card style without changing its day controls.

## Trip Manager controls

Open a trip in Trip Manager and scroll to **Website section display**, below
Perfect For. Each switch chooses whether its section starts expanded. Save
the trip, then use the existing Publish/Save to GitHub action. These preferences
are per trip, not global. The text/list editors remain unchanged.

The optional website field is:

```js
expandedSections: ["about", "includes"]
```

Supported values are `about`, `highlights`, and `includes` (Includes and Excludes
together). Missing or empty means all three start collapsed. Visitors can
open any combination; their clicks do not alter the saved settings. Unknown
values, duplicates, and invalid types block publication in the updated app.
Trips edited without touching these controls retain an absent field.

## Safety and accessibility

- Native summary controls support mouse, touch, Enter, and Space, with visible
  focus and expand/collapse indicators. No new dependencies are required.
- Without JavaScript, the template keeps all three sections open so content
  remains accessible.
- Printing opens all three and restores the visitor's previous state afterward,
  including when the print dialog is cancelled.
- PDF brochures always contain the full trip details, regardless of accordion
  state. Booking, dates, checkout, prices, payment details, and itinerary
  behavior are unchanged.
- Existing `trips-data.js`, featured IDs, and homepage choices are not rewritten
  by this implementation. Trip Manager publishes an optional preference through
  its existing source-preserving, atomic, conflict-checked workflow.

Deploy the website support before distributing the updated app. Older app
versions deliberately refuse to publish unfamiliar trip fields rather than
silently discard them; use the updated app after publishing these preferences.

## Verification commands

```sh
node --test tests/*.test.js
bash validate-website.sh
```

The optional real-browser gate in `scripts/check-trip-sections-browser.cjs`
uses an already installed Puppeteer/Chromium via `PUPPETEER_MODULE` and
`CHROME_BIN`. It serves only local fixtures/data and never publishes changes.
