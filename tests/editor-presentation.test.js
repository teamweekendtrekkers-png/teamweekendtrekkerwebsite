const test=require('node:test'),assert=require('node:assert/strict');
const text=require('../js/inline-format'),gallery=require('../js/trip-gallery'),colors=require('../js/departure-colors'),discovery=require('../js/trip-discovery');
test('bold, italic, both and nested emphasis retain Unicode while escaping HTML',()=>{
 assert.equal(text.html('🌞 **Local hosts** and *trails* and ***both***'),'🌞 <strong>Local hosts</strong> and <em>trails</em> and <strong><em>both</em></strong>');
 assert.equal(text.plain('**Local *hosts***'),'Local hosts');
 assert.match(text.html('**<img src=x onerror=alert(1)>**'),/&lt;img/);assert.ok(!text.html('<script>evil</script>').includes('<script>'));
 assert.equal(text.plain('* Breakfast\nUnmatched ** marker'),'* Breakfast\nUnmatched ** marker');
});
test('saved gallery sequence is independent of card cover, with safe fallback',()=>{
 const trip={image:'images/poster.jpg',cardImage:'images/card.jpg',galleryImages:['images/b.jpg','images/a.jpg','images/b.jpg']};
 assert.deepEqual(gallery.orderedPhotos(trip),['images/b.jpg','images/a.jpg']);assert.equal(trip.cardImage,'images/card.jpg');
 assert.deepEqual(gallery.orderedPhotos({...trip,galleryImages:[]}),['images/poster.jpg']);
 assert.deepEqual(gallery.orderedPhotos({...trip,galleryImages:['https://evil.test/a.jpg','images/../evil.jpg']}),['images/poster.jpg']);
});
const lum=hex=>{const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
test('every palette has readable card text, badge and arrow colours',()=>{
 for(const palette of Object.values(colors.palettes)){assert.ok(ratio('#ffffff',palette.accent)>=4.5,palette.label);assert.ok(ratio('#173f35',palette.background)>=4.5,palette.label);}
 assert.equal(colors.key('red;display:none'),'forest');
});
test('all departures use their trip colour and retain exact departure links',()=>{
 const trip={id:'demo',title:'**Culture** weekend',batchColor:'violet'};
 for(const range of [{startKey:'2099-10-23',shortLabel:'Oct 23–25',fullLabel:'Oct 23–25, 2099',originalLabel:'Oct 23-25, 2099'},{startKey:'2099-10-30',shortLabel:'Oct 30–Nov 1',fullLabel:'Oct 30–Nov 1, 2099',originalLabel:'Oct 30-Nov 1, 2099'}]){
  const html=discovery.renderDeparture(trip,range);assert.match(html,/data-batch-color="violet"/);assert.ok(html.includes(encodeURIComponent(range.originalLabel)));assert.match(html,/<strong>Culture<\/strong>/);
 }
});
