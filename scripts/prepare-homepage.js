'use strict';
const fs=require('node:fs'),path=require('node:path');
const {normalize,safeImage}=require('../js/homepage-settings');
function prepare(root){
 const config=normalize(JSON.parse(fs.readFileSync(path.join(root,'js/homepage-config.json'),'utf8')));
 let manifest={};try{const source=fs.readFileSync(path.join(root,'js/image-manifest.js'),'utf8');const match=source.match(/window\.IMAGE_MANIFEST = (\{[\s\S]*\});/);if(match)manifest=JSON.parse(match[1]);}catch{}
 const choose=(source,width)=>{
  const record=manifest[source]||manifest.images?.[source];
  const variants=record?.webp||[];return (variants.find(item=>item.width>=width)||variants.at(-1))?.path||source;
 };
 const desktop=choose(config.hero.backgroundImage,1600),mobile=choose(config.presentation.heroMobileImage||config.hero.backgroundImage,640);
 if(!safeImage(desktop)||!safeImage(mobile))throw new Error('Invalid homepage image');
 let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 html=html.replace(/<!-- INITIAL_HOMEPAGE_START -->[\s\S]*?<!-- INITIAL_HOMEPAGE_END -->\s*/,'');
 const data=JSON.stringify(config).replace(/</g,'\\u003c');
 const initial=`<!-- INITIAL_HOMEPAGE_START -->
<link rel="preload" as="image" href="${desktop}" media="(min-width:768px)" fetchpriority="high">
<link rel="preload" as="image" href="${mobile}" media="(max-width:767px)" fetchpriority="high">
<style>.hero{background-image:url("${desktop}");background-position:${config.presentation.heroFocalPoint}}@media(max-width:767px){.hero{background-image:url("${mobile}");background-position:${config.presentation.heroMobileFocalPoint}}}</style>
<script id="homepage-initial-config" type="application/json">${data}</script>
<!-- INITIAL_HOMEPAGE_END -->`;
 html=html.replace('</head>',initial+'\n</head>');fs.writeFileSync(path.join(root,'index.html'),html);
 return {desktop,mobile};
}
if(require.main===module)console.log(prepare(path.resolve(__dirname,'..')));
module.exports={prepare};
