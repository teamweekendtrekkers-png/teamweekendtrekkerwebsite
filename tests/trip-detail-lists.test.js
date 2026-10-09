const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const lists = require('../js/trip-detail-lists');
const { readTripsData, renderTripPage, readSiteOrigin } = require('../scripts/generate-trip-pages');

const root = path.resolve(__dirname, '..');
const template = fs.readFileSync(path.join(root, 'trip-detail.html'), 'utf8');

class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.attributes = {}; }
    setAttribute(name, value) { this.attributes[name] = value; }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    set innerHTML(_) { throw new Error('Admin labels must never be rendered as HTML'); }
}

function documentFixture() {
    const containers = { thingsToCarryGrid: new Element('div'), suitableForGrid: new Element('div') };
    return {
        containers,
        createElement: tag => new Element(tag),
        getElementById: id => containers[id],
    };
}

test('missing, empty and invalid lists keep the original website defaults', () => {
    for (const value of [undefined, null, [], [' ', ''], 'invalid', [123, null]]) {
        for (const field of ['thingsToCarry', 'perfectFor']) {
            assert.deepEqual(lists.getItems({ [field]: value }, field), lists.defaults[field]);
        }
    }
    assert.equal(lists.defaults.thingsToCarry.length, 8);
    assert.equal(lists.defaults.perfectFor.length, 4);
    for (const label of [...lists.defaults.thingsToCarry, ...lists.defaults.perfectFor]) {
        assert.ok(template.includes(label), `legacy label ${label} must still be supported`);
    }
});

test('custom trip lists retain order, punctuation, Unicode and multiline content', () => {
    const trip = {
        thingsToCarry: ['  Raincoat  ', 'Power bank & cable', 'Snacks 🥾\nKeep dry'],
        perfectFor: ['Couples', 'Corporate teams', "Photographers' groups"],
    };
    const document = documentFixture();
    lists.render(trip, document);
    for (const [id, field, className] of [
        ['thingsToCarryGrid', 'thingsToCarry', 'carry-item'],
        ['suitableForGrid', 'perfectFor', 'suitable-tag'],
    ]) {
        const rendered = document.containers[id].children;
        assert.deepEqual(rendered.map(item => item.children[1].textContent), trip[field].map(item => item.trim()));
        assert.ok(rendered.every(item => item.className === className));
        assert.ok(rendered.every(item => item.children[0].attributes['aria-hidden'] === 'true'));
    }
});

test('labels render as text and icons are selected from fixed rules', () => {
    const unsafe = '<img src=x onerror=alert(1)> & "<script>"';
    const document = documentFixture();
    lists.render({ thingsToCarry: [unsafe], perfectFor: [unsafe] }, document);
    for (const container of Object.values(document.containers)) {
        assert.equal(container.children[0].children[1].textContent, unsafe);
        assert.equal(container.children[0].children.length, 2);
    }
    assert.equal(lists.iconFor('Trekking shoes', 'thingsToCarry'), 'fa-shoe-prints');
    assert.equal(lists.iconFor('Power bank', 'thingsToCarry'), 'fa-suitcase');
    assert.equal(lists.iconFor('Family', 'perfectFor'), 'fa-home');
    assert.equal(lists.iconFor('Photographers', 'perfectFor'), 'fa-users');
});

test('re-render replaces the previous trip and handles absent containers', () => {
    const document = documentFixture();
    lists.render({ thingsToCarry: ['Raincoat'], perfectFor: ['Couples'] }, document);
    lists.render({}, document);
    assert.equal(document.containers.thingsToCarryGrid.children.length, 8);
    assert.equal(document.containers.suitableForGrid.children.length, 4);
    assert.doesNotThrow(() => lists.render({}, { getElementById: () => null }));
});

test('template and generated social-preview routes invoke the new renderer', () => {
    assert.match(template, /id="thingsToCarryGrid"/);
    assert.match(template, /id="suitableForGrid"/);
    assert.match(template, /TripDetailLists\.render\(trip, document\)/);
    assert.ok(template.indexOf('src="js/trip-detail-lists.js?v=1"') < template.indexOf('TripDetailLists.render'));
    const page = renderTripPage({
        template, tripId: 'custom-trip', projectRoot: root, siteOrigin: readSiteOrigin(root),
        trip: { title: 'Custom trip', about: 'A weekend away.', image: 'images/logo.jpg' },
    });
    assert.match(page, /<base href="\.\.\/\.\.\/">/);
    assert.match(page, /TripDetailLists\.render\(trip, document\)/);
    assert.match(page, /css\/trip-detail-lists.css/);
});

test('current authoritative trips render custom packing lists and retain audience defaults', () => {
    const trips = readTripsData(root);
    for (const trip of Object.values(trips)) {
        const document = documentFixture();
        lists.render(trip, document);
        assert.deepEqual(
            document.containers.thingsToCarryGrid.children.map(item => item.children[1].textContent),
            lists.getItems(trip, 'thingsToCarry'),
        );
        assert.ok(document.containers.suitableForGrid.children.length > 0);
    }
});
