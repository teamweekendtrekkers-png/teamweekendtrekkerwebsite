create table public.checkout_leads (
 idempotency_key uuid primary key,
 request_hash text not null,
 payload jsonb not null,
 telegram_status text not null default 'pending' check (telegram_status in ('pending','sending','sent','failed','unknown')),
 attempts integer not null default 0,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.checkout_leads enable row level security;
revoke all on public.checkout_leads from public, anon, authenticated;
grant select,insert,update on public.checkout_leads to service_role;

create function public.twt_claim_checkout_lead(p_lead jsonb,p_request_hash text,p_ip_hash text,p_identity_hash text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare saved public.checkout_leads; v_key text; n integer; maximum integer; should_send boolean := false;
 bucket_start timestamptz := date_bin(interval '10 minutes',now(),timestamptz '2026-01-01 00:00:00+00');
begin
 perform pg_advisory_xact_lock(hashtextextended(p_lead->>'idempotency_key',0));
 select * into saved from public.checkout_leads where idempotency_key=(p_lead->>'idempotency_key')::uuid;
 if found then
  if saved.request_hash is distinct from p_request_hash then raise exception 'request_conflict'; end if;
 else
  foreach v_key in array array['checkout-ip:'||p_ip_hash,'checkout-identity:'||p_identity_hash] loop
   maximum := case when v_key like 'checkout-ip:%' then 20 else 5 end;
   insert into public.twt_booking_rate_limits as limits(rate_key,bucket,requests) values(v_key,bucket_start,1)
    on conflict (rate_key) do update set bucket=excluded.bucket,
    requests=case when limits.bucket=excluded.bucket then limits.requests+1 else 1 end returning requests into n;
   if n>maximum then raise exception 'rate_limited'; end if;
  end loop;
  insert into public.checkout_leads(idempotency_key,request_hash,payload)
   values((p_lead->>'idempotency_key')::uuid,p_request_hash,p_lead) returning * into saved;
 end if;
 if saved.telegram_status in ('pending','failed') and saved.attempts<3 then
  update public.checkout_leads set telegram_status='sending',attempts=attempts+1,updated_at=now()
   where idempotency_key=saved.idempotency_key returning * into saved;
  should_send := true;
 end if;
 return jsonb_build_object('lead',to_jsonb(saved),'send',should_send);
end;
$$;
revoke all on function public.twt_claim_checkout_lead(jsonb,text,text,text) from public,anon,authenticated;
grant execute on function public.twt_claim_checkout_lead(jsonb,text,text,text) to service_role;

