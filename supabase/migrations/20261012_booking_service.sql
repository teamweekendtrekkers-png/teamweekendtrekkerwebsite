-- Add private delivery leases and fingerprints without opening public table access.
alter table public.bookings add column if not exists request_hash text;
alter table public.bookings add column if not exists telegram_lease_until timestamptz;
alter table public.bookings add column if not exists email_lease_until timestamptz;
create table if not exists public.twt_booking_rate_limits (
 rate_key text primary key, bucket timestamptz not null, requests integer not null
);
alter table public.twt_booking_rate_limits enable row level security;
revoke all on public.twt_booking_rate_limits from anon, authenticated;

create or replace function public.twt_accept_booking(p_booking jsonb, p_request_hash text, p_ip_hash text, p_identity_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare saved public.bookings; rate_count integer; v_rate_key text; maximum integer;
 bucket_start timestamptz := date_bin(interval '10 minutes', now(), timestamptz '2026-01-01 00:00:00+00');
begin
 perform pg_advisory_xact_lock(hashtextextended(p_booking->>'idempotency_key', 0));
 select * into saved from public.bookings where idempotency_key=(p_booking->>'idempotency_key')::uuid;
 if found then
  if saved.request_hash is distinct from p_request_hash then raise exception 'request_conflict'; end if;
  return jsonb_build_object('booking', to_jsonb(saved), 'created', false);
 end if;
 foreach v_rate_key in array array['ip:'||p_ip_hash, 'identity:'||p_identity_hash] loop
  maximum := case when v_rate_key like 'ip:%' then 20 else 5 end;
  insert into public.twt_booking_rate_limits as limits(rate_key,bucket,requests) values(v_rate_key,bucket_start,1)
   on conflict (rate_key) do update set bucket=excluded.bucket,
   requests=case when limits.bucket=excluded.bucket then limits.requests+1 else 1 end returning requests into rate_count;
  if rate_count>maximum then raise exception 'rate_limited'; end if;
 end loop;
 delete from public.twt_booking_rate_limits where bucket<now()-interval '1 day';
 insert into public.bookings(idempotency_key,trip_id,trip_name,departure_date,departure_label,full_name,email,phone,alternate_phone,
 participant_names,special_requests,travellers,price_per_person,subtotal,discount_amount,coupon_code,request_hash)
 values((p_booking->>'idempotency_key')::uuid,p_booking->>'trip_id',p_booking->>'trip_name',(p_booking->>'departure_date')::date,
 p_booking->>'departure_label',p_booking->>'full_name',p_booking->>'email',p_booking->>'phone',nullif(p_booking->>'alternate_phone',''),
 array(select jsonb_array_elements_text(p_booking->'participant_names')),nullif(p_booking->>'special_requests',''),
 (p_booking->>'travellers')::integer,(p_booking->>'price_per_person')::numeric,(p_booking->>'subtotal')::numeric,
 (p_booking->>'discount_amount')::numeric,nullif(p_booking->>'coupon_code',''),p_request_hash) returning * into saved;
 return jsonb_build_object('booking',to_jsonb(saved),'created',true);
end; $$;

create or replace function public.twt_claim_booking_notification(p_id uuid,p_kind text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare saved public.bookings;
begin
 if p_kind='telegram' then
  update public.bookings set telegram_lease_until=now()+interval '5 minutes',telegram_attempts=telegram_attempts+1
   where id=p_id and telegram_status in ('pending','failed') and telegram_attempts<5
   and (telegram_lease_until is null or telegram_lease_until<now()) returning * into saved;
 elsif p_kind='email' then
  update public.bookings set email_lease_until=now()+interval '5 minutes',email_attempts=email_attempts+1
   where id=p_id and email_status in ('pending','failed') and email_attempts<5
   and (email_lease_until is null or email_lease_until<now()) returning * into saved;
 else raise exception 'invalid_notification_kind'; end if;
 if not found then return null; end if;
 return to_jsonb(saved);
end; $$;

create or replace function public.twt_finish_booking_notification(p_id uuid,p_kind text,p_attempt integer,p_sent boolean,p_message_id bigint default null,p_error text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if p_kind='telegram' then
  update public.bookings set telegram_status=case when p_sent then 'sent' else 'failed' end,
   telegram_message_id=case when p_sent then p_message_id else telegram_message_id end,
   telegram_sent_at=case when p_sent then now() else telegram_sent_at end,
   telegram_last_error=case when p_sent then null else left(p_error,120) end,telegram_lease_until=null
   where id=p_id and telegram_attempts=p_attempt and telegram_lease_until is not null;
 elsif p_kind='email' then
  update public.bookings set email_status=case when p_sent then 'sent' else 'failed' end,
   email_sent_at=case when p_sent then now() else email_sent_at end,
   email_last_error=case when p_sent then null else left(p_error,120) end,email_lease_until=null
   where id=p_id and email_attempts=p_attempt and email_lease_until is not null;
 else raise exception 'invalid_notification_kind'; end if;
end; $$;

revoke all on function public.twt_accept_booking(jsonb,text,text,text) from public,anon,authenticated;
revoke all on function public.twt_claim_booking_notification(uuid,text) from public,anon,authenticated;
revoke all on function public.twt_finish_booking_notification(uuid,text,integer,boolean,bigint,text) from public,anon,authenticated;
grant execute on function public.twt_accept_booking(jsonb,text,text,text) to service_role;
grant execute on function public.twt_claim_booking_notification(uuid,text) to service_role;
grant execute on function public.twt_finish_booking_notification(uuid,text,integer,boolean,bigint,text) to service_role;
