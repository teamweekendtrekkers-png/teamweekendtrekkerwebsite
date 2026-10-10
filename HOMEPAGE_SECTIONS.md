# Editable homepage sections

In the updated Trip Manager, open **Homepage Customization**, scroll below the
Upcoming Batches preview, and expand **Statistics**, **Why Travel With Us**,
**Google Reviews**, or **Bottom Call to Action**. Changes remain a draft until
**Publish homepage** is confirmed. The existing deployment link tracks that
homepage commit. Reload/back navigation asks before discarding unsaved edits.

- Statistics: edit values/labels, show/hide, add/remove and move items (up to 8).
- Why Travel With Us: edit heading, emoji, card titles/descriptions; show/hide,
  add/remove and order cards (up to 8).
- Reviews: edit heading, overall rating, Google Maps destination and button
  label. Add genuine review text/name, date label, stars and optional HTTPS
  photo/individual Google review link (up to 30). Show review chooses which
  reviews appear; arrow buttons set their slide order. New reviews start hidden
  and require a name/text before publication. Empty photos use initials;
  missing individual links open the business's configured Google Maps page.
- Bottom call to action: heading, supporting text, button labels and visibility.
  Existing trips/WhatsApp button destinations remain unchanged.

Reviews are **manually curated**, not scraped or automatically synchronized with
Google. The manager does not import a review merely from its URL, validate its
authenticity, or fetch live Google ratings. Keep excerpts, ratings and date
labels accurate and update them when needed. Only HTTPS Google Maps/review
hosts are accepted for review links. A Maps link is never relabeled as a direct
individual review unless you supply that review's share URL.

## Slider and compatibility

The slider shows three cards on desktop, two on tablets and one with a next-card
peek on phones. Visitors can swipe/scroll, use arrows or keyboard arrows, and
pause/play automatic sliding. Automatic sliding is configurable (4–30 seconds),
stops after manual interaction, pauses on hover/focus or a hidden document, and
is disabled for reduced-motion preferences. Single/empty selections do not
show unnecessary controls; the Google link remains available when no reviews
are selected. Failed photos fall back to initials.

Layout cues were taken from [Triptonique](https://triptonique.in/), while retaining
this website's branding and existing content. No content/assets were copied
from the reference and no carousel dependency, Google API key, or scraper was
introduced.

Only `js/homepage-config.json` is published by the editor, using the existing
optimistic-concurrency/atomic-commit service. Different section fields can merge;
simultaneous edits to the same item list conservatively block with a conflict
instead of dropping changes. Trip data, brochures, hero/batch controls,
payments, booking routes, settings storage and dependencies are unchanged.

Existing version-1 config files are unchanged and receive all original section
content as defaults. Disabling a section/list item is explicit; an empty list is
not repopulated. The static homepage remains a usable fallback without JS.
After the first publication of the new `sections` fields, older managers will
safely reject homepage editing rather than erase unfamiliar fields. Install the
updated manager before editing these sections; other trip management continues
to use its unchanged schema. Publishing/reloading resets field state to the
actual saved/reloaded values.

## Local checks

`node --test tests/*.test.js` and `bash validate-website.sh`.
For the optional real Chromium gate, install/provide Puppeteer outside the
website and run:

```sh
PUPPETEER_MODULE=/absolute/path/to/puppeteer CHROME_BIN=/absolute/path/to/chrome node scripts/check-homepage-sections-browser.cjs
```

The browser gate serves only local files and overrides configuration locally.
It checks responsive sliding, accessibility interactions, text/URL safety,
selection, empty/hidden states, photo fallback and unchanged action destinations.
It makes no website publication or Google review writes.

CI behavior tests use an immutable `tests/fixtures/homepage-defaults.json`, not
the manager-editable production configuration. A regression gate reruns those
tests with independently customized published settings to ensure legitimate
homepage edits do not break deployment validation. The actual published
configuration is separately checked for preserving its image and selections.
