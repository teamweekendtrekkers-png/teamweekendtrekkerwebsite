'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process');
const pages=['index.html','trips.html','trip-detail.html','checkout.html','about.html','contact.html'];
function attributes(tag){const result={};for(const m of tag.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))result[m[1].toLowerCase()]=m[2]??m[3];return result;}
function validateSource(root,entries=pages){
 root=path.resolve(root);const errors=[],scripts=new Set();
 const fail=(file,message)=>errors.push(file+': '+message);
 function syntax(text,file,module=false){try{if(module)cp.execFileSync(process.execPath,['--input-type=module','--check'],{input:text,stdio:'pipe'});else new vm.Script(text,{filename:file});}catch(error){fail(file,'JavaScript syntax error: '+(module?'invalid module':error.message));}}
 for(const file of entries){
  const target=path.join(root,file);if(!fs.existsSync(target)){fail(file,'page is missing');continue;}
  const html=fs.readFileSync(target,'utf8');
  for(const [pattern,label] of [[/<!doctype\s+html\s*>/i,'HTML doctype'],[/<head\b[\s\S]*<\/head\s*>/i,'head'],[/<body\b[\s\S]*<\/body\s*>/i,'body'],[/<title\b[^>]*>[^<]+<\/title>/i,'page title']])if(!pattern.test(html))fail(file,'missing '+label);
  const metas=[...html.matchAll(/<meta\b[^>]*>/gi)].map(m=>attributes(m[0]));
  if(!metas.some(m=>m.name==='viewport'&&/width\s*=\s*device-width/.test(m.content||'')))fail(file,'missing responsive viewport');
  let index=0;
  for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
   const attrs=attributes(match[1]);if(attrs.src)continue;const type=(attrs.type||'').toLowerCase(),name=file+':inline-'+(++index);
   if(type.includes('json')){try{JSON.parse(match[2]);}catch{fail(name,'invalid JSON');}}
   else if(!type||/javascript|module/.test(type))syntax(match[2],name,type==='module');
  }
  const markup=html.replace(/(<script\b[^>]*>)[\s\S]*?<\/script\s*>/gi,'$1</script>');
  for(const match of markup.matchAll(/<(script|link|img)\b([^>]*)>/gi)){
   const attrs=attributes(match[2]),tag=match[1].toLowerCase();
   const link=tag==='link'?(attrs.rel?.includes('stylesheet')?attrs.href:null):attrs.src;
   if(!link||/^(?:[a-z][\w+.-]*:|\/\/|#)/i.test(link)||link.includes('${'))continue;
   let decoded;try{decoded=decodeURIComponent(link.split(/[?#]/)[0]);}catch{fail(file,'invalid asset URL');continue;}
   const asset=path.resolve(root,decoded.startsWith('/')?'.'+decoded:decoded);
   if(!asset.startsWith(root+path.sep)||!fs.existsSync(asset))fail(file,'missing local asset '+link);
  }
 }
 function scan(directory){if(!fs.existsSync(directory))return;for(const item of fs.readdirSync(directory,{withFileTypes:true})){const file=path.join(directory,item.name);if(item.isDirectory())scan(file);else if(/\.(?:js|cjs|mjs)$/.test(item.name))scripts.add(file);}}
 scan(path.join(root,'js'));scan(path.join(root,'scripts'));
 for(const file of scripts)syntax(fs.readFileSync(file,'utf8'),path.relative(root,file),file.endsWith('.mjs'));
 return {errors,pages:entries.length,scripts:scripts.size};
}
if(require.main===module){const result=validateSource(path.resolve(__dirname,'..'));for(const error of result.errors)console.error(error);if(result.errors.length)process.exitCode=1;else console.log(`Source checks passed: ${result.pages} pages, ${result.scripts} scripts, linked assets and metadata.`);}
module.exports={validateSource};
