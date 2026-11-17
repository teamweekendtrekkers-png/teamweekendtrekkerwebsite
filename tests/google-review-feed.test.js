const test=require('node:test'),assert=require('node:assert/strict');
const feed=require('../js/google-review-feed');
const time=Date.parse('2026-11-17T00:00:00Z');
const item=(id,rating=5)=>({id:String(id),name:'Traveller '+id,text:'Unchanged review '+id,rating,updatedAt:new Date(time-id*86400000).toISOString(),photo:''});
test('automatic reviews keep five stars and latest order, rejecting duplicates and stale feeds',()=>{
 const data={connected:true,fetchedAt:new Date(time).toISOString(),averageRating:4.9,reviews:[item(6),item(1),item(3,4),item(2),item(1),item(4),item(5),item(7)]};
 assert.deepEqual(feed.select(data,time).map(r=>r.name),['Traveller 1','Traveller 2','Traveller 4','Traveller 5','Traveller 6']);
 assert.throws(()=>feed.select({...data,fetchedAt:'2020-01-01'},time));
 assert.throws(()=>feed.select({...data,connected:false},time));
});
test('manual mode and hidden sections never request Google or mutate chosen reviews',async()=>{
 let calls=0;const section={dataset:{},querySelector:()=>null};const document={defaultView:{},querySelector:()=>section};
 const config={sections:{reviews:{source:'manual',enabled:true,items:[item(1)]}}};const before=JSON.stringify(config);
 await feed.refresh(config,document,async()=>{calls++;});assert.equal(calls,0);assert.equal(JSON.stringify(config),before);
 config.sections.reviews.source='google';config.sections.reviews.enabled=false;await feed.refresh(config,document,async()=>{calls++;});assert.equal(calls,0);
});
test('backend filters five stars and caches concurrently without leaking tokens',async()=>{
 const {createReviewFeed}=await import('../supabase/functions/google-reviews/core.mjs');
 const vars={GOOGLE_REVIEW_CLIENT_ID:'id',GOOGLE_REVIEW_CLIENT_SECRET:'test-secret',GOOGLE_REVIEW_REFRESH_TOKEN:'test-refresh',GOOGLE_REVIEW_LOCATION:'accounts/123/locations/456'};let calls=0;
 const fetcher=async(url,options)=>{calls++;if(String(url).includes('oauth2'))return {ok:true,json:async()=>({access_token:'test-token',expires_in:3600})};assert.equal(options.headers.Authorization,'Bearer test-token');return {ok:true,json:async()=>({averageRating:4.9,totalReviewCount:100,reviews:[{reviewId:'a',reviewer:{displayName:'Name'},comment:'Exact text',starRating:'FIVE',updateTime:'2026-11-16T00:00:00Z'},{reviewId:'b',reviewer:{displayName:'Other'},comment:'Four',starRating:'FOUR',updateTime:'2026-11-17T00:00:00Z'}]})};};
 const load=createReviewFeed({env:key=>vars[key],fetcher,now:()=>time});const [a,b]=await Promise.all([load(),load()]);assert.equal(a,b);assert.equal(calls,2);assert.equal(a.reviews.length,1);assert.equal(a.averageRating,4.9);assert(!JSON.stringify(a).includes('test-token'));await load();assert.equal(calls,2);
});
test('backend fails closed without Google credentials and never exposes upstream errors',async()=>{
 const {createReviewFeed}=await import('../supabase/functions/google-reviews/core.mjs');
 assert.equal((await createReviewFeed({env:()=>''})()).reason,'connection_required');
 const load=createReviewFeed({env:key=>key==='GOOGLE_REVIEW_LOCATION'?'accounts/1/locations/2':'secret',fetcher:async()=>{throw Error('secret response');}});
 assert.deepEqual(await load(),{connected:false,reason:'temporarily_unavailable',reviews:[]});
});
