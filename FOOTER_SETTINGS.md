# Editable website footer

Open **Homepage Customization → Website Footer (all pages)** in the updated
Trip Manager. Edit the footer brand, community description, address, headings,
essential link labels, optional email, social icons and copyright text.
`{year}` and `{brand}` in the copyright are substituted automatically.

Home, All Trips, About Us and Contact remain mandatory links. You can add up to
eight information links to those existing pages (optionally with a fragment)
or HTTPS documents/pages, reorder them, hide individual links, or remove them.
No legal policy content or unavailable policy routes are invented.

Turn off **Show Pay via UPI in footer** to hide that complete footer column,
including its masked ID and any existing Copy UPI button. This is a display
preference only: checkout UPI, actual payment IDs, booking and payment handlers
are unchanged. Use **Settings → Website Contact & Payment** to change the
actual UPI ID or website-wide WhatsApp number.

Optional footer WhatsApp/Instagram overrides affect only the footer. Leave them
blank to inherit the current HTML links maintained by the existing contact
synchronization. Hiding social icons does not remove the contact text links.

Changes remain local draft edits until **Publish homepage** is confirmed.
The existing atomic, conflict-aware service publishes only
`js/homepage-config.json`, under the new `footer` key. Install the updated
manager before publishing: older managers reject unfamiliar fields safely
rather than silently discard them.

The shared footer applies to Home, Trips, trip details (including generated
trip URLs), About and Contact. Checkout retains its compact footer; its
copyright/social settings update without introducing a payment column.
Existing version-1 configurations without `footer` retain the default visible
UPI behavior. Until valid settings load, or if loading fails/JavaScript is
disabled, footer UPI stays hidden; essential static navigation remains usable.
The published configuration and trip data were not modified during development.

## Local regression checks

```sh
node --test tests/*.test.js
bash validate-website.sh
PUPPETEER_MODULE=/path/to/puppeteer CHROME_BIN=/path/to/chrome node scripts/check-footer-browser.cjs
```

The browser check uses only a local server and fake configuration, blocks
external requests, compares booking/payment DOM against the original HTML,
and covers desktop/tablet/mobile, generated trip pages, UPI copy, contact
override/reset, selected links, text safety and offline/no-JavaScript behavior.
Existing homepage and trip-section browser gates also remain available in
`scripts/`. No live booking/payment or website publication is performed.
