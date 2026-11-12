const test=require('node:test'),assert=require('node:assert/strict');
const core=import('../supabase/functions/checkout-started/core.mjs');
const request=()=>({idempotency_key:'12345678-1234-4123-8123-123456789abc',trip_id:'demo',
 departure_label:'Nov 13-15, 2026',travellers:1,full_name:'Test Customer',email:'test@example.com',
 phone:'9999999999',participant_names:[],special_requests:'',coupon_code:'',expected_total:100});
const catalog=()=>({payment:{checkoutVersion:2},trips:{demo:{title:'Test Trip',active:true,price:100,
 departures:[{label:'Nov 13-15, 2026',date:'2026-11-13',cutoff:'2026-11-13T12:00:00Z'}]}}});
const now=()=>new Date('2026-11-12T00:00:00Z');
test('checkout lead checks contact, departure, total, and direct payment eligibility',async()=>{
 const {leadFromCatalog,leadTelegramText}=await core;
 const lead=leadFromCatalog(request(),catalog(),now());
 assert.match(leadTelegramText(lead),/PAYMENT PENDING/);
 assert.match(leadTelegramText(lead),/test@example.com/);
 assert.match(leadTelegramText(lead),/not a confirmed booking/);
 assert.throws(()=>leadFromCatalog({...request(),phone:'1234567890d'},catalog(),now()),/invalid_request/);
 assert.throws(()=>leadFromCatalog({...request(),expected_total:1},catalog(),now()),/quote_changed/);
 assert.throws(()=>leadFromCatalog(request(),catalog(),new Date('2026-12-01')),/departure_unavailable/);
 assert.throws(()=>leadFromCatalog(request(),{...catalog(),payment:{mode:'confirmation'}},now()),/direct_payment_unavailable/);
});
test('repeated checkout clicks do not resend a successful alert',async()=>{
 const {acceptLead}=await core;let claimed=false,sends=0,status;
 const deps={catalog:async()=>catalog(),now,hash:async()=> 'hash',
 claim:async payload=>{const send=!claimed;claimed=true;return {send,lead:{payload,idempotency_key:payload.idempotency_key,attempts:1}};},
 send:async()=>{sends++;return true;},finish:async(id,attempt,value)=>{status=value;}};
 await acceptLead(request(),deps);await acceptLead(request(),deps);
 assert.equal(sends,1);assert.equal(status,'sent');
});
test('uncertain Telegram response is recorded without a blind resend',async()=>{
 const {acceptLead}=await core;let status;
 const deps={catalog:async()=>catalog(),now,hash:async()=> 'hash',
 claim:async payload=>({send:true,lead:{payload,idempotency_key:payload.idempotency_key,attempts:1}}),
 send:async()=>{throw Error('timeout');},finish:async(id,attempt,value)=>{status=value;}};
 assert.equal((await acceptLead(request(),deps)).accepted,true);
 assert.equal(status,'unknown');
});
