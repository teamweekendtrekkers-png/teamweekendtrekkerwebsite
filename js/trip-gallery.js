(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TripGallery=api;}(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const safe=value=>typeof value==='string'&&/^images\/[a-z0-9_./-]+\.(?:png|jpe?g|webp|avif)$/i.test(value)&&!value.includes('..');
 function orderedPhotos(trip){const gallery=Array.isArray(trip.galleryImages)?trip.galleryImages.filter(safe):[];return [...new Set(gallery.length?gallery:[trip.image].filter(safe))];}
 return {orderedPhotos};
}));
