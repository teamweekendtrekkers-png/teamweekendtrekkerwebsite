const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sections = require('../js/homepage-sections');
const settings = require('../js/homepage-settings');
const names = ['howItWorks', 'whyChooseUs'];
const normalize = raw => sections.normalize(raw, settings.safeImage);

class Node {
    constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = nodes; }
    setAttribute(key, value) { this.attrs[key] = value; }
}
function render(raw) {
    const nodes = new Map();
    const document = {
        createElement: tag => new Node(tag), createTextNode: text => ({textContent: text}),
        querySelector(selector) {
            if (!/^\.(how-it-works|why-choose-us)/.test(selector)) return null;
            if (!nodes.has(selector)) nodes.set(selector, new Node('div'));
            return nodes.get(selector);
        }
    };
    sections.apply(normalize(raw), document);
    return nodes;
}
test('legacy content is preserved while two independent replacement sections receive defaults', () => {
    const raw = {whyUs: {enabled: true, title: 'Our saved heading', items: []}};
    const before = JSON.stringify(raw), result = normalize(raw);
    assert.equal(JSON.stringify(raw), before);
    assert.deepEqual(result.whyUs, raw.whyUs);
    for (const name of names) assert.deepEqual(result[name], sections.defaults[name]);
});
test('legacy hidden preference is inherited only when a replacement has no explicit settings', () => {
    const raw = {whyUs: {enabled: false}};
    for (const name of names) assert.equal(normalize(raw)[name].enabled, false);
    raw.howItWorks = {enabled: true};
    assert.equal(normalize(raw).howItWorks.enabled, true);
    assert.equal(normalize(raw).whyChooseUs.enabled, false);
});
test('selection and reordering renumber only visible steps; explicit empty lists stay empty', () => {
    const raw = structuredClone(sections.defaults);
    raw.howItWorks.items.reverse(); raw.howItWorks.items[1].visible = false;
    const cards = render(raw).get('.how-it-works .homepage-info-grid').children;
    assert.deepEqual(cards.map(card => card.children[1].textContent), ['1','2']);
    assert.deepEqual(cards.map(card => card.children[2].textContent), ['Show Up & Explore','Pick a Weekend']);
    for (const name of names) raw[name].items = [];
    for (const selector of ['.how-it-works', '.why-choose-us']) assert.equal(render(raw).get(selector + ' .homepage-info-grid').children.length, 0);
});
test('headings, optional badges/subtitles, values and card contents are safe literal text', () => {
    const raw = structuredClone(sections.defaults);
    raw.whyChooseUs.title = '<img src=x onerror=evil()>';
    raw.whyChooseUs.eyebrow = ''; raw.whyChooseUs.subtitle = '';
    raw.whyChooseUs.items[0].value = ''; raw.whyChooseUs.items[0].icon = '<svg/onload=evil()>';
    raw.whyChooseUs.items[0].text = '<script>evil()</script>';
    raw.whyChooseUs.items[0].accent = 'red injected-class';
    const nodes = render(raw), card = nodes.get('.why-choose-us .homepage-info-grid').children[0];
    assert.equal(nodes.get('.why-choose-us .section-title').textContent, raw.whyChooseUs.title);
    assert.equal(nodes.get('.why-choose-us .section-eyebrow').textContent, '');
    assert.equal(nodes.get('.why-choose-us .section-subtitle').textContent, '');
    assert.equal(card.className, 'homepage-info-card accent-green');
    assert.equal(card.children[0].textContent, raw.whyChooseUs.items[0].icon);
    assert.equal(card.children.length, 3); assert.equal(card.children[2].textContent, raw.whyChooseUs.items[0].text);
});
test('new section visibility is independent and malformed/duplicate cards fall back safely', () => {
    const raw = structuredClone(sections.defaults);
    raw.howItWorks.enabled = false;
    raw.howItWorks.items.push(raw.howItWorks.items[0], null, {id:'broken', title:''});
    const nodes = render(raw);
    assert.equal(nodes.get('.how-it-works').hidden, true); assert.equal(nodes.get('.why-choose-us').hidden, false);
    assert.equal(nodes.get('.how-it-works .homepage-info-grid').children.length, 3);
});
const appDefaultsPath = path.resolve(__dirname, '../../trip_manager_app/lib/models/homepage_section_defaults.dart');
test('website and Flutter section defaults remain exactly in parity', {skip: !fs.existsSync(appDefaultsPath)}, () => {
    const source = fs.readFileSync(appDefaultsPath, 'utf8').replace(/\r\n/g, '\n');
    // Optional local cross-repository gate; hosted website CI has no app checkout.
    assert.deepEqual(JSON.parse(source.match(/r'''\n([\s\S]*?)\n'''/)[1]), sections.defaults);
});
