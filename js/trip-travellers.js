(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TripTravellers=api;}(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function limit(trip){const value=trip?.maxTravellers;return Number.isInteger(value)&&value>=1&&value<=50?value:50;}
 function valid(trip,value){return Number.isInteger(value)&&value>=1&&value<=limit(trip);}
 function populate(select,trip){if(!select)return;const previous=Number(select.value)||1;select.replaceChildren();for(let n=1;n<=limit(trip);n++){const option=select.ownerDocument.createElement('option');option.value=String(n);option.textContent=n===1?'1 Person':n+' People';select.append(option);}select.value=String(Math.min(previous,limit(trip)));}
 return {limit,valid,populate};
}));
