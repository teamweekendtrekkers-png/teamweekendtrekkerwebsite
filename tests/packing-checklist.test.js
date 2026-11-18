const test=require('node:test'),assert=require('node:assert/strict'),{createState}=require('../js/packing-checklist');
test('packing choices persist per trip and reset only that trip',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const first=createState(storage,'trip-A');first.checked.add('raincoat#0');first.save();
 assert.equal(createState(storage,'trip-A').checked.has('raincoat#0'),true);
 const other=createState(storage,'trip-B');assert.equal(other.checked.size,0);other.checked.add('shoes#0');other.save();
 first.reset();assert.equal(createState(storage,'trip-A').checked.size,0);assert.equal(createState(storage,'trip-B').checked.size,1);
});
test('blocked storage keeps packing usable without claiming it was saved',()=>{
 const state=createState({getItem(){throw Error();},setItem(){throw Error();},removeItem(){throw Error();}},'trip');
 state.checked.add('water#0');state.save();assert.equal(state.checked.size,1);assert.equal(state.persistent,false);state.reset();assert.equal(state.checked.size,0);
});
