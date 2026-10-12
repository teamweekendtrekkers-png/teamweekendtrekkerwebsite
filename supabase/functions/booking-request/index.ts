import {acceptRequest, BookingError, deliverNotifications, emailPayload, telegramText} from './core.mjs';

const env = (name: string) => Deno.env.get(name) || '';
const legacyServiceKey = env('SUPABASE_SERVICE_ROLE_KEY');
const secretKeys = JSON.parse(env('SUPABASE_SECRET_KEYS') || '{}');
const serviceKey = secretKeys.default || legacyServiceKey;
const base = env('SUPABASE_URL');
const telegramToken = env('TELEGRAM_BOT_TOKEN');
const chatId = env('TELEGRAM_CHAT_ID');
const emailKey = env('WEB3FORMS_ACCESS_KEY');
const allowed = new Set(['https://www.teamweekendtrekkers.com', 'https://teamweekendtrekkers.com']);
const catalogUrl = 'https://www.teamweekendtrekkers.com/js/booking-catalog.json';
async function hash(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');
}
async function database(path: string, init: RequestInit = {}) {
  const headers: Record<string,string> = {apikey:serviceKey,'Content-Type':'application/json'};
  if (serviceKey.startsWith('eyJ')) headers.Authorization='Bearer '+serviceKey;
  const response=await fetch(base+'/rest/v1/'+path,{...init,headers,signal:AbortSignal.timeout(8000)});
  if (!response.ok) {
    const error=await response.json().catch(()=>({}));
    if (error.message==='rate_limited') throw new BookingError('rate_limited',429);
    if (error.message==='request_conflict') throw new BookingError('request_conflict',409);
    throw new BookingError('service_unavailable',503);
  }
  return response.status===204 ? null : response.json();
}
const rpc=(name: string,body: unknown)=>database('rpc/'+name,{method:'POST',body:JSON.stringify(body)});
async function send(kind: string,booking: any) {
  const telegram=kind==='telegram';
  const response=await fetch(telegram?'https://api.telegram.org/bot'+telegramToken+'/sendMessage':'https://api.web3forms.com/submit',{
    method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(8000),
    body:JSON.stringify(telegram?{chat_id:chatId,text:telegramText(booking)}:emailPayload(booking,emailKey))});
  const data=await response.json().catch(()=>({}));
  const sent=response.ok && (telegram?data.ok===true:data.success===true);
  return {sent,messageId:telegram && sent?data.result.message_id:null,temporary:response.status>=500,
    error:response.status===429?'provider_rate_limited':'provider_rejected'};
}
function dependencies(ip: string) {
  return {hash,now:()=>new Date(),
    find:async(key: string)=>(await database('bookings?select=id,booking_reference,request_hash&idempotency_key=eq.'+key+'&limit=1'))[0] || null,
    catalog:async()=>{
      const response=await fetch(catalogUrl,{cache:'no-store',signal:AbortSignal.timeout(8000)});
      if (!response.ok) throw new BookingError('service_unavailable',503);
      const catalog=await response.json();if (catalog.version!==1) throw new BookingError('service_unavailable',503);return catalog;
    },
    accept:async(booking: unknown,requestHash: string,identity: string)=>rpc('twt_accept_booking',{
      p_booking:booking,p_request_hash:requestHash,p_ip_hash:await hash(serviceKey+'|'+ip),p_identity_hash:await hash(serviceKey+'|'+identity)}),
    claim:(id: string,kind: string)=>rpc('twt_claim_booking_notification',{p_id:id,p_kind:kind}),
    finish:(booking: any,kind: string,sent: boolean,messageId: number|null,error: string|null)=>rpc('twt_finish_booking_notification',{
      p_id:booking.id,p_kind:kind,p_attempt:booking[kind+'_attempts'],p_sent:sent,p_message_id:messageId,p_error:error}),
    send,pause:(ms: number)=>new Promise(resolve=>setTimeout(resolve,ms))};
}
Deno.serve(async(request: Request)=>{
  const origin=request.headers.get('origin') || '';
  const admin=request.headers.get('authorization')==='Bearer '+legacyServiceKey && !!legacyServiceKey;
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',
    'Access-Control-Allow-Origin':allowed.has(origin)?origin:'https://www.teamweekendtrekkers.com',
    'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, GET, OPTIONS'};
  const reply=(body: unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if (!allowed.has(origin) && !admin) return reply({error:'origin_not_allowed'},403);
  if (request.method==='OPTIONS') return new Response(null,{status:204,headers});
  const ready=!!(base && serviceKey && telegramToken && /^-\d+$/.test(chatId) && emailKey);
  if (request.method==='GET') return reply({ready},ready?200:503);
  if (request.method!=='POST') return reply({error:'method_not_allowed'},405);
  if (!ready) return reply({error:'service_unavailable'},503);
  try {
    if (new URL(request.url).pathname.endsWith('/retry')) {
      if (!admin) return reply({error:'not_authorized'},403);
      const bookings=await database('bookings?select=*&or=(and(telegram_status.in.(pending,failed),telegram_attempts.lt.5),and(email_status.in.(pending,failed),email_attempts.lt.5))&order=created_at.asc&limit=5');
      for (const booking of bookings) await deliverNotifications(booking,dependencies('admin'));
      return reply({processed:bookings.length});
    }
    if (Number(request.headers.get('content-length') || '0')>16000) return reply({error:'invalid_request'},413);
    const raw=await request.text();if (new TextEncoder().encode(raw).length>16000) return reply({error:'invalid_request'},413);
    let body;try {body=JSON.parse(raw);} catch {return reply({error:'invalid_request'},400);}
    const ip=(request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim().slice(0,80);
    return reply(await acceptRequest(body,dependencies(ip)));
  } catch(error) {
    return reply({error:error instanceof BookingError?error.code:'service_unavailable'},error instanceof BookingError?error.status:503);
  }
});
