alter table public.bookings add column if not exists traveller_details jsonb;

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
 participant_names,traveller_details,special_requests,travellers,price_per_person,subtotal,discount_amount,coupon_code,request_hash)
 values((p_booking->>'idempotency_key')::uuid,p_booking->>'trip_id',p_booking->>'trip_name',(p_booking->>'departure_date')::date,
 p_booking->>'departure_label',p_booking->>'full_name',p_booking->>'email',p_booking->>'phone',nullif(p_booking->>'alternate_phone',''),
 array(select jsonb_array_elements_text(p_booking->'participant_names')),p_booking->'traveller_details',nullif(p_booking->>'special_requests',''),
 (p_booking->>'travellers')::integer,(p_booking->>'price_per_person')::numeric,(p_booking->>'subtotal')::numeric,
 (p_booking->>'discount_amount')::numeric,nullif(p_booking->>'coupon_code',''),p_request_hash) returning * into saved;
 return jsonb_build_object('booking',to_jsonb(saved),'created',true);
end; $$;

create or replace function public.twt_list_bookings(p_search text default '', p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or coalesce(auth.jwt()->'app_metadata'->>'trip_manager_admin','') <> 'true' then
    raise insufficient_privilege using message='Booking administrator access required';
  end if;
  if p_search is null or length(p_search)>150 or p_offset is null or p_offset<0 or p_offset>100000 then
    raise exception 'invalid_request';
  end if;
  return coalesce((select jsonb_agg(to_jsonb(rows)) from (
    select id,booking_reference,trip_name,departure_label,full_name,email,phone,
      travellers,traveller_details,total_amount,special_requests,created_at,payment_review_status,
      payment_review_note,payment_reviewed_at
    from public.bookings b
    where p_search='' or strpos(lower(concat_ws(' ',b.booking_reference,b.full_name,b.phone,b.special_requests)),lower(p_search))>0
    order by b.created_at desc,b.id desc limit 50 offset p_offset
  ) rows),'[]'::jsonb);
end; $$;
