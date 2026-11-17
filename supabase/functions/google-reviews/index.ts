import { createReviewFeed } from './core.mjs';
const feed = createReviewFeed({env:(key:string) => Deno.env.get(key) || ''});
Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin') || '';
  const allowed = !origin || ['https://www.teamweekendtrekkers.com','https://teamweekendtrekkers.com'].includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
  const headers = {'Content-Type':'application/json','Access-Control-Allow-Origin':origin || 'https://www.teamweekendtrekkers.com','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'GET, OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
  if (!allowed) return new Response(JSON.stringify({error:'Origin not allowed'}),{status:403});
  if (request.method === 'OPTIONS') return new Response(null,{status:204,headers});
  if (request.method !== 'GET') return new Response(JSON.stringify({error:'Method not allowed'}),{status:405,headers});
  return new Response(JSON.stringify(await feed()),{headers});
});
