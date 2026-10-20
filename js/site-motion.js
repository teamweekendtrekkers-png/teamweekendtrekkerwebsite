(function () {
 'use strict';
 document.addEventListener('DOMContentLoaded', () => queueMicrotask(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const running = new Map();
  function animateHeight(node, from, to, finish) {
   running.get(node)?.();
   if (reduced.matches || !node.animate) { finish(); return; }
   const animation = node.animate([{height: from+'px'}, {height: to+'px'}], {duration:180, easing:'ease-out'});
   node.style.overflow = 'hidden';
   let done = false;
   const complete = () => {
    if (done) return; done = true;
    running.delete(node); node.style.overflow = ''; finish(); animation.cancel();
   };
   running.set(node, complete); animation.onfinish = complete;
  }
  document.addEventListener('click', event => {
   const summary = event.target.closest('summary');
   if (!summary || event.defaultPrevented || event.target.closest('a,button,input')) return;
   const panel = summary.parentElement;
   if (panel.tagName !== 'DETAILS' || reduced.matches || !panel.animate) return;
   event.preventDefault();
   running.get(panel)?.();
   const wasOpen = panel.open, from = panel.getBoundingClientRect().height;
   panel.open = !wasOpen;
   const to = panel.getBoundingClientRect().height;
   panel.open = true;
   animateHeight(panel, from, to, () => { panel.open = !wasOpen; });
  });
  // Existing itinerary handlers keep control of which day is open.
  document.addEventListener('click', event => {
   if (!event.target.closest('.accordion-header')) return;
   const panels = [...document.querySelectorAll('.accordion-content')];
   panels.forEach(panel => running.get(panel)?.());
   const heights = panels.map(panel => panel.getBoundingClientRect().height);
   setTimeout(() => panels.forEach((panel, i) => {
    const open = panel.parentElement.classList.contains('active');
    const header = panel.parentElement.querySelector('.accordion-header');
    header?.setAttribute('aria-expanded', String(open));
    const to = panel.getBoundingClientRect().height;
    if (to === heights[i]) return;
    panel.style.display = 'block';
    animateHeight(panel, heights[i], to, () => { panel.style.display = ''; });
   }), 0);
  }, true);
  document.querySelectorAll('.accordion-header').forEach(header => header.setAttribute('aria-expanded', String(header.parentElement.classList.contains('active'))));
  const stop = () => [...running.values()].forEach(finish => finish());
  reduced.addEventListener('change', stop); window.addEventListener('beforeprint', stop, true);
  document.getElementById('submitSuccess')?.setAttribute('role','status');
  const bar = document.getElementById('mobileBookBtn');
  if (bar) {
   const reserve = () => {
    const height = getComputedStyle(bar).display === 'none' ? 0 : Math.ceil(bar.getBoundingClientRect().height)+12;
    document.body.style.setProperty('--booking-clearance', height+'px');
   };
   if (typeof ResizeObserver === 'function') new ResizeObserver(reserve).observe(bar);
   window.addEventListener('resize', reserve, {passive:true}); reserve();
  }
 }));
}());
