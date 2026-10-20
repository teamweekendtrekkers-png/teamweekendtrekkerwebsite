(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TripText=api;}(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function runs(value,bold=false,italic=false,depth=0){
  const source=String(value??''),out=[];if(depth>12)return [{text:source,bold,italic}];
  const pattern=/(\*{1,3})(?=\S)([\s\S]*?\S|\S)\1(?!\*)/g;let cursor=0,match;
  while((match=pattern.exec(source))){
   if(match.index>cursor)out.push({text:source.slice(cursor,match.index),bold,italic});
   const n=match[1].length;out.push(...runs(match[2],bold||n>=2,italic||n===1||n===3,depth+1));cursor=pattern.lastIndex;
  }
  if(cursor<source.length)out.push({text:source.slice(cursor),bold,italic});
  return out.length?out:[{text:source,bold,italic}];
 }
 function plain(value){return runs(value).map(run=>run.text).join('');}
 function html(value){return runs(value).map(run=>{let text=escape(run.text);if(run.italic)text='<em>'+text+'</em>';if(run.bold)text='<strong>'+text+'</strong>';return text;}).join('');}
 function fragment(doc,value){const result=doc.createDocumentFragment();for(const run of runs(value)){let node=doc.createTextNode(run.text);if(run.italic){const em=doc.createElement('em');em.append(node);node=em;}if(run.bold){const strong=doc.createElement('strong');strong.append(node);node=strong;}result.append(node);}return result;}
 function set(node,value){if(!node)return;node.dataset.tripTextSource=String(value??'');node.replaceChildren(fragment(node.ownerDocument,value));}
 return {runs,plain,html,fragment,set,escape};
}));
