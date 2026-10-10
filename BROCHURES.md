# Shareable trip brochures

Every trip detail page, including generated `/trips/<id>/` pages, now has a
**Brochure (PDF)** button beside its booking form. Open it to review the trip,
then choose **Download PDF**. A **Share PDF** button appears when the browser
supports native file sharing; otherwise share the downloaded file normally.
Generating the PDF never submits the booking form or changes the trip.

The PDF includes trip facts, price, current/upcoming dates, overview, highlights,
every itinerary day/activity, inclusions/exclusions, boarding points, packing
items, audience labels, booking URL and WhatsApp contact. If a currently valid
date is selected in the booking form, that departure is used. Otherwise all
current/upcoming dates are included. Inactive trips are marked unavailable;
expired, invalid or removed dates are never advertised. Empty itinerary days
remain visible with a details-to-be-confirmed message.

## Manage the brochure from Trip Manager

Edit the trip's existing fields as usual. Under **Itinerary**, select
**Brochure (PDF)** to preview unsaved changes, then **Share / save PDF**.
This export is independent of saving or publishing. Publish the trip normally
to update the brochure customers download from the website. No new trip fields,
settings migrations, PDF uploads or GitHub permissions are needed.

## Format and safety

Brochures are locally generated, branded, multipage A4 PDFs. Pages are rendered
as images to preserve system Unicode fonts, rupee symbols and emoji without
fetching third-party fonts or PDF libraries. The booking footer is clickable.
Body text is not selectable/searchable and the PDF is not accessibility-tagged.
Dates/prices include a reminder to confirm availability before booking.

There are no new packages, CDN scripts, server endpoints or live writes.
Administrator labels are plain text, not HTML or PDF commands. Filenames are
sanitized. Very large exports fail with an error instead of silently truncating
content (500,000 characters / 100 pages). Download remains available where
native sharing is unsupported or denied. Actual delivery through a particular
messaging app depends on that app being installed and accepting PDF files.

Deploy the website files and install the updated manager to use both controls. Existing
trip data, featured/homepage configuration, checkout/payment/WhatsApp actions
and generated-page routing remain unchanged.
