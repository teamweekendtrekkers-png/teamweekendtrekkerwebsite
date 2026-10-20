// Offline presentation fixtures only; no bookings or messages are sent.
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {assertReadable}=require('./color-contrast.cjs');
const colors=require('../js/departure-colors'),text=require('../js/inline-format'),discovery=require('../js/trip-discovery');
const root=path.resolve(__dirname,'..'),origin='https://presentation.test';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined});
 try{
  for(const width of [390,1440]){
   const page=await browser.newPage({viewport:{width,height:900}});
   await page.route('**/*',async route=>{
    const url=new URL(route.request().url());if(url.origin!==origin||route.request().method()!=='GET')return route.abort();
    if(url.pathname==='/'){
     const cards=Object.keys(colors.palettes).flatMap(key=>[0,1].map((n)=>discovery.renderDeparture({id:'demo-'+key,title:'**Culture** and *adventure*',batchColor:key},{startKey:'2099-10-23',shortLabel:n?'Oct 30–Nov 1':'Oct 23–25',fullLabel:'Oct 23–25, 2099',originalLabel:'Oct 23-25, 2099'}))).join('');
     const styles=['style','responsive','homepage-settings','trip-discovery','customer-experience','design-refresh','brand-colors','trip-presentation'].map(name=>'<link rel="stylesheet" href="/css/'+name+'.css">').join('');
     return route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+styles+'<main style="padding:16px"><p id="formatted">'+text.html('Meet **local hosts**, *explore* and ***enjoy***. <img src=x onerror=evil()>')+'</p><div id="upcoming-batches-grid">'+cards+'</div></main>'});
    }
    const file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep))return route.abort();
    try{return route.fulfill({contentType:'text/css',body:fs.readFileSync(file)});}catch{return route.fulfill({status:404,body:''});}
   });
   await page.goto(origin);assert.equal(await page.locator('#formatted img').count(),0);assert.equal(await page.locator('#formatted strong em').innerText(),'enjoy');
   const cards=page.locator('.departure-bar');assert.equal(await cards.count(),12);
   for(let i=0;i<12;i++){
    const card=cards.nth(i);await assertReadable(card.locator('.departure-date'));await assertReadable(card.locator('.departure-arrow'));
    if(i%2===1)assert.equal(await card.evaluate(n=>getComputedStyle(n).backgroundColor),await cards.nth(i-1).evaluate(n=>getComputedStyle(n).backgroundColor));
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   const output=path.join(root,'build/presentation-review');fs.mkdirSync(output,{recursive:true});await page.screenshot({path:path.join(output,'batch-colours-'+width+'.png'),fullPage:true});
   await page.close();console.log('PASS: safe emphasis, six readable batch palettes, consistent departures and no overflow at '+width+'px');
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
