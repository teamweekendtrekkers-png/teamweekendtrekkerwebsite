'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {buildCatalog,validatePublicConfig}=require('../scripts/build-booking-catalog.cjs');
const path=require('node:path');
const core=import('../supabase/functions/booking-request/core.mjs');
const input=()=>({idempotency_key:crypto.randomUUID(),trip_id:'demo',departure_label:'Oct 16-18, 2026',travellers:2,
 full_name:'Demo Customer',email:'demo@example.com',phone:'9999999999',alternate_phone:'',participant_names:['Demo One','Demo Two'],
 special_requests:'TEST ONLY',coupon_code:'',expected_total:8998});
const catalog=()=>({version:1,trips:{demo:{title:'Demo Trip',active:true,price:4499,departures:[{label:'Oct 16-18, 2026',date:'2026-10-16',cutoff:'2026-10-17T16:30:00Z'}]}},showCoupons:true,coupons:[]});
function environment() {
 const records=new Map(),sent=[],leases=new Set();let stored=0;
 const deps={now:()=>new Date('2026-10-12T12:00:00Z'),hash:async s=>crypto.createHash('sha256').update(s).digest('hex'),
  find:async key=>records.get(key),catalog:async()=>catalog(),
  accept:async (fields,hash)=>{
   let record=records.get(fields.idempotency_key);
   if (!record) {stored++;record={...fields,id:crypto.randomUUID(),booking_reference:'TWT-DEMO',request_hash:hash,
    total_amount:fields.subtotal-fields.discount_amount,telegram_status:'pending',email_status:'pending',telegram_attempts:0,email_attempts:0};records.set(fields.idempotency_key,record);}
   return {booking:record};
  },claim:async (id,kind)=>{
   const record=[...records.values()].find(r=>r.id===id),key=id+kind;
   if (leases.has(key) || record[kind+'_status']==='sent' || record[kind+'_attempts']>=5) return null;
   leases.add(key);record[kind+'_attempts']++;return {...record};
  },send:async(kind,row)=>{sent.push(kind);return {sent:true,messageId:6};},
  finish:async(row,kind,success)=>{
   const record=records.get(row.idempotency_key);record[kind+'_status']=success?'sent':'failed';leases.delete(row.id+kind);
  },pause:async()=>{}};
 return {deps,records,sent,count:()=>stored};
}
test('catalogue generator reflects the actual website settings',()=>{
 const result=buildCatalog(path.resolve(__dirname,'..'));
 assert.equal(result.version,1);assert.ok(Object.keys(result.trips).length>10);
 for(const trip of Object.values(result.trips)) {assert.ok(Number.isFinite(trip.price));for(const departure of trip.departures)assert.ok(Number.isFinite(Date.parse(departure.cutoff)));}
});
test('publishing rejects privileged or incorrect project keys',()=>{
 const key=role=>'header.'+Buffer.from(JSON.stringify({role,ref:'vdxunrhcahgkwtzvjjdj'})).toString('base64url')+'.signature';
 assert.doesNotThrow(()=>validatePublicConfig({enabled:true,anonKey:key('anon')}));
 assert.throws(()=>validatePublicConfig({enabled:true,anonKey:key('service_role')}),/public/);
 assert.throws(()=>validatePublicConfig({enabled:true,anonKey:'sb_secret_private'}),/public/);
});
test('server rejects altered totals, expired dates and invalid contact details',async()=>{
 const {normalizeRequest,bookingFromCatalog}=await core;
 assert.throws(()=>normalizeRequest({...input(),travellers:-1}),/invalid_request/);
 assert.throws(()=>normalizeRequest({...input(),email:'invalid'}),/invalid_request/);
 assert.throws(()=>bookingFromCatalog({...input(),expected_total:1},catalog(),new Date('2026-10-12T12:00:00Z')),/quote_changed/);
 assert.throws(()=>bookingFromCatalog(input(),catalog(),new Date('2026-11-01')),/departure_unavailable/);
 const quoted=bookingFromCatalog(input(),catalog(),new Date('2026-10-12'));assert.equal(quoted.subtotal,8998);assert.equal(quoted.price_per_person,4499);
});
test('coupon rules recompute the price and fail closed on expiry',async()=>{
 const {bookingFromCatalog}=await core;const data=catalog();data.coupons=[{code:'DEMO',type:'percent',value:10,maxDiscount:500,expiresAt:'2026-10-15T00:00:00Z'}];
 const request={...input(),coupon_code:'DEMO',expected_total:8498};
 assert.equal(bookingFromCatalog(request,data,new Date('2026-10-12')).discount_amount,500);
 assert.throws(()=>bookingFromCatalog(request,data,new Date('2026-10-16')),/quote_changed/);
});
test('duplicate requests return the same reference without resending alerts',async()=>{
 const {acceptRequest}=await core;const env=environment(),request=input();
 const first=await acceptRequest(request,env.deps),second=await acceptRequest(request,env.deps);
 assert.deepEqual(second,first);assert.equal(env.count(),1);assert.deepEqual(env.sent.sort(),['email','telegram']);
 await assert.rejects(()=>acceptRequest({...request,full_name:'Changed'},env.deps),/request_conflict/);
 // A lost response can be recovered even after trip dates or prices change.
 env.deps.catalog=()=>{throw Error('should not revalidate an already accepted request');};
 assert.deepEqual(await acceptRequest(request,env.deps),first);
});
test('notification failures keep the stored booking and still try both channels',async()=>{
 const {acceptRequest}=await core;const env=environment();
 env.deps.send=async(kind)=>{env.sent.push(kind);if(kind==='telegram')throw Error('network');return {sent:true};};
 const response=await acceptRequest(input(),env.deps);
 assert.equal(response.accepted,true);assert.equal(env.count(),1);
 const record=[...env.records.values()][0];assert.equal(record.telegram_status,'failed');assert.equal(record.email_status,'sent');
});
test('temporary provider errors get one bounded retry',async()=>{
 const {acceptRequest}=await core;const env=environment();let attempts=0;
 env.deps.send=async(kind)=>{env.sent.push(kind);if(kind==='telegram' && ++attempts===1)return {sent:false,temporary:true};return {sent:true};};
 await acceptRequest(input(),env.deps);assert.equal(attempts,2);assert.equal(env.sent.filter(k=>k==='email').length,1);
});
test('a failed status write does not resend an uncertain delivery or block the other channel',async()=>{
 const {acceptRequest}=await core;const env=environment(),originalFinish=env.deps.finish;
 env.deps.finish=async(...args)=>{if(args[1]==='telegram')throw Error('database');return originalFinish(...args);};
 const response=await acceptRequest(input(),env.deps);assert.equal(response.accepted,true);
 assert.equal(env.sent.filter(k=>k==='telegram').length,1);assert.equal(env.sent.filter(k=>k==='email').length,1);
});
test('concurrent retries share one booking and notification leases',async()=>{
 const {acceptRequest}=await core;const env=environment(),request=input();
 const results=await Promise.all([acceptRequest(request,env.deps),acceptRequest(request,env.deps)]);
 assert.equal(results[0].booking_reference,results[1].booking_reference);assert.equal(env.count(),1);
 assert.equal(env.sent.filter(k=>k==='telegram').length,1);assert.equal(env.sent.filter(k=>k==='email').length,1);
});

