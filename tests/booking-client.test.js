'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'../js/booking-client.js'),'utf8');
function page(config,response) {
 const fields={fullName:'Demo Customer',email:'demo@example.com',phone:'9999999999',altPhone:'',participants:'Demo One, Demo Two',notes:'TEST ONLY'};
 const elements={};for(const [id,value] of Object.entries(fields))elements[id]={value};
 elements.submitDetailsBtn={disabled:false,innerHTML:''};elements.bookingIssue={hidden:true,textContent:''};
 for(const id of ['submitSuccess','requestReceived'])elements[id]={children:[],querySelector(){return this.children[0] || null;},append(element){this.children.push(element);}};
 const calls=[],stored=new Map();let legacy=0,success=0;
 const window={submitDetails:async()=>{legacy++;},bookingData:{date:'Oct 16-18, 2026',people:2,total:8998,coupon:''}};
 const context=vm.createContext({window,document:{getElementById:id=>elements[id],createElement:()=>({dataset:{}})},
  crypto:webcrypto,TextEncoder,AbortSignal,validateForm:()=>true,getTripFromURL:()=>'wayanad',showPaymentSection:()=>{success++;},
  sessionStorage:{getItem:key=>stored.get(key),setItem:(key,value)=>stored.set(key,value)},
  fetch:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>options?.method==='POST'?response:config};}});
 vm.runInContext(source,context);
 return {window,calls,elements,legacy:()=>legacy,success:()=>success};
}
test('staged integration continues to use the existing email flow',async()=>{
 const env=page({enabled:false},null);await env.window.submitDetails();assert.equal(env.legacy(),1);assert.equal(env.calls.length,1);
});
test('an enabled service saves a stable request key and displays the returned reference',async()=>{
 const env=page({enabled:true,endpoint:'https://vdxunrhcahgkwtzvjjdj.supabase.co/functions/v1/booking-request',anonKey:'public-test-key'},
  {accepted:true,booking_reference:'TWT-DEMO'});
 await env.window.submitDetails();await env.window.submitDetails();
 assert.equal(env.legacy(),0);assert.equal(env.success(),2);
 const first=JSON.parse(env.calls[1].options.body),second=JSON.parse(env.calls[2].options.body);
 assert.equal(first.idempotency_key,second.idempotency_key);assert.equal(first.expected_total,8998);
 assert.match(env.elements.requestReceived.children[0].textContent,/TWT-DEMO/);
});
test('a rejected database request never displays success or falls back to email alone',async()=>{
 const env=page({enabled:true,endpoint:'https://vdxunrhcahgkwtzvjjdj.supabase.co/functions/v1/booking-request',anonKey:'public-test-key'},{error:'rate_limited'});
 await env.window.submitDetails();assert.equal(env.success(),0);assert.equal(env.legacy(),0);
 assert.equal(env.elements.bookingIssue.hidden,false);assert.match(env.elements.bookingIssue.textContent,/Too many requests/);
});
