// Secrets and Google responses remain server-side; cache lives only in this isolate.
export function createReviewFeed({env, fetcher = fetch, now = Date.now}) {
  let cached, pending, token, tokenExpires = 0;
  const required = ['GOOGLE_REVIEW_CLIENT_ID', 'GOOGLE_REVIEW_CLIENT_SECRET', 'GOOGLE_REVIEW_REFRESH_TOKEN', 'GOOGLE_REVIEW_LOCATION'];
  const configured = () => required.every(key => env(key)) && /^accounts\/\d+\/locations\/\d+$/.test(env('GOOGLE_REVIEW_LOCATION'));
  async function json(url, options = {}) {
    const response = await fetcher(url, {...options, signal: AbortSignal.timeout(12000)});
    if (!response.ok) throw new Error('Google reviews unavailable');
    return response.json();
  }
  async function accessToken() {
    if (token && tokenExpires > now() + 60000) return token;
    const result = await json('https://oauth2.googleapis.com/token', {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:new URLSearchParams({grant_type:'refresh_token',client_id:env(required[0]),client_secret:env(required[1]),refresh_token:env(required[2])})});
    if (typeof result.access_token !== 'string' || !Number.isFinite(result.expires_in)) throw new Error('Google connection unavailable');
    token = result.access_token; tokenExpires = now() + Math.min(result.expires_in, 3600) * 1000; return token;
  }
  async function load() {
    const authorization = 'Bearer ' + await accessToken(), reviews = [], seen = new Set();
    let pageToken = '', averageRating, totalReviewCount;
    for (let page = 0; page < 20; page++) {
      const url = new URL('https://mybusiness.googleapis.com/v4/' + env(required[3]) + '/reviews');
      url.searchParams.set('pageSize','50'); url.searchParams.set('orderBy','updateTime desc');
      if (pageToken) url.searchParams.set('pageToken',pageToken);
      const result = await json(url, {headers:{Authorization:authorization}});
      if (page === 0) { averageRating = result.averageRating; totalReviewCount = result.totalReviewCount; }
      for (const review of result.reviews || []) {
        if (review.starRating !== 'FIVE' || !review.comment?.trim() || !review.reviewer?.displayName || !review.reviewId || seen.has(review.reviewId)) continue;
        const updatedAt = review.updateTime || review.createTime;
        if (!Number.isFinite(Date.parse(updatedAt))) continue;
        seen.add(review.reviewId);
        let photo = review.reviewer.profilePhotoUrl || '';
        try { const u = new URL(photo); if (u.protocol !== 'https:' || !u.hostname.endsWith('.googleusercontent.com')) photo = ''; } catch { photo = ''; }
        reviews.push({id:review.reviewId, name:review.reviewer.displayName, text:review.comment, rating:5, publishedAt:review.createTime, updatedAt, photo});
      }
      pageToken = result.nextPageToken || '';
      if (!pageToken || reviews.length >= 30) break;
    }
    if (!Number.isFinite(averageRating) || averageRating < 1 || averageRating > 5) throw new Error('Invalid Google rating');
    reviews.sort((a,b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    return {connected:true, fetchedAt:new Date(now()).toISOString(), averageRating, totalReviewCount, reviews:reviews.slice(0,30)};
  }
  return async function feed() {
    if (!configured()) return {connected:false, reason:'connection_required', reviews:[]};
    if (cached && now() - Date.parse(cached.fetchedAt) < 15 * 60000) return cached;
    if (!pending) pending = load().then(value => { cached = value; return value; }).finally(() => { pending = null; });
    try { return await pending; } catch { token = null; return {connected:false, reason:'temporarily_unavailable', reviews:[]}; }
  };
}
