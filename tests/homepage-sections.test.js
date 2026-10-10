const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const sections = require('../js/homepage-sections');
const settings = require('../js/homepage-settings');
const normalize = raw => sections.normalize(raw, settings.safeImage);

test('legacy config keeps existing six reviews, statistics, reasons, CTA, dates and actions', () => {
    const html = fs.readFileSync(require.resolve('../index.html'), 'utf8');
    const result = settings.normalize(require('./fixtures/homepage-defaults.json'));
    assert.deepEqual(result.sections, sections.defaults);
    assert.equal(result.sections.reviews.items.length, 6);
    for (const item of sections.defaults.reviews.items) { assert(html.includes(item.name)); assert(html.includes(item.text)); }
    for (const item of sections.defaults.stats.items) { assert(html.includes(item.value)); assert(html.includes(item.label)); }
    for (const item of sections.defaults.whyUs.items) { assert(html.includes(item.title)); assert(html.includes(item.text)); }
    assert(html.indexOf('js/homepage-sections.js') < html.indexOf('js/homepage-settings.js'));
});
test('selection, order, add/remove and explicit empty selections do not mutate input', () => {
    const raw = structuredClone(sections.defaults);
    raw.reviews.items.reverse(); raw.reviews.items[0].visible = false;
    const before = JSON.stringify(raw);
    assert.deepEqual(sections.visibleItems(normalize(raw).reviews).map(item => item.id), ['review-5','review-4','review-3','review-2','review-1']);
    assert.equal(JSON.stringify(raw), before);
    raw.reviews.items = []; raw.stats.items = []; raw.whyUs.items = [];
    for (const name of ['reviews','stats','whyUs']) assert.deepEqual(normalize(raw)[name].items, []);
});
test('Google links only accept genuine HTTPS Maps/review hosts without credentials or injected paths', () => {
    for (const url of ['https://maps.app.goo.gl/abc', 'https://www.google.com/maps/reviews/data=x', 'https://maps.google.com/?cid=123', 'https://goo.gl/maps/abc', 'https://g.page/r/abc/review', 'https://www.google.co.in/maps/place/abc']) assert(sections.safeGoogleMapsUrl(url), url);
    for (const url of ['javascript:alert(1)', 'http://maps.app.goo.gl/x', 'https://maps.app.goo.gl.evil.test/x', 'https://user@maps.app.goo.gl/x', 'https://example.com/maps', 'https://google.com/search?q=maps', 'https://maps.app.goo.gl/', 'https://maps.app.goo.gl:8443/x', 'https://maps.app.goo.gl/x\\evil', 'https://maps.app.goo.gl/x\ny']) assert(!sections.safeGoogleMapsUrl(url), url);
});
test('malformed config falls back safely; bad review links/photos never become executable', () => {
    assert.deepEqual(normalize(null), sections.defaults);
    const raw = structuredClone(sections.defaults);
    raw.reviews.rating = 'NaN'; raw.reviews.intervalSeconds = 1; raw.reviews.googleMapsUrl = 'javascript:alert(1)';
    raw.reviews.items[0].photo = 'data:image/svg+xml,x'; raw.reviews.items[0].googleMapsUrl = 'https://evil.test';
    raw.reviews.items.push(raw.reviews.items[0]); raw.reviews.items.push(null);
    const result = normalize(raw);
    assert.equal(result.reviews.items.length, 6); assert.equal(result.reviews.items[0].photo, ''); assert.equal(result.reviews.items[0].googleMapsUrl, '');
    assert.equal(result.reviews.rating, '4.8'); assert.equal(result.reviews.intervalSeconds, 6); assert.equal(result.reviews.googleMapsUrl, sections.defaults.reviews.googleMapsUrl);
});

class Node {
    constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.style = {}; this.textContent = ''; this.classList = {add(){}}; }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = nodes; this.textContent = ''; }
    setAttribute(key, value) { this.attrs[key] = value; }
    addEventListener() {}
}
test('renderer uses text nodes, validates links, hides sections, and retains booking/WhatsApp targets', () => {
    const nodes = new Map();
    const document = { createElement: tag => new Node(tag), createTextNode: text => ({textContent:text}), querySelector(selector) { if (!nodes.has(selector)) nodes.set(selector, new Node('div')); return nodes.get(selector); } };
    const raw = structuredClone(sections.defaults);
    raw.stats.enabled = false; raw.whyUs.title = '<script>evil()</script>';
    raw.reviews.items[0].text = '<img src=x onerror=evil()>'; raw.reviews.items[0].googleMapsUrl = 'https://maps.app.goo.gl/individual';
    raw.reviews.items = raw.reviews.items.slice(0,1);
    sections.apply(normalize(raw), document);
    assert.equal(nodes.get('.stats').hidden, true);
    assert.equal(nodes.get('.why-us .section-title').textContent, raw.whyUs.title);
    const card = nodes.get('.testimonials-grid').children[0];
    assert.equal(card.children[2].textContent, raw.reviews.items[0].text);
    assert.equal(card.children[3].href, raw.reviews.items[0].googleMapsUrl);
    assert.equal(card.children[3].rel, 'noopener noreferrer');
    assert.equal(nodes.get('.reviews-cta a').href, raw.reviews.googleMapsUrl);
    assert.equal(nodes.get('.cta-section .btn-whatsapp').href, undefined);
    assert.equal(nodes.get('.cta-section .btn-primary').href, undefined);
});
test('missing photos and individual links use initials and business link; empty reviews retain Google CTA', () => {
    const nodes = new Map(), document = { createElement: tag => new Node(tag), createTextNode: text => ({textContent:text}), querySelector(selector) { if (!nodes.has(selector)) nodes.set(selector, new Node('div')); return nodes.get(selector); } };
    const raw = structuredClone(sections.defaults); raw.reviews.items[0].photo = ''; raw.reviews.items = raw.reviews.items.slice(0,1);
    sections.apply(normalize(raw), document);
    const card = nodes.get('.testimonials-grid').children[0];
    assert.equal(card.children[0].children[0].textContent, 'M');
    assert.equal(card.children[3].href, raw.reviews.googleMapsUrl);
    raw.reviews.items = []; sections.apply(normalize(raw), document);
    assert.equal(nodes.get('.testimonials-grid').children[0].textContent, 'Read traveller reviews on Google.');
    assert.equal(nodes.get('.reviews-cta a').href, raw.reviews.googleMapsUrl);
});
