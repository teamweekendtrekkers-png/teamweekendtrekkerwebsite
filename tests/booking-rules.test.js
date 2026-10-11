const test=require('node:test'),assert=require('node:assert/strict');
const rules=require('../js/booking-rules'),dates=require('../js/trip-date-utils');
const {prepare}=require('../scripts/prepare-homepage');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const config={...rules.defaults,coupons:[{code:'WEEKEND',enabled:true,type:'percent',value:20,maxDiscount:1000,tripIds:['trek'],startsAt:'2026-10-01T00:00:00+05:30',expiresAt:'2026-11-01T00:00:00+05:30'}]};
const now=new Date('2026-10-16T12:00:00Z');
test('coupon totals enforce code, eligibility, activation, expiry and maximum savings',()=>{
 assert.equal(rules.quote(config,'weekend','trek',8998,now).discount,1000);
 assert.equal(rules.quote(config,'weekend','trek',8998,now).total,7998);
 for(const [code,id,time] of [['','trek',now],['wrong','trek',now],['weekend','other',now],['weekend','trek',new Date('2026-09-30')],['weekend','trek',new Date('2026-10-31T18:30:00Z')]])assert.equal(rules.quote(config,code,id,8998,time).valid,false);
 assert.equal(rules.quote({...config,coupons:[{...config.coupons[0],enabled:false}]},'weekend','trek',8998,now).valid,false);
 const fixed={...config,coupons:[{code:'FREE',enabled:true,type:'fixed',value:10000}]};
 assert.equal(rules.quote(fixed,'free','trek',8998,now).total,0);
});
test('cutoff is departure plus 24 hours and never the return date',()=>{
 const trip={departureTime:'20:30',availableDates:['Dec 31-Jan 2, 2026-2027']};
 const range=dates.parseTripDateRange(trip.availableDates[0]);
 assert.equal(dates.bookingCutoff(trip,range).toISOString(),'2027-01-01T15:00:00.000Z');
 assert.equal(dates.getUpcomingDateRanges(trip,new Date('2027-01-01T14:59:59Z')).length,1);
 assert.equal(dates.getUpcomingDateRanges(trip,new Date('2027-01-01T15:00:00Z')).length,0);
 assert.equal(dates.departureMinutes({boardingLocations:[{time:'8:30 PM'}]}),1230);
});
test('failed settings fetch blocks requests rather than inventing current offers',async()=>{
 await assert.rejects(rules.load(async()=>({ok:false})));
 await assert.rejects(rules.load(async()=>{throw Error('offline');}));
});
test('first paint embeds the selected responsive cover and safe config, idempotently',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'twt-cover-'));
 try{
  fs.mkdirSync(path.join(root,'js'));
  fs.writeFileSync(path.join(root,'index.html'),'<html><head></head><body></body></html>');
  fs.writeFileSync(path.join(root,'js/homepage-config.json'),JSON.stringify({version:1,hero:{backgroundImage:'images/new.jpg',title:'</script><script>evil()</script>'},presentation:{heroMobileImage:'images/mobile.jpg',heroMobileFocalPoint:'top'}}));
  fs.writeFileSync(path.join(root,'js/image-manifest.js'),'window.IMAGE_MANIFEST = '+JSON.stringify({'images/new.jpg':{webp:[{width:1600,path:'images/optimized/desktop.webp'}]},'images/mobile.jpg':{webp:[{width:640,path:'images/optimized/mobile.webp'}]}})+';');
  prepare(root);const once=fs.readFileSync(path.join(root,'index.html'),'utf8');prepare(root);
  assert.equal(once,fs.readFileSync(path.join(root,'index.html'),'utf8'));
  assert.match(once,/images\/optimized\/desktop.webp/);assert.match(once,/images\/optimized\/mobile.webp/);
  assert.doesNotMatch(once,/<script>evil/);assert.match(once,/background-position:top/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('checkout opens success/payment instructions only after a successful form response',async()=>{
 const html=fs.readFileSync(path.join(__dirname,'../checkout.html'),'utf8');
 const source=html.slice(html.indexOf('async function submitDetails()'),html.indexOf('function showPaymentSection()'));
 for(const response of [{ok:true,success:true},{ok:false,success:true},{ok:true,success:false},null]){
  let successes=0,alerts=0;const elements={};
  const context={document:{getElementById:id=>elements[id]||(elements[id]={value:'Test',disabled:false})},window:{bookingData:{trip:'Test',total:100,subtotal:100,discount:0,people:1}},WEB3FORMS_ACCESS_KEY:'test-only',validateForm:()=>true,showPaymentSection:()=>successes++,alert:()=>alerts++,console:{log(){},error(){}},fetch:async()=>{if(!response)throw Error('offline');return{ok:response.ok,json:async()=>({success:response.success})};}};
  vm.createContext(context);vm.runInContext(source,context);await context.submitDetails();
  assert.equal(successes,response?.ok&&response?.success?1:0);assert.equal(alerts,successes?0:1);
 }
});
test('submission stops for changed offers, expired dates or unavailable settings',async()=>{
 const text=fs.readFileSync(path.join(__dirname,'../js/checkout-experience.js'),'utf8');
 const wrapper=text.slice(text.indexOf('const originalSubmit=window.submitDetails;'),text.indexOf("byId('copyPaymentUpi').addEventListener"));
 for(const scenario of ['unchanged','changed','expired','offline']){
  let sends=0;const elements={checkoutForm:{style:{display:''}},offerUpdate:{hidden:true},bookingIssue:{hidden:true}};
  const context={busy:false,submit:{disabled:false},window:{bookingData:{total:100,coupon:'TEST'},submitDetails:async()=>sends++},byId:id=>elements[id],dateValid:()=>scenario!=='expired',invalidRequest:()=>{elements.bookingIssue.hidden=false;},validateForm:()=>true,refresh:async()=>{if(scenario==='offline')throw Error('offline');if(scenario==='changed')context.window.bookingData.total=120;}};
  vm.createContext(context);vm.runInContext(wrapper,context);await context.window.submitDetails();
  assert.equal(sends,scenario==='unchanged'?1:0);
  if(scenario==='changed')assert.equal(elements.offerUpdate.hidden,false);
 }
});
