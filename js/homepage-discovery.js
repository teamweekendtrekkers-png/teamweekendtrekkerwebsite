(function(root,factory){
 const api=factory(typeof module==='object'&&module.exports?require('./trip-date-utils'):root.TripDateUtils);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.document.addEventListener('DOMContentLoaded',()=>api.init(root));
}(typeof globalThis!=='undefined'?globalThis:this,function(dates){
 'use strict';
 function choices(reference){
  const now=reference||new Date(),parts=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',timeZone:'Asia/Kolkata'}).formatToParts(now);
  const get=type=>Number(parts.find(part=>part.type===type).value);
  return [{value:'',label:'Any date'},{value:'weekend',label:'This weekend'},{value:'next-weekend',label:'Next weekend'},...[0,1,2].map(offset=>{
   const date=new Date(Date.UTC(get('year'),get('month')-1+offset,1)),value='month:'+date.getUTCFullYear()+'-'+String(date.getUTCMonth()+1).padStart(2,'0');
   return {value,label:new Intl.DateTimeFormat('en-IN',{month:'short',timeZone:'UTC'}).format(date)};
  })];
 }
 function matchingDepartures(trips,state,reference,discovery){return discovery.filterTrips(trips,state,reference).reduce((count,trip)=>{
  const window=dates.dateWindow(state.when,reference);
  return count+dates.getUpcomingDateRanges(trip,reference).filter(range=>!window||(range.start.getTime()>=window.start&&range.start.getTime()<window.end)).length;
 },0);}
 async function init(win){
  const doc=win.document,hero=doc.querySelector('.hero'),copy=hero?.querySelector('.hero-content');
  if(!hero||!copy||typeof tripsData!=='object'||!win.TripDiscovery)return;
  const config=await win.HomepageSettings.load(win.fetch.bind(win));
  const all=Object.entries(tripsData).map(([id,trip])=>({...trip,id}));
  const make=(tag,cls,text)=>{const node=doc.createElement(tag);node.className=cls||'';if(text!==undefined)node.textContent=text;return node;};
  const finder=make('div','weekend-finder'),heading=make('h2','','Find your kind of weekend');finder.append(heading);
  const saved=new URLSearchParams(win.location.search),categories=['all','trek','beach','heritage','getaway','adventure'];
  const state={query:'',when:choices().some(item=>item.value===saved.get('when'))?saved.get('when'):'',experience:categories.includes(saved.get('experience'))?saved.get('experience'):'all'};
  const categoryGroup=make('div','finder-choices');categoryGroup.setAttribute('role','group');categoryGroup.setAttribute('aria-label','Choose a trip experience');
  const whenGroup=make('div','finder-choices');whenGroup.setAttribute('role','group');whenGroup.setAttribute('aria-label','Choose when to travel');
  const result=make('a','btn btn-primary finder-results','Explore departures'),status=make('p','finder-status');status.setAttribute('aria-live','polite');
  const search=doc.getElementById('heroTripSearch'),form=search?.closest('form');
  if(search&&saved.has('q'))search.value=saved.get('q').slice(0,200);
  const hidden={};for(const name of ['when','experience']){const input=make('input');input.type='hidden';input.name=name;form?.append(input);hidden[name]=input;}
  function update(){
   state.query=search?.value||'';const count=matchingDepartures(all,state,new Date(),win.TripDiscovery),params=new URLSearchParams();
   for(const [key,value] of Object.entries({q:state.query,when:state.when,experience:state.experience==='all'?'':state.experience}))if(value)params.set(key,value);
   result.href='trips.html'+(params.size?'?'+params:'');result.textContent=count?`Show ${count} ${count===1?'departure':'departures'} →`:'Explore trips · no matching dates';
   const text=count?'Choose a departure, then review dates and prices.':'Try another date or experience. You can still browse all trips.';if(status.textContent!==text)status.textContent=text;
   hidden.when.value=state.when;hidden.experience.value=state.experience==='all'?'':state.experience;
   const url=new URL(win.location.href);for(const key of ['q','when','experience']){if(params.has(key))url.searchParams.set(key,params.get(key));else url.searchParams.delete(key);}if(url.href!==win.location.href)win.history.replaceState(win.history.state,'',url.href);
  }
  function buttons(group,items,field){for(const item of items){const button=make('button','finder-choice',item.label);button.type='button';button.dataset.value=item.value;button.setAttribute('aria-pressed',String(state[field]===item.value));button.onclick=()=>{state[field]=item.value;group.querySelectorAll('button').forEach(node=>node.setAttribute('aria-pressed',String(node===button)));update();search?.dispatchEvent(new Event('finderchange'));};group.append(button);}}
  buttons(categoryGroup,[{value:'all',label:'All experiences'},{value:'trek',label:'Treks'},{value:'beach',label:'Beaches'},{value:'heritage',label:'Heritage'},{value:'getaway',label:'Getaways'},{value:'adventure',label:'Adventure'}],'experience');
  const whenLabel=make('p','finder-label','When can you go?');
  buttons(whenGroup,choices(),'when');finder.append(categoryGroup,whenLabel,whenGroup,result,status);
  finder.hidden=!config.discovery.enabled;categoryGroup.hidden=!config.discovery.showExperienceFilter;whenGroup.hidden=whenLabel.hidden=!config.discovery.showWeekendFilter;
  const searchResults=doc.getElementById('heroSearchResults');(searchResults||form).after(finder);search?.addEventListener('input',update);win.addEventListener('pageshow',update);win.setInterval(update,30000);update();
  const layout=make('div','homepage-hero-layout'),collage=make('figure','traveller-collage');collage.setAttribute('aria-label','Moments from our travel community');
  const photos=[{path:config.hero.backgroundImage,alt:'Travellers sharing a weekend outdoors'},
   {path:'images/gallery/kannur-theyyam/img_1792608243209.png',alt:'A group visiting Kannur'},
   {path:'images/gallery/kannur-theyyam/img_1792608217401.png',alt:'Exploring Thalassery'}];
  for(const [index,photo] of photos.entries())if(win.TripDiscovery.safeImage(photo.path)){const image=make('img');image.alt=photo.alt;image.loading=index?'lazy':'eager';image.decoding='async';if(win.ResponsiveImages)win.ResponsiveImages.set(image,photo.path,{sizes:'(max-width:767px) 50vw, 30vw'});else image.src=photo.path;image.addEventListener('error',()=>image.hidden=true,{once:true});collage.append(image);}
  collage.append(make('figcaption','','Shared journeys. New stories.'));hero.append(layout);layout.append(copy,collage);hero.classList.add('homepage-discovery-ready');
  const featured=doc.getElementById('featured-trips-grid')?.closest('section'),reviews=doc.querySelector('.testimonials');if(featured&&reviews)featured.after(reviews);
  if(!win.matchMedia('(prefers-reduced-motion: reduce)').matches&&win.IntersectionObserver){const observer=new win.IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('home-revealed');observer.unobserve(entry.target);}}),{threshold:.08});doc.querySelectorAll('.trips-section,.testimonials,.homepage-info-section').forEach(node=>observer.observe(node));}
 }
 return {choices,matchingDepartures,init};
}));
