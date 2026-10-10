# Homepage customization

Use the updated Trip Manager: **Settings → Homepage Customization**.

- Change the background using an `images/...` path, an HTTPS image URL, or
  **Upload background image**. Upload adds an image asset, but does not make it
  the live background until you publish the homepage. If an external image
  cannot load, the website retains its original background as a fallback.
- Edit the headline, tagline, description, and Upcoming Batches heading and
  subtitle. Existing Explore, booking, WhatsApp and Instagram links are kept.
- Keep automatic selection, or enable **Choose specific trips** and/or
  **Choose specific departures**. These two filters intersect. Selecting none
  means none; it does not silently revert to automatic mode.
- Choose 1–12 date groups and toggle price, status, weekday, location, duration,
  difficulty, and trip thumbnail. Names, date ranges and trip links stay visible.
- Use **Unsaved homepage preview**, then **Publish homepage**. The app shows a
  confirmation with the exact repository and branch, and offers deployment
  monitoring for the saved commit.

## Safety and compatibility

The dedicated root `js/homepage-config.json` file is the only file replaced by
homepage publication. Trip records, featured trips, payment/contact settings,
and booking pages are not regenerated. Image upload only adds an image asset.

Defaults reproduce the existing homepage. Missing, unavailable, malformed or
unsupported configuration falls back safely on the website. The manager
rejects unknown fields/versions and malformed configurations before writing.

Departures use the website's existing India-time date parser, chronological
grouping and deduplication. Inactive trips, deleted dates and expired departures
never appear, even if selected previously. Stale selections remain removable
in the editor. Selected ranges match by trip ID and normalized start/end dates.

Non-overlapping remote edits merge before publishing. True conflicts block the
save and retain the local draft. Reload explicitly confirms draft discard. The
GitHub commit validates the latest blob SHA and never force-rewrites history.

The preview uses current in-app trips; publish new trip/date edits separately
before relying on them on the live homepage. The existing calendar preview
continues to show the full, unfiltered schedule; the homepage editor preview
shows the homepage selection.

Deploy these website files and install the matching updated manager together.
Older managers can continue managing trips: homepage configuration is separate.
