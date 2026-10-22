const {test}=require('node:test'),assert=require('node:assert/strict');
const about=require('../js/about-content');
test('About figures follow saved statistics and the current review rating without HTML injection',()=>{
 const cards=Object.fromEntries(['trips','travellers','rating','destinations'].map(id=>[id,{number:{textContent:'old'},label:{textContent:'label'},querySelector(s){return s==='.number'?this.number:this.label;}}]));
 const intro={textContent:'old'};
 const document={querySelector(s){return cards[s.match(/"([^"]+)"/)[1]];},getElementById(){return intro;}};
 about.apply({sections:{stats:{items:[
 {id:'trips',value:'700+',label:'Trips Completed'},
 {id:'travellers',value:'10,000+',label:'Happy Travellers'},
 {id:'rating',value:'4.8⭐',label:'Google Rating'},
 {id:'destinations',value:'20+',label:'<b>Destinations</b>'}
 ]},reviews:{rating:'4.9'}}},document);
 assert.equal(cards.travellers.number.textContent,'10,000+');
 assert.equal(intro.textContent,'10,000+');
 assert.equal(cards.rating.number.textContent,'4.9⭐');
 assert.equal(cards.destinations.label.textContent,'<b>Destinations</b>');
 about.apply({sections:{stats:{items:[{id:'trips',value:null}]}}},document);
 assert.equal(cards.trips.number.textContent,'700+');
});
