(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else {root.AboutContent=api;const start=async()=>{
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),5000);
  try{const response=await root.fetch('/js/homepage-config.json',{cache:'no-cache',signal:controller.signal});
   if(response.ok){const data=await response.json();if(data?.version===1)api.apply(data,root.document);}
  }catch(_){}finally{clearTimeout(timeout);}
 };if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',start,{once:true});else start();}
}(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function apply(config,document){
  const items=config?.sections?.stats?.items;
  if(!Array.isArray(items))return;
  for(const id of ['trips','travellers','rating','destinations']){
   const item=items.find(item=>item&&item.id===id);
   if(!item||typeof item.value!=='string'||!item.value.trim()||item.value.length>120)continue;
   let value=item.value.trim();
   const rating=config?.sections?.reviews?.rating;
   if(id==='rating'&&typeof rating==='string'&&/^(?:[0-4](?:\\.\\d+)?|5(?:\\.0+)?)$/.test(rating))value=rating+'⭐';
   const card=document.querySelector('[data-about-stat="'+id+'"]');
   const number=card?.querySelector('.number'),label=card?.querySelector('.label');
   if(number)number.textContent=value;
   if(label&&typeof item.label==='string'&&item.label.trim()&&item.label.length<=120)label.textContent=item.label.trim();
   if(id==='travellers'){const intro=document.getElementById('aboutTravellersCount');if(intro)intro.textContent=value;}
  }
 }
 return {apply};
}));
