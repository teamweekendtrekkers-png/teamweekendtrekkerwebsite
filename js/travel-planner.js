(function(root,factory){
 const api=factory(typeof module==='object'&&module.exports?require('./trip-date-utils'):root.TripDateUtils);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else{root.TravelPlanner=api;root.document.addEventListener('DOMContentLoaded',()=>api.init(root));}
}(typeof globalThis!=='undefined'?globalThis:this,function(dates){
 'use strict';
 const clean=(value,max=200)=>String(value??'').trim().slice(0,max);
 function entries(trips,reference=new Date()){
  return trips.flatMap(trip=>dates.getUpcomingDateRanges({...trip,closedDepartures:[],soldOutDepartures:[]},reference).map(range=>({trip,range,status:dates.departureStatus(trip,range.key)}))).sort((a,b)=>a.range.start-b.range.start||clean(a.trip.title).localeCompare(clean(b.trip.title)));
 }
 function collections(trips,discovery,reference=new Date()){
  const active=trips.filter(trip=>dates.getUpcomingDateRanges(trip,reference).length);
  const options=[{title:'Weekend escapes',subtitle:'Find your next Friday departure',when:'next-weekend'},{title:'Cultural experiences',subtitle:'Temples, traditions and heritage',experience:'heritage'},{title:'Trails & outdoors',subtitle:'Explore hills and walking trails',experience:'trek'},{title:'Longer getaways',subtitle:'Three days or more',long:true}];
  return options.map(option=>({...option,trips:discovery.filterTrips(active,{when:option.when,experience:option.experience,collection:option.long?'long':''},reference)})).filter(item=>item.trips.length);
 }
 function enquiryPayload(values){
  const name=clean(values.name,100),phone=clean(values.phone,25).replace(/[\s()+-]/g,''),travellers=Number(values.travellers);
  if(name.length<2||!/^\d{10,15}$/.test(phone)||!Number.isInteger(travellers)||travellers<1||travellers>100)throw Error('Enter your name, a valid phone number and 1–100 travellers.');
  const type=values.type==='group'?'Custom group trip':'Callback request';
  return {access_key:'519286b7-8c28-4093-8cf1-6ad73f9233b7',subject:type+' · '+(clean(values.trip,180)||'Help choosing a trip'),from_name:'Team Weekend Trekkers Website',name,phone,
   message:[type,'Trip / destination: '+(clean(values.trip)||'Please help me choose'),'Preferred dates: '+(clean(values.date,100)||'Flexible'),'Travellers: '+travellers,'Group type: '+clean(values.group,60),'Notes: '+clean(values.notes,1500)].join('\n')};
 }
 async function init(win){
  const doc=win.document;if(typeof tripsData!=='object')return;
  const all=Object.entries(tripsData).map(([id,trip])=>({...trip,id}));
  const make=(tag,cls,text)=>{const node=doc.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
  const title=trip=>win.TripDiscovery?win.TripDiscovery.displayTitle(trip):clean(trip.cardTitle||trip.title);
  const button=(label,cls)=>{const node=make('button',cls,label);node.type='button';return node;};
  const enquiryButton=(label,id='',type='callback')=>{const node=button(label,'planner-enquiry');node.dataset.enquiryTrip=id;node.dataset.enquiryType=type;return node;};
  const currentId=typeof getTripFromURL==='function'?getTripFromURL():null,current=all.find(trip=>trip.id===currentId);
  const upcoming=doc.querySelector('#upcoming-batches .container')||doc.getElementById('trip-discovery-controls')?.parentElement;
  if(upcoming||current){
   const host=make('details','departure-calendar');host.id='departure-calendar';const summary=make('summary','','Browse departure calendar');host.append(summary);
   const content=make('div','calendar-content'),navigation=make('div','calendar-navigation'),previous=button('←','calendar-arrow'),next=button('→','calendar-arrow'),caption=make('h3');
   previous.setAttribute('aria-label','Previous month');next.setAttribute('aria-label','Next month');navigation.append(previous,caption,next);
   const hint=make('p','planner-muted','Highlighted days are departure dates. Select a day to see trips. Dates follow India time.');
   const table=make('table','calendar-table');table.setAttribute('aria-label','Departure dates');
   const results=make('div','calendar-results');results.setAttribute('aria-live','polite');
   content.append(navigation,hint,table,results);host.append(content);
   if(current)doc.getElementById('dateSelect')?.closest('.form-group')?.before(host);else upcoming.append(host);
   let month,selected='',data=[];const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
   const monthKey=date=>date.toISOString().slice(0,7);
   month=today().slice(0,7);
   function render(focusDay=false){
    data=entries(current?[current]:all);const visible=data.filter(item=>item.range.startKey.startsWith(month));
    if(!visible.some(item=>item.range.startKey===selected))selected=visible[0]?.range.startKey||'';
    caption.textContent=new Intl.DateTimeFormat('en-IN',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-01T00:00:00Z'));
    const first=new Date(month+'-01T00:00:00Z'),offset=(first.getUTCDay()+6)%7,days=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
    const head=make('thead'),header=make('tr');for(const label of ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']){const cell=make('th','',label);cell.scope='col';header.append(cell);}head.append(header);
    const body=make('tbody');let row;
    for(let index=0;index<Math.ceil((offset+days)/7)*7;index++){
     if(index%7===0){row=make('tr');body.append(row);}const cell=make('td');row.append(cell);const day=index-offset+1;if(day<1||day>days)continue;
     const key=month+'-'+String(day).padStart(2,'0'),matches=visible.filter(item=>item.range.startKey===key);
     if(!matches.length){cell.append(make('span','calendar-empty-day',String(day)));continue;}
     const node=button(String(day),'calendar-day');node.dataset.day=key;node.setAttribute('aria-pressed',String(selected===key));node.setAttribute('aria-label',`${day} ${caption.textContent}: ${matches.length} ${matches.length===1?'departure':'departures'}`);
     node.append(make('small','',String(matches.length)));if(key===today())node.setAttribute('aria-current','date');node.onclick=()=>{selected=key;render(true);};cell.append(node);
    }
    table.replaceChildren(head,body);results.replaceChildren();
    if(!visible.length)results.append(make('p','planner-muted','No scheduled departures this month. Try the next month or ask us about new dates.'));
    else{
     results.append(make('h4','',new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(selected+'T00:00:00Z'))));
     for(const item of visible.filter(item=>item.range.startKey===selected)){
      const card=make('article','calendar-departure'),link=make('a','',title(item.trip));
      const bookable=['available','confirmed'].includes(item.status.key);link.href=bookable?win.TripLinks.departureUrl(item.trip.id,item.range.originalLabel):win.TripLinks.detailUrl(item.trip.id);
      card.append(link,make('p','planner-muted',item.range.fullLabel));const status=make('span','departure-status',item.status.label);status.dataset.status=item.status.key;card.append(status);
      if(current&&bookable){const select=button('Choose this departure','planner-enquiry');select.onclick=()=>{const input=doc.getElementById('dateSelect');if([...input.options].some(option=>option.value===item.range.originalLabel)){input.value=item.range.originalLabel;input.dispatchEvent(new Event('change',{bubbles:true}));host.open=false;input.focus();}};card.append(select);}
      results.append(card);
     }
    }
    previous.disabled=month<=today().slice(0,7);const max=data.at(-1)?.range.startKey.slice(0,7)||today().slice(0,7);next.disabled=month>=max;
    if(focusDay)table.querySelector(`[data-day="${selected}"]`)?.focus();
   }
   const move=offset=>{const date=new Date(month+'-01T00:00:00Z');date.setUTCMonth(date.getUTCMonth()+offset);month=monthKey(date);render();};previous.onclick=()=>move(-1);next.onclick=()=>move(1);host.addEventListener('toggle',()=>{if(host.open)render();});win.addEventListener('pageshow',()=>{if(host.open)render();});render();
  }
  if(win.TripDiscovery&&doc.body.classList.contains('homepage')){
   const featured=doc.getElementById('featured-trips-grid')?.closest('section'),reviews=doc.querySelector('.testimonials');
   const config=await win.HomepageSettings.load(win.fetch.bind(win));
   if(config.discovery.enabled&&featured){
    const section=make('section','planner-section trip-collections'),container=make('div','container');section.append(container);container.append(make('h2','','Find your next escape'));
    const rail=make('div','collection-grid');for(const item of collections(all,win.TripDiscovery)){
     const link=make('a','collection-card');const params=new URLSearchParams();if(item.when)params.set('when',item.when);if(item.experience)params.set('experience',item.experience);if(item.long)params.set('collection','long');link.href='trips.html?'+params;
     link.append(make('strong','',item.title),make('span','',item.subtitle),make('small','',`${item.trips.length} ${item.trips.length===1?'trip':'trips'} →`));rail.append(link);
    }container.append(rail);if(rail.childElementCount)featured.before(section);
   }
   const photoTrips=all.filter(trip=>trip.isActive!==false&&Array.isArray(trip.galleryImages)&&trip.galleryImages.some(path=>win.TripDiscovery.safeImage(path)));
   if(reviews&&photoTrips.length){
    const section=make('section','planner-section travel-moments'),container=make('div','container');section.append(container);container.append(make('h2','','Moments from our trips'),make('p','planner-muted','Explore photos from the trip galleries. Swipe to browse.'));
    const rail=make('div','moments-rail');rail.tabIndex=0;rail.setAttribute('aria-label','Trip photos; scroll to browse');
    for(const trip of photoTrips.slice(0,6)){
     const link=make('a','moment-card');link.href=win.TripLinks.detailUrl(trip.id);const image=make('img');image.alt=title(trip)+' trip gallery';image.loading='lazy';image.decoding='async';const path=trip.galleryImages.find(path=>win.TripDiscovery.safeImage(path));
     if(win.ResponsiveImages)win.ResponsiveImages.set(image,path,{sizes:'(max-width:767px) 72vw, 300px'});else image.src=path;
     image.addEventListener('error',()=>link.hidden=true,{once:true});link.append(image,make('span','',title(trip)));rail.append(link);
    }
    container.append(rail);reviews.before(section);
   }
   if(featured){const help=make('section','planner-section planner-help'),container=make('div','container');help.append(container);container.append(make('h2','','A trip that fits your plans'),make('p','planner-muted','Need help choosing, or planning for friends, family or your team?'),enquiryButton('Help me choose'),enquiryButton('Plan a group trip','','group'));featured.after(help);}
  }
  if(current){const controls=doc.querySelector('.quick-contact');controls?.append(enquiryButton('Request a callback',current.id),enquiryButton('Plan a group trip',current.id,'group'));}
  // One delegated handler survives catalogue filtering and card refreshes.
  let dialog,form,contextTrip='',contextType='callback',opener,busy=false;
  function setup(){
   dialog=make('dialog','planner-dialog');dialog.setAttribute('aria-labelledby','enquiry-heading');form=make('form');form.method='dialog';
   const heading=make('h2');heading.id='enquiry-heading';const top=make('div','enquiry-top'),dismiss=button('Close','planner-enquiry');dismiss.onclick=()=>{if(!busy)dialog.close();};top.append(heading,dismiss);const note=make('p','planner-muted','Share your preferences with our team. This is an enquiry, not a confirmed booking.');form.append(top,note);
   for(const [key,label,type,required] of [['name','Your name','text',true],['phone','Phone / WhatsApp number','tel',true],['trip','Trip or destination','text',false],['date','Preferred dates (optional)','text',false],['travellers','Number of travellers','number',true],['group','Group type (optional)','text',false],['notes','Anything else? (optional)','textarea',false]]){
    const wrapper=make('label','enquiry-field',label),input=make(type==='textarea'?'textarea':'input');input.name=key;if(type!=='textarea')input.type=type;input.required=required;
    if(type==='number'){input.min='1';input.max='100';input.value='1';}else input.maxLength=key==='notes'?1500:key==='phone'?25:200;
    if(key==='name')input.autocomplete='name';if(key==='phone')input.autocomplete='tel';wrapper.append(input);form.append(wrapper);
   }
   const trap=make('input');trap.name='botcheck';trap.type='checkbox';trap.hidden=true;trap.tabIndex=-1;form.append(trap);
   const privacy=make('p','planner-muted','By sending, you agree that our team may contact you about this enquiry by phone or WhatsApp.');form.append(privacy);
   const status=make('p','enquiry-status');status.id='enquiry-status';status.setAttribute('role','status');
   const actions=make('div','enquiry-actions'),submit=make('button','btn btn-primary','Send enquiry');submit.type='submit';const close=button('Close','btn btn-secondary');close.onclick=()=>dialog.close();
   const fallback=make('a','planner-enquiry','Ask on WhatsApp instead');fallback.href='https://wa.me/917019235581';fallback.target='_blank';fallback.rel='noopener';actions.append(submit,close);form.append(status,actions,fallback);dialog.append(form);doc.body.append(dialog);
   dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});dialog.addEventListener('close',()=>opener?.focus());
   form.addEventListener('input',()=>{try{fallback.href='https://wa.me/917019235581?text='+encodeURIComponent(enquiryPayload({...Object.fromEntries(new FormData(form)),type:contextType}).message);}catch{fallback.href='https://wa.me/917019235581';}});
   form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||!form.reportValidity()||trap.checked)return;let payload;try{payload=enquiryPayload({...Object.fromEntries(new FormData(form)),type:contextType});}catch(error){status.textContent=error.message;return;}
    busy=true;submit.disabled=true;close.disabled=true;submit.textContent='Sending…';status.textContent='Sending your enquiry…';
    try{const response=await win.fetch('https://api.web3forms.com/submit',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});const result=await response.json();if(!response.ok||result.success!==true)throw Error('delivery');
     status.textContent='Enquiry sent. Our team will contact you about your trip. Your booking is not confirmed.';submit.textContent='Enquiry sent';for(const input of form.querySelectorAll('input,textarea'))input.disabled=true;
    }catch{status.textContent='We could not confirm delivery. Your details are kept here. Please contact us on WhatsApp before sending again.';submit.textContent='Try sending again';submit.disabled=false;}
    finally{busy=false;close.disabled=false;}
   });
  }
  doc.addEventListener('click',event=>{
   const trigger=event.target.closest('[data-enquiry-trip]');if(!trigger)return;event.preventDefault();if(!dialog)setup();if(busy)return;
   opener=trigger;contextTrip=trigger.dataset.enquiryTrip||'';contextType=trigger.dataset.enquiryType==='group'?'group':'callback';const trip=all.find(item=>item.id===contextTrip);
   form.querySelector('a').href='https://wa.me/917019235581?text='+encodeURIComponent((contextType==='group'?'I would like to plan a group trip':'Please help me choose a trip')+(trip?' · '+title(trip):''));
   form.reset();form.querySelectorAll('input,textarea').forEach(input=>input.disabled=false);const field=name=>form.elements.namedItem(name);
   field('trip').value=trip?title(trip):'';field('travellers').value=contextType==='group'?'6':doc.getElementById('peopleCount')?.value||'1';field('date').value=trigger.dataset.enquiryDate||(trip&&current?.id===trip.id?doc.getElementById('dateSelect')?.value||'':'');
   field('group').closest('label').hidden=contextType!=='group';dialog.querySelector('h2').textContent=contextType==='group'?'Plan a group trip':'Request a callback';dialog.querySelector('#enquiry-status').textContent='';const submit=form.querySelector('[type="submit"]');submit.disabled=false;submit.textContent='Send enquiry';dialog.showModal();field('name').focus();
  });
 }
 return {entries,collections,enquiryPayload,init};
}));
