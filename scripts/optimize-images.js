// Original files stay untouched. Only referenced site photos are converted.
const fs=require('node:fs/promises'), path=require('node:path');
const sharp=require('sharp');
const root=path.resolve(process.argv[2] || path.join(__dirname,'..'));
async function main() {
 const sources=new Set();
 try {
  const prior=await fs.readFile(path.join(root,'js/image-manifest.js'),'utf8');
  const match=prior.match(/window\.IMAGE_MANIFEST = (\{[\s\S]*\});/);
  if(match) for(const image of Object.keys(JSON.parse(match[1]))) {
   if(/^images\/[A-Za-z0-9_./-]+\.(?:jpg|jpeg|png|webp)$/i.test(image)&&!image.includes('..')&&!image.startsWith('images/optimized/'))sources.add(image);
  }
 } catch(error) { if(error.code!=='ENOENT')throw error; }
 const texts=[];
 async function walk(dir) { for(const item of await fs.readdir(dir,{withFileTypes:true})) {
  if(['.git','node_modules','images','App'].includes(item.name)) continue;
  const file=path.join(dir,item.name);
  if(item.isDirectory()) await walk(file);
  else if(item.name !== 'image-manifest.js' && /\.(html|js|json|css)$/.test(item.name)) {
   const text=await fs.readFile(file,'utf8'); texts.push({file,text});
   for(const match of text.matchAll(/images\/[A-Za-z0-9_./-]+\.(?:jpg|jpeg|png|webp)/gi)) if(!match[0].startsWith('images/optimized/')) sources.add(match[0]);
  }
 }}
 await walk(root);
 const manifest={}; let before=0, after=0;
 const output=path.join(root,'images/optimized'); await fs.mkdir(output,{recursive:true});
 for(const relative of sources) {
  const input=path.join(root,relative);
  let stat; try {stat=await fs.stat(input);} catch(e) {if(e.code==='ENOENT')continue;throw e;}
  const metadata=await sharp(input,{failOn:'error'}).metadata();
  const prefix=relative.replace(/^images\//,'').replace(/[^A-Za-z0-9_-]/g,'_');
  const orientedWidth = metadata.orientation >= 5 && metadata.orientation <= 8 ? metadata.height : metadata.width;
  const widths=[320,640,960,1600].filter(width=>width<orientedWidth);
  widths.push(Math.min(orientedWidth,1600));
  const sizes=[...new Set(widths)].sort((a,b)=>a-b);
  const webp=[], avif=[];
  for(const width of sizes) {
   const name='images/optimized/'+prefix+'-'+width+'.webp';
   let cached; try { cached=await fs.stat(path.join(root,name)); } catch (_) {}
   if(!cached || cached.mtimeMs<stat.mtimeMs) await sharp(input).rotate().resize({width,withoutEnlargement:true}).webp({quality:78,effort:4}).toFile(path.join(root,name));
   after+=(await fs.stat(path.join(root,name))).size; webp.push({width,path:name});
  }
  // AVIF is offered to picture-capable clients; keep a WebP fallback.
  for(const width of sizes.filter(width=>width===640||width===960)) {
   const name='images/optimized/'+prefix+'-'+width+'.avif';
   let cached; try { cached=await fs.stat(path.join(root,name)); } catch (_) {}
   if(!cached || cached.mtimeMs<stat.mtimeMs) await sharp(input).rotate().resize({width,withoutEnlargement:true}).avif({quality:48,effort:2}).toFile(path.join(root,name));
   after+=(await fs.stat(path.join(root,name))).size; avif.push({width,path:name});
  }
  before+=stat.size; manifest[relative]={webp,avif,width:metadata.width,height:metadata.height};
 }
 await fs.writeFile(path.join(root,'js/image-manifest.js'),'window.IMAGE_MANIFEST = '+JSON.stringify(manifest)+';\n');
 // Static images get correct candidates before the browser starts fetching.
 for(const {file,text} of texts.filter(item=>item.file.endsWith('.html'))) {
  const next=text.replace(/<img\b[^>]*>/g,tag=>{
   const match=tag.match(/\bsrc="(images\/[^"]+)"/); const entry=match&&manifest[match[1]];
   if(!entry||/\bsrcset=/.test(tag))return tag;
   const srcset=entry.webp.map(item=>item.path+' '+item.width+'w').join(', ');
   const fallback=entry.webp.find(item=>item.width>=640)||entry.webp.at(-1);
   let img=tag.replace(match[0],'src="'+fallback.path+'"').replace(/>$/,' srcset="'+srcset+'" sizes="(max-width: 767px) 100vw, 70vw" decoding="async">');
   if(entry.avif.length && !/\bid=/.test(tag)) img='<picture><source type="image/avif" srcset="'+entry.avif.map(item=>item.path+' '+item.width+'w').join(', ')+'" sizes="(max-width: 767px) 100vw, 70vw">'+img+'</picture>';
   return img;
  });
  if(next!==text)await fs.writeFile(file,next);
 }
 console.log(JSON.stringify({photos:Object.keys(manifest).length,originalBytes:before,derivativeBytes:after}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
