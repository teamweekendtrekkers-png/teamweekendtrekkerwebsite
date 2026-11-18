const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {validateSource}=require('../scripts/validate-source.cjs');
function fixture(run){
 const build=path.resolve(__dirname,'../build');fs.mkdirSync(build,{recursive:true});const root=fs.mkdtempSync(path.join(build,'source-check-'));
 try{
  fs.mkdirSync(path.join(root,'js'));fs.mkdirSync(path.join(root,'css'));
  fs.writeFileSync(path.join(root,'js/main.js'),'const tripsData = {};');
  fs.writeFileSync(path.join(root,'css/style.css'),'.example::before { content: "{"; }');
  const html='<!DOCTYPE html><html><head><title>Small trip catalogue</title><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="css/style.css?v=4"></head><body><script src="js/main.js?v=9"></script><script>const description="**New trip**";</script></body></html>';
  fs.writeFileSync(path.join(root,'index.html'),html);run(root,html);
 }finally{assert.ok(root.startsWith(build+path.sep));fs.rmSync(root,{recursive:true,force:true});}
}
test('source checks accept a small or empty catalogue, versioned assets and CSS content strings',()=>fixture(root=>{
 assert.deepEqual(validateSource(root,['index.html']).errors,[]);
}));
test('missing linked assets and broken JavaScript still block publishing',()=>fixture(root=>{
 fs.unlinkSync(path.join(root,'css/style.css'));fs.writeFileSync(path.join(root,'js/main.js'),'const broken = ;');
 const errors=validateSource(root,['index.html']).errors;
 assert.ok(errors.some(e=>e.includes('missing local asset css/style.css?v=4')));
 assert.ok(errors.some(e=>e.includes('JavaScript syntax error')));
}));
test('structured JSON and inline script syntax are checked as their actual types',()=>fixture((root,html)=>{
 fs.writeFileSync(path.join(root,'index.html'),html.replace('</body>','<script type="application/ld+json">{"@type":"TouristTrip"}</script></body>'));
 assert.deepEqual(validateSource(root,['index.html']).errors,[]);
 fs.writeFileSync(path.join(root,'index.html'),html.replace('const description="**New trip**";','const description = ;'));
 assert.ok(validateSource(root,['index.html']).errors.some(e=>e.includes('inline-1: JavaScript syntax error')));
}));
