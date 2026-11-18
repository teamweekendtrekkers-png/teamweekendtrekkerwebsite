(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.PackingChecklist=api;root.document.addEventListener('DOMContentLoaded',()=>api.install(root));}})(typeof window==='undefined'?null:window,function(){
 'use strict';
 function createState(storage,key){
  let checked=new Set(),persistent=true;
  try{const saved=JSON.parse(storage.getItem(key)||'[]');if(Array.isArray(saved))checked=new Set(saved.filter(v=>typeof v==='string'&&v.length<=1200).slice(0,500));}catch{persistent=false;}
  return {checked,get persistent(){return persistent;},save(){try{storage.setItem(key,JSON.stringify([...checked].slice(0,500)));persistent=true;}catch{persistent=false;}},reset(){checked.clear();try{storage.removeItem(key);persistent=true;}catch{persistent=false;}}};
 }
 function install(win){
  const doc=win.document,grid=doc.getElementById('thingsToCarryGrid'),id=typeof win.getTripFromURL==='function'?win.getTripFromURL():null;
  if(!grid||!id||grid.dataset.packingReady)return;
  const items=[...grid.querySelectorAll('.carry-item')].filter(item=>item.textContent.trim());if(!items.length)return;
  grid.dataset.packingReady='true';let storage;try{storage=win.localStorage;}catch{storage={getItem(){throw Error();},setItem(){throw Error();},removeItem(){throw Error();}};}
  const state=createState(storage,'twt-packing:v1:'+id),make=(tag,cls,text)=>{const n=doc.createElement(tag);n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const panel=make('div','packing-progress'),top=make('div','packing-progress-heading'),heading=make('strong','','Packing progress'),reset=make('button','packing-reset','Reset packing');reset.type='button';top.append(heading,reset);
  const count=make('p','packing-count');count.setAttribute('aria-live','polite');const progress=make('progress','packing-bar');progress.max=items.length;progress.setAttribute('aria-label','Packing progress');
  const note=make('p','packing-note');panel.append(top,count,progress,note);grid.before(panel);
  const inputs=[],duplicates=new Map();
  for(const item of items){
   const text=item.textContent.normalize('NFC').replace(/\s+/g,' ').trim().toLowerCase(),n=duplicates.get(text)||0;duplicates.set(text,n+1);const itemKey=text.slice(0,1100)+'#'+n;
   const label=make('label',item.className+' packing-item'),input=make('input','packing-checkbox');input.type='checkbox';input.checked=state.checked.has(itemKey);
   item.querySelector('i')?.remove();const content=make('span','packing-text');content.append(...item.childNodes);label.append(input,content);item.replaceWith(label);inputs.push(input);
   input.addEventListener('change',()=>{if(input.checked)state.checked.add(itemKey);else state.checked.delete(itemKey);state.save();update();});
  }
  function update(){const packed=inputs.filter(input=>input.checked).length,percent=Math.round(packed/items.length*100);count.textContent=packed+' of '+items.length+' items packed · '+percent+'%';progress.value=packed;reset.disabled=packed===0;note.textContent=state.persistent?'Saved on this device for this trip.':'Checklist works for this visit, but this browser could not save it.';}
  reset.onclick=()=>{state.reset();inputs.forEach(input=>input.checked=false);update();};update();
 }
 return {createState,install};
});
