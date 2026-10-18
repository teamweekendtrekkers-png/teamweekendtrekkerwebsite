'use strict';
const assert=require('node:assert/strict');
function luminance(rgb){
 const c=rgb.match(/[\d.]+/g).slice(0,3).map(Number).map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;});
 return .2126*c[0]+.7152*c[1]+.0722*c[2];
}
async function assertReadable(locator){
 const colors=await locator.evaluate(element=>{
  let node=element,background;
  while(node){
   const value=getComputedStyle(node).backgroundColor;
   if(value!=='rgba(0, 0, 0, 0)'&&value!=='transparent'){background=value;break;}
   node=node.parentElement;
  }
  return {foreground:getComputedStyle(element).color,background:background||'rgb(255, 255, 255)'};
 });
 const a=luminance(colors.foreground),b=luminance(colors.background);
 const ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
 assert.ok(ratio>=4.5,'Text contrast '+ratio.toFixed(2)+' is below 4.5:1: '+JSON.stringify(colors));
 return colors;
}
module.exports={assertReadable};
