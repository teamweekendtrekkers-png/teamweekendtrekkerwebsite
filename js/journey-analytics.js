/* Anonymous, opt-in journey analytics. No contact fields, UTRs, URLs or free text. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',()=>api.install(root));else api.install(root);})(typeof window==='undefined'?null:window,function(){
'use strict';
const events=new Set(['site_visit','trip_view','date_selected','checkout_open','payment_shown','payment_submitted','booking_requested','upi_copied','qr_downloaded','checkout_error']);
const errors=new Set(['date_unavailable','payment_unavailable','checkout_unavailable','booking_submit_failed','qr_failed']);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function source(referrer,location){
 let url;try{url=new URL(location);}catch{return 'direct';}
 const tag=(url.searchParams.get('utm_source')||'').toLowerCase();
 const classify=value=>/instagram|(^|\.)ig($|\.)/.test(value)?'instagram':/google/.test(value)?'google':/whatsapp|wa\.me/.test(value)?'whatsapp':/facebook|fb\./.test(value)?'facebook':null;
 if(tag)return classify(tag)||'campaign';
 try{const ref=new URL(referrer);if(ref.hostname===url.hostname)return 'direct';return classify(ref.hostname)||'referral';}catch{return 'direct';}
}
function clean(name,trip,error){if(!events.has(name))return null;return {name,trip:typeof trip==='string'&&/^[a-z0-9][a-z0-9-]{0,99}$/.test(trip)?trip:null,error:name==='checkout_error'&&errors.has(error)?error:null};}
function createTracker(env){
 let enabled=false,session=null,queue=[],seen=new Set(),timer=null,stopped=false;
 const read=(key)=>{try{return env.storage.getItem(key);}catch{return null;}};
 const write=(key,value)=>{try{env.storage.setItem(key,value);}catch{}};
 let channel='direct';
 async function flush(){timer=null;if(!enabled||!queue.length||stopped)return;const batch=queue.splice(0,20);try{await env.send({p_session:session,p_source:channel,p_device:env.width<768?'mobile':env.width<1100?'tablet':'desktop',p_events:batch});}catch{/* Analytics never blocks booking. No personal data or failed payload logs. */}if(queue.length&&enabled)timer=env.schedule(flush,1000);}
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
 const style=d.createElement('link');style.rel='stylesheet';style.href='/css/journey-analytics.css';d.head.append(style);
 let notice;
 function saveConsent(value){try{w.localStorage.setItem('twt-analytics-consent',value?'yes':'no');}catch{}tracker.consent(value);notice?.remove();if(value)observeState();}
 function preferences(){notice?.remove();notice=d.createElement('section');notice.className='journey-consent';notice.setAttribute('aria-label','Optional website analytics');
 const text=d.createElement('p');text.textContent=blocked?'Your browser privacy preference is respected. Optional analytics is off.':'Help us improve booking? Optional analytics records anonymous trip and checkout steps for up to 90 days. We do not record your contact details, payment IDs, full URLs or screen recordings. Session identifiers expire after 24 hours. You can change this choice below.';notice.append(text);
 for(const [label,value]of blocked?[['Close',false]]:[['Allow analytics',true],['No thanks',false]]){const b=d.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>saveConsent(value));notice.append(b);}d.body.append(notice);
 }
 function observeState(){if(!tracker.enabled)return;const id=trip(),checkout=d.getElementById('checkoutForm');if(checkout)tracker.track('checkout_open',id);else if(d.getElementById('tripTitle')){tracker.track('trip_view',id);if(d.getElementById('dateSelect')?.value)tracker.track('date_selected',id);}
 const payment=d.getElementById('paymentSection');if(payment&&payment.getClientRects().length&&w.getComputedStyle(payment).display!=='none')tracker.track('payment_shown',id);
 const issue=d.getElementById('bookingIssue');if(issue&&!issue.hidden&&issue.textContent.trim())tracker.track('checkout_error',id,'checkout_unavailable');
 }
 const button=d.createElement('button');button.type='button';button.className='journey-preferences';button.textContent='Analytics preferences';button.addEventListener('click',preferences);(d.querySelector('footer')||d.body).append(button);
 if(saved==='yes'&&!blocked){tracker.consent(true);observeState();}else if(saved!=='no'&&!blocked)preferences();
 d.addEventListener('change',e=>{if(e.target.id==='dateSelect'&&e.target.value)tracker.track('date_selected',trip());});
 d.addEventListener('click',e=>{if(e.target.closest('#copyPaymentUpi'))tracker.track('upi_copied',trip());if(e.target.closest('#downloadPaymentQr'))tracker.track('qr_downloaded',trip());});
 d.addEventListener('twt:booking-accepted',e=>tracker.track(e.detail?.payment===true?'payment_submitted':'booking_requested',trip()));
 d.addEventListener('twt:booking-error',()=>tracker.track('checkout_error',trip(),'booking_submit_failed'));
 d.getElementById('paymentQrImage')?.addEventListener('error',()=>tracker.track('checkout_error',trip(),'qr_failed'));
 const observed=d.getElementById('paymentSection');if(observed)new MutationObserver(observeState).observe(observed,{attributes:true,attributeFilter:['style','hidden']});
 const issue=d.getElementById('bookingIssue');if(issue)new MutationObserver(observeState).observe(issue,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
 w.addEventListener('pagehide',()=>tracker.flush());
 w.addEventListener('storage',e=>{if(e.key==='twt-analytics-consent'){tracker.consent(e.newValue==='yes');if(tracker.enabled)observeState();}});
}
return {source,clean,createTracker,install};
});
