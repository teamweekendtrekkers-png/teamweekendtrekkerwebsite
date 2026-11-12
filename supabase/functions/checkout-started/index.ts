import {acceptLead, leadTelegramText} from './core.mjs';
import {BookingError} from '../booking-request/core.mjs';
const env = (key: string) => Deno.env.get(key) || '';
const key = JSON.parse(env('SUPABASE_SECRET_KEYS') || '{}').default || env('SUPABASE_SERVICE_ROLE_KEY');
const base = env('SUPABASE_URL');
const token = env('TELEGRAM_BOT_TOKEN'), chat = env('TELEGRAM_CHAT_ID');
const origins = new Set(['https://www.teamweekendtrekkers.com','https://teamweekendtrekkers.com']);
async function hash(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
async function database(path: string, body: unknown, method='POST') {
  const response = await fetch(base+'/rest/v1/'+path,{
    method, headers:{apikey:key,'Content-Type':'application/json',...(key.startsWith('eyJ')?{Authorization:'Bearer '+key}:{})},
    body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
  if(!response.ok) {
    const error=await response.json().catch(()=>({}));
    if(error.message==='rate_limited')throw new BookingError('rate_limited',429);
    if(error.message==='request_conflict')throw new BookingError('request_conflict',409);
    throw new BookingError('service_unavailable',503);
  }
  return response.status===204?null:response.json();
}
Deno.serve(async(request: Request)=>{
  const origin=request.headers.get('origin')||'';
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',
    'Access-Control-Allow-Origin':origins.has(origin)?origin:'https://www.teamweekendtrekkers.com',
    'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info',
    'Access-Control-Allow-Methods':'POST,OPTIONS,GET'};
  const reply=(body: unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(!origins.has(origin))return reply({error:'origin_not_allowed'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  const ready=!!(key&&base&&token&&/^-\d+$/.test(chat));
  if(request.method==='GET')return reply({ready},ready?200:503);
  if(request.method!=='POST')return reply({error:'method_not_allowed'},405);
  if(!ready)return reply({error:'service_unavailable'},503);
  try {
    const raw=await request.text();
    if(new TextEncoder().encode(raw).length>16000)return reply({error:'invalid_request'},413);
    let body;try{body=JSON.parse(raw);}catch{return reply({error:'invalid_request'},400);}
    const ip=(request.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim().slice(0,80);
    return reply(await acceptLead(body,{
      now:()=>new Date(),hash,
      catalog:async()=>{
        const response=await fetch('https://www.teamweekendtrekkers.com/js/booking-catalog.json',{cache:'no-store',signal:AbortSignal.timeout(8000)});
        if(!response.ok)throw new BookingError('service_unavailable',503);
        const catalog=await response.json();if(catalog.version!==1)throw new BookingError('service_unavailable',503);return catalog;
      },
      claim:async(lead: any,requestHash: string)=>database('rpc/twt_claim_checkout_lead',{
        p_lead:lead,p_request_hash:requestHash,p_ip_hash:await hash(key+'|'+ip),
        p_identity_hash:await hash(key+'|'+lead.email+'|'+lead.phone.replace(/\D/g,''))}),
      send:async(lead: any)=>{
        const response=await fetch('https://api.telegram.org/bot'+token+'/sendMessage',{
          method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(8000),
          body:JSON.stringify({chat_id:chat,text:leadTelegramText(lead)})});
        const data=await response.json();
        return response.ok&&data.ok===true;
      },
      finish:async(id: string,attempts: number,status: string)=>database(
        'checkout_leads?idempotency_key=eq.'+id+'&attempts=eq.'+attempts+'&telegram_status=eq.sending',
        {telegram_status:status,updated_at:new Date().toISOString()},'PATCH')
    }));
  }catch(error){
    return reply({error:error instanceof BookingError?error.code:'service_unavailable'},error instanceof BookingError?error.status:503);
  }
});
