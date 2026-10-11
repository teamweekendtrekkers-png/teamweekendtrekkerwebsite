(function(root, factory) {
  const api = factory(typeof window !== 'undefined' ? window.IMAGE_MANIFEST || {} : {});
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ResponsiveImages = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function(manifest) {
  'use strict';
  const escape = value => String(value).replace(/[&"<>]/g, c => ({'&':'&amp;','"':'&quot;','<':'&lt;','>':'&gt;'}[c]));
  const focal = value => ['center','top','bottom','left','right'].includes(value) ? value : 'center';
  function variants(path) { return manifest[path] && manifest[path].webp || []; }
  function source(path, width) { const items=variants(path); return (items.find(item=>item.width>=width) || items.at(-1) || {}).path || path; }
  function attributes(path, focus) {
    const items=variants(path);
    return 'src="' + escape(source(path,640)) + '"' +
      (items.length ? ' srcset="' + items.map(item=>escape(item.path)+' '+item.width+'w').join(', ') + '" sizes="(max-width: 600px) calc(100vw - 32px), (max-width: 1000px) 45vw, 380px"' : '') +
      ' style="object-position:' + focal(focus) + '"';
  }
  function set(image,path,options) {
    if(!image) return;
    options=options||{};
    image.removeAttribute('srcset');
    const items=variants(path);
    if(items.length) {
      image.srcset=items.map(item=>item.path+' '+item.width+'w').join(', ');
      image.sizes=options.sizes||'(max-width: 767px) 100vw, 70vw';
    }
    image.style.objectPosition=focal(options.focal);
    image.decoding='async';
    image.loading=options.eager?'eager':'lazy';
    image.src=source(path,options.eager?960:640);
  }
  return {source, attributes, set, focal};
}));
