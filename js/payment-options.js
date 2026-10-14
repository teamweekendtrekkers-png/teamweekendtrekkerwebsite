(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.PaymentOptions=api;
}(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const modes=['confirmation','direct','both'];
  function imagePath(value){
    return typeof value==='string' && /^images\/[a-zA-Z0-9_./-]+\.(png|jpe?g|webp)$/i.test(value)
      && !value.split('/').includes('..') && !value.includes('//') ? value : '';
  }
  function normalize(value){
    const p=value&&typeof value==='object'?value:{};
    return {...p,mode:modes.includes(p.mode)?p.mode:'confirmation',
      directDepartures:Array.isArray(p.directDepartures)?p.directDepartures.filter(d=>d&&typeof d.tripId==='string'&&typeof d.dateKey==='string'):[],
      showQr:p.showQr===true,qrImage:imagePath(p.qrImage),
      instructions:typeof p.instructions==='string'?p.instructions.trim().slice(0,500):''};
  }
  function allowed(payment,tripId,dateKey){
    const p=normalize(payment);
    const approved=p.directDepartures.some(d=>d.tripId===tripId&&d.dateKey===dateKey);
    if(!approved || p.mode==='confirmation')return ['confirmation'];
    return p.mode==='both'?['confirmation','direct']:['direct'];
  }
  function amounts(total,type){
    const pennies=Math.round(Number(total)*100);
    if(!Number.isSafeInteger(pennies)||pennies<0)throw Error('Invalid payment amount');
    const due=type==='full'?pennies:Math.ceil(pennies/2);
    return {due:due/100,balance:(pennies-due)/100,total:pennies/100};
  }
  function reportText(report,notes=''){
    if(!report)return notes;
    return '[TWT_PAYMENT:'+JSON.stringify(report)+']\n'+notes;
  }
  return {normalize,imagePath,allowed,amounts,reportText};
}));
