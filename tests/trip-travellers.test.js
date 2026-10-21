const {test}=require('node:test'),assert=require('node:assert/strict');
const cap=require('../js/trip-travellers');
test('per-trip caps preserve legacy fifty-person limit and reject over-limit or fractional selections',()=>{
 assert.equal(cap.limit({}),50);
 assert.equal(cap.limit({maxTravellers:6}),6);
 assert.equal(cap.limit({maxTravellers:10}),10);
 assert.equal(cap.valid({maxTravellers:6},6),true);
 for(const value of [7,0,-1,1.5,'2',NaN])assert.equal(cap.valid({maxTravellers:6},value),false);
});
test('selector rebuild uses the current trip cap and retains only a permitted selection',()=>{
 const select={value:'19',children:[],ownerDocument:{createElement(){return {};}},replaceChildren(){this.children=[];},append(value){this.children.push(value);}};
 cap.populate(select,{maxTravellers:6});
 assert.equal(select.children.length,6);assert.equal(select.value,'6');
 assert.deepEqual(select.children.map(x=>x.value),['1','2','3','4','5','6']);
 cap.populate(select,{maxTravellers:2});assert.equal(select.children.length,2);assert.equal(select.value,'2');
});
