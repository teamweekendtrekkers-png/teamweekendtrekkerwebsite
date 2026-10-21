const {test}=require('node:test');
const assert=require('node:assert/strict');
const {normalize,timer}=require('../js/trip-gallery-slideshow');
test('legacy settings enable five-second sliding; only valid intervals apply',()=>{
 assert.deepEqual(normalize(),{autoSlide:true,intervalSeconds:5});
 assert.deepEqual(normalize({autoSlide:false,intervalSeconds:30}),{autoSlide:false,intervalSeconds:30});
 for(const intervalSeconds of [0,2,31,3.5,'5',null])assert.equal(normalize({intervalSeconds}).intervalSeconds,5);
});
test('one timer honors saved timing, restarts after browsing, pauses and cleans up',()=>{
 const pending=new Map();let next=0,photos=0,blocked=false;
 const controller=timer({advance:()=>photos++,blocked:()=>blocked,
  options:{intervalSeconds:7},set:(fn,ms)=>{const id=++next;pending.set(id,{fn,ms});return id;},clear:id=>pending.delete(id)});
 const fire=()=>{const [id,job]=pending.entries().next().value;pending.delete(id);job.fn();};
 controller.refresh();assert.equal(pending.size,1);assert.equal([...pending.values()][0].ms,7000);
 controller.refresh();assert.equal(pending.size,1);
 fire();assert.equal(photos,1);assert.equal(pending.size,1);
 blocked=true;fire();assert.equal(photos,1);assert.equal(pending.size,0);
 blocked=false;controller.refresh();assert.equal(pending.size,1);
 controller.configure({autoSlide:false,intervalSeconds:3});assert.equal(pending.size,0);
 controller.configure({autoSlide:true,intervalSeconds:3});assert.equal([...pending.values()][0].ms,3000);
 controller.destroy();controller.refresh();assert.equal(pending.size,0);
});
