/* Anonymous session journey analytics. No contact fields, UTRs, URLs or free text. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',()=>api.install(root));else api.install(root);})(typeof window==='undefined'?null:window,function(){
'use strict';
const events=new Set(['site_visit','trip_view','date_selected','checkout_open','payment_shown','payment_submitted','booking_requested','upi_copied','qr_downloaded','checkout_error','search_no_results','trip_no_departure','departure_searched']);
const errors=new Set(['date_unavailable','payment_unavailable','checkout_unavailable','booking_submit_failed','qr_failed','pickup_missing','invalid_traveller_details']);
const extendedEvent = event => ['search_no_results','trip_no_departure','departure_searched'].includes(event.name) || ['pickup_missing','invalid_traveller_details'].includes(event.error);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function source(referrer,location){
 let url;try{url=new URL(location);}catch{return 'direct';}
 const tag=(url.searchParams.get('utm_source')||'').toLowerCase();
 const classify=value=>/instagram|(^|\.)ig($|\.)/.test(value)?'instagram':/google/.test(value)?'google':/whatsapp|wa\.me/.test(value)?'whatsapp':/facebook|fb\./.test(value)?'facebook':null;
 if(tag)return classify(tag)||'campaign';
 try{const ref=new URL(referrer);if(ref.hostname===url.hostname)return 'direct';return classify(ref.hostname)||'referral';}catch{return 'direct';}
}
function clean(name,trip,error){
 if(!events.has(name))return null;
 const event={name,trip:typeof trip==='string'&&/^[a-z0-9][a-z0-9_-]{0,99}$/.test(trip)?trip:null,error:name==='checkout_error'&&errors.has(error)?error:null};
 if(name==='departure_searched'){
  if(typeof error!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(error))return null;
  const time=new Date(error);if(!Number.isFinite(+time)||time.toISOString().slice(0,10)!==error)return null;
  event.day=error;
 }
 return event;
}
function createTracker(env){
 let enabled=false,session=null,queue=[],seen=new Set(),timer=null,stopped=false;
 const read=(key)=>{try{return env.storage.getItem(key);}catch{return null;}};
 const write=(key,value)=>{try{env.storage.setItem(key,value);}catch{}};
 let channel='direct';
 async function flush(){
  timer=null;if(!enabled||!queue.length||stopped)return;
  const batch=queue.splice(0,20), activeSession=session;
  const payload={p_session:activeSession,p_source:channel,p_device:env.width<768?'mobile':env.width<1100?'tablet':'desktop'};
  // Keep existing events working when the server predates the expanded report.
  for(const expanded of [false,true]){
   const events=batch.filter(event=>extendedEvent(event)===expanded);
   if(events.length&&enabled&&session===activeSession){try{await env.send({...payload,p_events:events});}catch{/* Analytics never blocks booking. */}}
  }
  if(queue.length&&enabled&&!timer)timer=env.schedule(flush,1000);
 }
 function track(name,trip,error){if(!enabled||stopped)return;const event=clean(name,trip,error);if(!event)return;const key=JSON.stringify(event);if(seen.has(key))return;seen.add(key);if(seen.size>200)return;queue.push({...event,id:env.randomUUID()});if(!timer)timer=env.schedule(flush,1000);}
 function consent(value){enabled=value===true&&!env.privacySignal;stopped=!enabled;if(!enabled){queue=[];if(timer)env.cancel(timer);timer=null;session=null;seen.clear();try{env.storage.removeItem('twt-journey-session');env.storage.removeItem('twt-journey-source');}catch{}return;}channel=read('twt-journey-source');if(!['direct','google','instagram','whatsapp','facebook','referral','campaign'].includes(channel)){channel=source(env.referrer,env.location);write('twt-journey-source',channel);}let saved=read('twt-journey-session');let data;try{data=JSON.parse(saved);}catch{}if(data&&uuid.test(data.id)&&env.now()-data.created<86400000&&env.now()>=data.created)session=data.id;else{channel=source(env.referrer,env.location);write('twt-journey-source',channel);session=env.randomUUID();write('twt-journey-session',JSON.stringify({id:session,created:env.now()}));}track('site_visit');}
 return {track,consent,flush,get enabled(){return enabled;}};
}
function install(w){if(!w||w.TwtJourney)return;const d=w.document;const blocked=w.navigator.globalPrivacyControl===true||w.navigator.doNotTrack==='1';let config=fetch('/js/booking-config.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error();return r.json();});config.catch(()=>{});
 const tracker=createTracker({storage:w.sessionStorage,referrer:d.referrer,location:w.location.href,width:w.innerWidth,privacySignal:blocked,now:()=>Date.now(),randomUUID:()=>w.crypto.randomUUID(),schedule:(fn,ms)=>w.setTimeout(fn,ms),cancel:id=>w.clearTimeout(id),send:async body=>{
  config=config||fetch('/js/booking-config.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error();return r.json();});const c=await config;
  if(c.enabled!==true||c.endpoint!=='https://vdxunrhcahgkwtzvjjdj.supabase.co/functions/v1/booking-request'||typeof c.anonKey!=='string')return;
  await fetch('https://vdxunrhcahgkwtzvjjdj.supabase.co/rest/v1/rpc/twt_track_journey',{method:'POST',headers:{apikey:c.anonKey,'Content-Type':'application/json'},body:JSON.stringify(body),keepalive:true,signal:AbortSignal.timeout(8000)});
 }});
 w.TwtJourney=tracker;
 const trip=()=>{try{return typeof w.getTripFromURL==='function'?w.getTripFromURL():w.currentTrip?.id||null;}catch{return null;}};
 let saved=null;try{saved=w.localStorage.getItem('twt-analytics-consent');}catch{}
 function observeState(){if(!tracker.enabled)return;const id=trip(),checkout=d.getElementById('checkoutForm');if(checkout)tracker.track('checkout_open',id);else if(d.getElementById('tripTitle')){tracker.track('trip_view',id);const dates=d.getElementById('dateSelect');if(dates?.value)tracker.track('date_selected',id);if(dates&&![...dates.options].some(option=>option.value&&!option.disabled))tracker.track('trip_no_departure',id);}
 const payment=d.getElementById('paymentSection');if(payment&&payment.getClientRects().length&&w.getComputedStyle(payment).display!=='none')tracker.track('payment_shown',id);
 const issue=d.getElementById('bookingIssue');if(issue&&!issue.hidden&&issue.textContent.trim())tracker.track('checkout_error',id,issue.dataset.analyticsCode || 'checkout_unavailable');
 }
 if(saved!=='no'&&!blocked){tracker.consent(true);observeState();}
 d.addEventListener('change',e=>{if(e.target.id==='dateSelect'&&e.target.value)tracker.track('date_selected',trip());});
 d.addEventListener('invalid',event=>{
  const field=event.target;if(!field.closest('#checkoutForm'))return;
  tracker.track('checkout_error',trip(),/^traveller-\d+-pickup$/.test(field.id)?'pickup_missing':'invalid_traveller_details');
 },true);
 d.addEventListener('click',e=>{if(e.target.closest('#copyPaymentUpi'))tracker.track('upi_copied',trip());if(e.target.closest('#downloadPaymentQr'))tracker.track('qr_downloaded',trip());});
 d.addEventListener('twt:booking-accepted',e=>tracker.track(e.detail?.payment===true?'payment_submitted':'booking_requested',trip()));
 d.addEventListener('twt:booking-error',()=>tracker.track('checkout_error',trip(),'booking_submit_failed'));
 d.getElementById('paymentQrImage')?.addEventListener('error',()=>tracker.track('checkout_error',trip(),'qr_failed'));
 const observed=d.getElementById('paymentSection');if(observed)new MutationObserver(observeState).observe(observed,{attributes:true,attributeFilter:['style','hidden']});
 const issue=d.getElementById('bookingIssue');if(issue)new MutationObserver(observeState).observe(issue,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
 w.addEventListener('pagehide',()=>tracker.flush());
 w.addEventListener('storage',e=>{if(e.key==='twt-analytics-consent'){tracker.consent(e.newValue!=='no');if(tracker.enabled)observeState();}});
}
return {source,clean,createTracker,install};
});
