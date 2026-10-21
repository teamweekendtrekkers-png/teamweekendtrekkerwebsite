const {test}=require('node:test'),assert=require('node:assert/strict');
const pages=require('../js/website-pages');
test('page editing keeps missing fields, preserves intentional blanks and treats content as text',()=>{
 const title={textContent:'Before',hidden:false};
 const doc={querySelector(selector){return selector.includes('.about-intro h2')?title:null;}};
 pages.apply({pages:{aboutIntroHeading:'<img src=x onerror=alert(1)>'}},doc);
 assert.equal(title.textContent,'<img src=x onerror=alert(1)>');assert.equal(title.hidden,false);
 pages.apply({pages:{aboutIntroHeading:''}},doc);assert.equal(title.hidden,true);
 assert.equal(pages.normalize({aboutTitle:'Custom'}).aboutSubtitle,pages.defaults.aboutSubtitle);
 assert.equal(pages.normalize({aboutTitle:'a'.repeat(4001)}).aboutTitle,pages.defaults.aboutTitle);
});
