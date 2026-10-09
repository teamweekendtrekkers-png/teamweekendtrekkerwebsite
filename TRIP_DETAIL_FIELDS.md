# Custom trip detail sections

Each trip in the root `js/trips-data.js` supports two optional string lists:

```js
thingsToCarry: ['Raincoat', 'Power bank', 'Trekking shoes'],
perfectFor: ['Solo Travelers', 'Couples', 'Photographers'],
```

In the updated Trip Manager, open a trip and edit **Things to Carry** and
**Perfect For**, save the trip, then publish through the normal Save to GitHub
flow. Items can be added, renamed, or removed. **Use defaults** fills the list
with the original website labels so they can be edited.

Missing, empty, or whitespace-only lists show the original defaults. Existing
trips do not need a data migration. Labels are rendered as plain text; icons
are automatically chosen from familiar keywords, with a generic fallback.
These sections are per-trip, not site-wide settings.

Deploy the website changes and install the updated manager before publishing
custom audience tags. Older managers do not recognize `perfectFor` and will
safely block publication rather than discard it.

Run regressions with `node --test tests/*.test.js`.
