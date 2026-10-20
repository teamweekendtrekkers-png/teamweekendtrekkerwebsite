(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DepartureColors=api;}(typeof globalThis!=='undefined'?globalThis:this,function(){
 const palettes=Object.freeze({
  forest:{label:'Forest',background:'#eff7f2',border:'#8caf9b',accent:'#174b32'},
  teal:{label:'Teal',background:'#edf8f7',border:'#86bcb3',accent:'#08685f'},
  blue:{label:'Blue',background:'#eff5fc',border:'#91b0d7',accent:'#245993'},
  violet:{label:'Violet',background:'#f5f0fb',border:'#b9a0d8',accent:'#64418c'},
  amber:{label:'Amber',background:'#fff7e8',border:'#d6b36a',accent:'#805000'},
  rose:{label:'Rose',background:'#fdf0f2',border:'#d7a0ac',accent:'#963e56'}
 });
 const key=(value,id='')=>{if(Object.prototype.hasOwnProperty.call(palettes,value))return value;if(value!==undefined||!id)return 'forest';let hash=0;for(let i=0;i<id.length;i++)hash=(hash*31+id.charCodeAt(i))&0x7fffffff;return Object.keys(palettes)[hash%Object.keys(palettes).length];};
 return {palettes,key};
}));
