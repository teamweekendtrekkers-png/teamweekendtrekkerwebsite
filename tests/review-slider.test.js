const test = require('node:test');
const assert = require('node:assert/strict');
const sections = require('../js/homepage-sections');

class Node extends EventTarget {
    constructor(tag) {
        super(); this.tag = tag; this.children = []; this.attrs = {}; this.scrollLeft = 0;
        this.classList = {add() {}};
    }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = nodes; }
    setAttribute(key, value) { this.attrs[key] = value; }
    get firstElementChild() { return this.children[0]; }
    getBoundingClientRect() { return {width: 280}; }
    contains(node) { return node === this || this.children.some(child => child.contains?.(node)); }
    scrollTo(options) { this.scrollLeft = options.left; this.lastScroll = options; }
    after(node) { this.controls = node; }
    remove() { this.removed = true; }
}
function fire(target, type, properties = {}) {
    target.dispatchEvent(Object.assign(new Event(type, {cancelable: true}), properties));
}
function fixture(options = {}) {
    const grid = new Node('div'), view = new EventTarget(), document = new EventTarget();
    const media = new EventTarget(), timers = new Map();
    let id = 0;
    media.matches = false;
    view.matchMedia = () => media;
    view.setInterval = (callback, interval) => { timers.set(++id, {callback, interval}); return id; };
    view.clearInterval = timer => timers.delete(timer);
    view.requestAnimationFrame = () => ++id;
    view.cancelAnimationFrame = () => {};
    document.defaultView = view;
    document.createElement = tag => new Node(tag);
    document.createTextNode = text => ({textContent: text});
    document.querySelector = selector => selector === '.testimonials-grid' ? grid : null;
    grid.scrollWidth = 1800; grid.clientWidth = 600;
    const config = structuredClone(sections.defaults);
    Object.assign(config.reviews, options);
    const apply = () => sections.apply(config, document);
    apply();
    const tick = () => { assert.equal(timers.size, 1); [...timers.values()][0].callback(); };
    return {grid, view, document, media, timers, config, apply, tick};
}

test('reviews autoplay at the configured interval with only previous/next public buttons', () => {
    const {grid, timers, tick} = fixture({intervalSeconds: 4});
    assert.deepEqual(grid.controls.children.filter(node => node.tag === 'button').map(node => node.attrs['aria-label']), ['Previous reviews', 'Next reviews']);
    assert.equal([...timers.values()][0].interval, 4000);
    tick(); assert.equal(grid.scrollLeft, 300);
    grid.scrollLeft = 1200; tick(); assert.equal(grid.scrollLeft, 0);
    grid.controls.children[0].onclick(); assert.equal(grid.scrollLeft, 1200);
    grid.controls.children[1].onclick(); assert.equal(grid.scrollLeft, 0);
    tick(); assert.equal(grid.scrollLeft, 300);
});
test('mouse hover and keyboard focus pause temporarily and resume without a Play button', () => {
    const {grid, timers, document, tick} = fixture();
    fire(grid, 'pointerenter', {pointerType: 'mouse'}); assert.equal(timers.size, 0);
    fire(grid, 'pointerleave'); assert.equal(timers.size, 1);
    document.activeElement = grid; fire(grid, 'focusin'); assert.equal(timers.size, 0);
    fire(grid, 'keydown', {key: 'ArrowRight'}); assert.equal(grid.scrollLeft, 300);
    document.activeElement = grid.controls.children[0]; fire(grid, 'focusout'); assert.equal(timers.size, 0);
    document.activeElement = null; fire(grid.controls, 'focusout'); tick(); assert.equal(grid.scrollLeft, 600);
});
for (const release of ['pointerup', 'pointercancel']) {
    test('touch interaction resumes autoplay after ' + release + ', including release outside the slider', () => {
        const {grid, view, timers, tick} = fixture();
        fire(grid, 'pointerenter', {pointerType: 'touch'}); assert.equal(timers.size, 1);
        fire(grid, 'pointerdown', {pointerType: 'touch'}); assert.equal(timers.size, 0);
        fire(view, release, {pointerType: 'touch'}); tick(); assert.equal(grid.scrollLeft, 300);
    });
}
test('reduced motion and hidden pages suppress autoplay, then automatically resume', () => {
    const {grid, media, document, timers, tick} = fixture();
    media.matches = true; fire(media, 'change'); assert.equal(timers.size, 0);
    grid.controls.children[1].onclick(); assert.equal(grid.lastScroll.behavior, 'auto');
    media.matches = false; fire(media, 'change'); assert.equal(timers.size, 1);
    document.hidden = true; fire(document, 'visibilitychange'); assert.equal(timers.size, 0);
    document.hidden = false; fire(document, 'visibilitychange'); tick(); assert.equal(grid.scrollLeft, 600);
});
test('admin autoplay setting, disabled sections and non-overflowing lists remain supported', () => {
    for (const options of [{autoPlay: false}, {enabled: false}]) {
        assert.equal(fixture(options).timers.size, 0);
    }
    const {grid, view, timers} = fixture();
    grid.scrollWidth = grid.clientWidth; fire(view, 'resize');
    assert.equal(timers.size, 0); assert.equal(grid.controls.hidden, true);
});
test('reapplying settings replaces controls and timers; cleanup removes interaction listeners', () => {
    const {grid, view, document, media, timers, apply} = fixture();
    const oldControls = grid.controls;
    apply(); assert.equal(oldControls.removed, true); assert.equal(timers.size, 1);
    grid._reviewCleanup(); assert.equal(timers.size, 0); assert.equal(grid.controls.removed, true);
    fire(grid, 'keydown', {key: 'ArrowRight'}); assert.equal(grid.scrollLeft, 0);
    for (const [target, event] of [[view, 'resize'], [view, 'pointerup'], [view, 'pointercancel'], [media, 'change'], [document, 'visibilitychange'], [grid, 'pointerleave']]) fire(target, event);
    assert.equal(timers.size, 0);
});
