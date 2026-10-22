const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const footer = require('../js/footer-settings');
const settings = require('../js/homepage-settings');

test('legacy config gains editable footer defaults without mutating existing data', () => {
    const raw = require('./fixtures/homepage-defaults.json'), before = JSON.stringify(raw);
    assert.deepEqual(settings.normalize(raw).footer, footer.defaults);
    assert.equal(JSON.stringify(raw), before);
    const custom = structuredClone(raw); custom.footer = {...footer.defaults, showUpi: false, brandName:'Our travel community'};
    assert.equal(settings.normalize(custom).footer.showUpi, false);
    assert.deepEqual(settings.normalize(custom).hero, settings.normalize(raw).hero);
    assert.deepEqual(settings.normalize(custom).upcomingBatches, settings.normalize(raw).upcomingBatches);
});
test('information links accept safe existing pages or HTTPS and reject executable/traversal URLs', () => {
    for (const url of ['about.html','contact.html#faq','index.html','trips.html','https://example.com/privacy','https://docs.google.com/document/d/example']) assert(footer.safeLink(url), url);
    for (const url of ['javascript:alert(1)','data:text/html,x','http://example.com/x','//evil.example/x','../secret','missing.html','contact.html?redirect=evil','https://user:pass@example.com/x','https://example.com:8443/x','https://example.com:443/x','https://example.com/\\x','https://example.com/\nx']) assert(!footer.safeLink(url), url);
    assert(footer.safeInstagram('https://instagram.com/teamweekendtrekkers'));
    for (const url of ['https://evil.example/x','https://instagram.com.evil.example/x','https://instagram.com/']) assert(!footer.safeInstagram(url));
});
test('footer normalization preserves order, explicit empty lists, hidden links and literal copy', () => {
    const raw = {...structuredClone(footer.defaults), description:'<script>literal text</script>', showSocialLinks:false, showUpi:false, informationLinks:[
        {id:'refund',label:'Refund information',url:'https://example.com/refunds',visible:false},
        {id:'about',label:'Our story',url:'about.html',visible:true},
    ]};
    const before = JSON.stringify(raw), actual = footer.normalize(raw);
    assert.deepEqual(actual, raw); assert.equal(JSON.stringify(raw), before);
    raw.informationLinks = []; assert.deepEqual(footer.normalize(raw).informationLinks, []);
});
test('invalid footer input cannot inject links or discard required navigation labels', () => {
    const result = footer.normalize({homeLabel:'',whatsAppNumber:'<script>',instagramUrl:'javascript:alert(1)',email:'invalid',informationLinks:[
        {id:'one',label:'First',url:'contact.html'}, {id:'one',label:'Duplicate',url:'about.html'}, {id:'bad',label:'Bad',url:'javascript:alert(1)'}, null,
    ]});
    assert.equal(result.homeLabel, 'Home'); assert.equal(result.whatsAppNumber, ''); assert.equal(result.instagramUrl, ''); assert.equal(result.email, '');
    assert.deepEqual(result.informationLinks.map(item => item.id), ['one']);
});
test('footer loading uses legacy defaults only for valid configs and hides payment details on failure', async () => {
    for (const fetcher of [async()=>{throw Error('offline');}, async()=>({ok:false}), async()=>({ok:true,json:async()=>{throw Error('bad JSON');}}), async()=>({ok:true,json:async()=>({version:2})}), async()=>({ok:true,json:async()=>({version:1,footer:{showUpi:'false'}})})]) {
        assert.equal((await footer.load(fetcher)).showUpi, false);
    }
    assert.equal((await footer.load(async(url, options)=>{assert.equal(url,'https://site.test/js/homepage-config.json');assert.equal(options.cache,'no-cache');return {ok:true,json:async()=>({version:1})};},'https://site.test/js/homepage-config.json')).showUpi, true);
});
test('all public footers load the shared editor safely; UPI columns start hidden without JavaScript', () => {
    for (const page of ['index','trips','trip-detail','about','contact','checkout']) {
        const html = fs.readFileSync(path.resolve(__dirname, '../' + page + '.html'),'utf8');
        assert(html.includes('js/footer-settings.js')); assert(html.includes('css/footer-settings.css'));
        if (page !== 'checkout') {
            assert.match(html, /data-footer-upi hidden/);
            for (const section of ['brand','navigation','contact']) assert(html.includes('data-footer-' + section));
        }
    }
    const index = fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
    assert(index.indexOf('js/footer-settings.js') < index.indexOf('js/homepage-settings.js'));
});
const appPath = path.resolve(__dirname,'../../trip_manager_app/lib/models/footer_config.dart');
test('website and Flutter footer defaults stay exactly in parity', {skip:!fs.existsSync(appPath)}, () => {
    assert.deepEqual(JSON.parse(fs.readFileSync(appPath,'utf8').replace(/\r\n/g, '\n').match(/r'''\n([\s\S]*?)\n'''/)[1]), footer.defaults);
});

test('Indian footer numbers are readable while destinations retain canonical digits', () => {
 assert.equal(footer.formatPhone('917019235581'), '+91 70192 35581');
 assert.equal(footer.formatPhone('14155552671'), '+14155552671');
 for (const invalid of ['+91 7019235581', '91', '', 'undefined', '917019235581?x', null]) assert.equal(footer.formatPhone(invalid), '');
});
