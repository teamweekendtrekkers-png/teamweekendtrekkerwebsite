'use strict';
const {section,extraSections,icons,policyLabel,cleanText}=require('../js/trip-content');
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function inner(source,attribute,value,html){
 const re=new RegExp('<(div|ul|span|p|section)\\b[^>]*\\b'+attribute+'="'+value+'"[^>]*>');const start=re.exec(source);if(!start)return source;const tag=start[1],offset=start.index+start[0].length;const tokens=new RegExp('</?'+tag+'\\b[^>]*>','g');tokens.lastIndex=offset;let depth=1,m;while((m=tokens.exec(source))){depth+=m[0].startsWith('</')?-1:1;if(!depth)return source.slice(0,offset)+html+source.slice(m.index);}throw Error('Unclosed '+value);
}
function renderBody(source,trip,config){
 source=inner(source,'class','trip-section-body',String(trip.about||'').split(/\n\s*\n/).filter(Boolean).map(p=>'<p>'+escape(cleanText(p))+'</p>').join(''));
 source=inner(source,'class','highlights-list',(trip.highlights||[]).map(h=>'<li>'+escape(cleanText(h))+'</li>').join(''));
 source=inner(source,'class','itinerary-accordion',(trip.itinerary||[]).map((d,i)=>'<div class="accordion-item '+(i===0?'active':'')+'"><div class="accordion-header" onclick="toggleAccordion('+i+')"><span class="day-badge">'+escape(cleanText(d.day))+'</span><h3>'+escape(cleanText(d.title))+'</h3><i class="fas fa-chevron-down"></i></div><div class="accordion-content"><ul>'+(d.activities||[]).map(a=>'<li>'+escape(cleanText(a))+'</li>').join('')+'</ul></div></div>').join(''));
 source=source.replace(/(<div class="includes-box">[\s\S]*?<ul>)[\s\S]*?(<\/ul>)/,(_,a,b)=>a+(trip.includes||[]).map(t=>'<li>'+escape(t)+'</li>').join('')+b);
 source=source.replace(/(<div class="excludes-box">[\s\S]*?<ul>)[\s\S]*?(<\/ul>)/,(_,a,b)=>a+(trip.excludes||[]).map(t=>'<li>'+escape(t)+'</li>').join('')+b);
 source=inner(source,'id','thingsToCarryGrid',(trip.thingsToCarry||[]).map(t=>'<div class="carry-item">'+escape(cleanText(t))+'</div>').join(''));
 const glance=section(trip,config,'glance');
 source=inner(source,'class','glance-grid',glance?glance.items.filter(i=>i.enabled!==false&&String(i.field?trip[i.field]||'':i.value||'').trim()).map(i=>'<div class="glance-item"><span class="glance-label">'+escape(i.label)+'</span><strong class="glance-value">'+escape(i.field?trip[i.field]:i.value)+'</strong></div>').join(''):'');
 for(const [id,field] of Object.entries(require('../js/trip-decision').factFields))source=inner(source,'id',id,escape(trip[field]||''));
 for(const [key,id] of [['highlights','tripHighlights'],['guidelines','guidelinesGrid'],['faqs','faqAccordion'],['cancellation','policyCards']]){const s=section(trip,config,key);let html='';if(s){html=s.items.filter(item=>key==='cancellation'||item.enabled!==false).map(item=>key==='highlights'?'<li>'+(item.title?'<strong>'+escape(item.title)+' — </strong>':'')+escape(item.description)+'</li>':key==='guidelines'?'<div class="guideline-card"><h4>'+escape(item.title)+'</h4><p>'+escape(item.description)+'</p></div>':key==='faqs'?'<details class="faq-row"><summary>'+escape(item.question)+'</summary><p>'+escape(item.answer)+'</p></details>':'<div class="policy-card"><strong>'+escape(policyLabel(item))+'</strong><p>Cancellation fee: '+item.percent+'%</p></div>').join('');}source=inner(source,'id',id,html);const at=source.indexOf('id="'+id+'"'),start=source.lastIndexOf('<details',at);if(start>=0){const end=source.indexOf('>',start);source=source.slice(0,start)+source.slice(start,end).replace(/\sopen\b|\shidden\b/g,'')+(s?(s.expanded?' open':''):' hidden')+source.slice(end);const summaryStart=source.indexOf('<summary',start),summaryEnd=source.indexOf('>',summaryStart),summaryClose=source.indexOf('</summary>',summaryEnd);if(s&&summaryStart<at)source=source.slice(0,summaryEnd+1)+escape(s.heading)+source.slice(summaryClose);}if(key==='cancellation')source=inner(source,'class','policy-notes',s?[s.refundNote,s.changeNote].filter(Boolean).map(n=>'<p>'+escape(n)+'</p>').join(''):'');}
 const extras=extraSections(trip);
 source=inner(source,'id','customTripSections',extras.map(s=>'<details class="content-section mobile-section custom-trip-section" id="trip-'+escape(s.key)+'"'+(s.expanded?' open':'')+'><summary>'+escape(s.heading)+'</summary><div class="guidelines-grid">'+s.items.map(item=>'<div class="guideline-card"><i aria-hidden="true" class="fas '+icons[item.icon]+'"></i>'+(item.title?'<h4>'+escape(item.title)+'</h4>':'')+'<p>'+escape(item.description)+'</p></div>').join('')+'</div></details>').join(''));
 return source;
}
module.exports={inner,renderBody};

