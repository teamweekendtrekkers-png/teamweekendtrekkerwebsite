const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),cp=require('node:child_process'),util=require('node:util'),crypto=require('node:crypto');
const sharp=require('sharp'),run=util.promisify(cp.execFile);
sharp.cache(false);
test('deployment creates responsive candidates, retains original bytes and avoids recursive derivatives',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'twt-images-'));
 try {
  await fs.mkdir(path.join(root,'images'));await fs.mkdir(path.join(root,'js'));
  const photo=path.join(root,'images/photo.jpg');
  await sharp({create:{width:1200,height:800,channels:3,background:'#245BB5'}}).jpeg().toFile(photo);
  const hash=async()=>crypto.createHash('sha256').update(await fs.readFile(photo)).digest('hex'),before=await hash();
  await fs.writeFile(path.join(root,'index.html'),'<html><head></head><body><img src="images/photo.jpg" alt="Photo"></body></html>');
  const script=path.resolve(__dirname,'../scripts/optimize-images.js');
  await run(process.execPath,[script,root]);
  assert.equal(await hash(),before);
  const context={window:{}};vm.runInNewContext(await fs.readFile(path.join(root,'js/image-manifest.js'),'utf8'),context);
  const candidates=context.window.IMAGE_MANIFEST['images/photo.jpg'];
  assert.equal(candidates.webp.length,4);assert.equal(candidates.avif.length,2);
  for(const candidate of candidates.webp){
   const metadata=await sharp(path.join(root,candidate.path)).metadata();
   assert.equal(metadata.width,candidate.width);assert.equal(metadata.format,'webp');
  }
  const html=await fs.readFile(path.join(root,'index.html'),'utf8');assert.match(html,/image\/avif/);assert.match(html,/srcset=/);
  await run(process.execPath,[script,root]);
  assert.equal((await fs.readdir(path.join(root,'images/optimized'))).length,6);
  assert.match(await fs.readFile(path.join(root,'js/image-manifest.js'),'utf8'),/images\/photo.jpg/);
 } finally {assert.equal(path.dirname(root),path.resolve(os.tmpdir()));assert.ok(path.basename(root).startsWith('twt-images-'));await fs.rm(root,{recursive:true,force:true,maxRetries:5,retryDelay:100});}
});
