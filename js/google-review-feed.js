(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GoogleReviewFeed=api;
}(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const origin='https://vdxunrhcahgkwtzvjjdj.supabase.co';
 const generations=new WeakMap(),polls=new WeakMap();
 function select(payload,now=Date.now()){
  const age=now-Date.parse(payload?.fetchedAt);
  if(payload?.connected!==true||!Number.isFinite(age)||age< -300000||age>86400000||!Number.isFinite(payload.averageRating)||payload.averageRating<1||payload.averageRating>5||!Array.isArray(payload.reviews))throw Error('Reviews unavailable');
  const seen=new Set();
  return payload.reviews.filter(r=>{
   if(r?.rating!==5||typeof r.id!=='string'||seen.has(r.id)||typeof r.name!=='string'||!r.name.trim()||typeof r.text!=='string'||!r.text.trim()||!Number.isFinite(Date.parse(r.updatedAt)))return false;
   seen.add(r.id);return true;
  }).sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt)).slice(0,5).map((r,i)=>({id:'google-review-'+i,name:r.name,text:r.text,rating:5,photo:typeof r.photo==='string'?r.photo:'',date:new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date(r.updatedAt)),googleMapsUrl:'',visible:true}));
 }
 async function load(fetcher,signal){
  const response=await fetcher('js/booking-config.json',{cache:'no-store',signal});if(!response.ok)throw Error('Service unavailable');
  const config=await response.json();
  if(config.endpoint!==origin+'/functions/v1/booking-request'||typeof config.anonKey!=='string')throw Error('Service unavailable');
  const feed=await fetcher(origin+'/functions/v1/google-reviews',{headers:{apikey:config.anonKey,Authorization:'Bearer '+config.anonKey},cache:'no-store',signal});
  if(!feed.ok)throw Error('Reviews unavailable');return feed.json();
 }
 async function refresh(config,doc,fetcher,now=Date.now()){
  const view=doc.defaultView,section=doc.querySelector('.testimonials');
  if(!section||!view)return;
  const generation=(generations.get(doc)||0)+1;generations.set(doc,generation);
  section.querySelector('.reviews-source-note')?.remove();section.dataset.reviewSource='manual';
  if(polls.has(doc)){view.clearInterval(polls.get(doc));polls.delete(doc);}
  if(config.sections.reviews.source!=='google'||!config.sections.reviews.enabled)return;
  if(view.setInterval)polls.set(doc,view.setInterval(()=>{if(!doc.hidden)refresh(config,doc,fetcher);},15*60000));
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
  try{
   const payload=await load(fetcher||view.fetch.bind(view),controller.signal),items=select(payload,now);
   if(!items.length||generations.get(doc)!==generation)return;
   const next=JSON.parse(JSON.stringify(config.sections));next.reviews.items=items;next.reviews.rating=String(Math.round(payload.averageRating*10)/10);
   // Use the same safe renderer, links and slider as manually chosen reviews.
   view.HomepageSections.apply(view.HomepageSections.normalize(next,view.HomepageSettings.safeImage),doc);
   section.dataset.reviewSource='google';
   const note=doc.createElement('p');note.className='reviews-source-note';note.textContent='Latest five-star reviews from Google · Updated automatically';
   section.querySelector('.section-title')?.after(note);
  }catch{
   if(generations.get(doc)===generation){view.HomepageSections?.apply(config.sections,doc);section.dataset.reviewSource='manual';section.querySelector('.reviews-source-note')?.remove();}
  }
  finally{clearTimeout(timeout);}
 }
 return {select,load,refresh};
}));
