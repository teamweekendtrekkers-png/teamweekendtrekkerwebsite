-- Return a server-filtered booking queue using the existing booking-admin claim.
begin;
set local lock_timeout = '2s';
create or replace function public.twt_booking_queue(p_search text default '', p_offset integer default 0, p_filter text default 'all', p_trip text default '', p_departure text default '')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null or coalesce(auth.jwt()->'app_metadata'->>'trip_manager_admin','') <> 'true' then
    raise insufficient_privilege using message='Booking administrator access required';
  end if;
  if p_search is null or length(p_search)>150 or p_offset is null or p_offset<0 or p_offset>100000
     or p_filter is null or p_filter not in ('all','pending','verified','rejected','requests')
     or p_trip is null or p_trip<>'' and p_trip !~ '^[a-z0-9][a-z0-9_-]{0,99}$'
     or p_departure is null or p_departure<>'' and p_departure !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'invalid_request';
  end if;
  with filtered as materialized (
    select b.id,b.booking_reference,b.trip_name,b.departure_label,b.full_name,b.email,b.phone,
      b.travellers,b.traveller_details,b.total_amount,b.special_requests,b.created_at,
      b.payment_review_status,b.payment_review_note,b.payment_reviewed_at
    from public.bookings b
    where (p_search='' or strpos(lower(concat_ws(' ',b.booking_reference,b.full_name,b.phone,b.special_requests)),lower(p_search))>0)
      and (p_trip='' or b.trip_id=p_trip)
      and (p_departure='' or b.departure_date=nullif(p_departure,'')::date)
      and (p_filter='all'
        or p_filter='requests' and left(coalesce(b.special_requests,''),13)<>'[TWT_PAYMENT:'
        or p_filter in ('pending','verified','rejected')
           and left(coalesce(b.special_requests,''),13)='[TWT_PAYMENT:' and b.payment_review_status=p_filter)
  ), page as (
    select * from filtered order by
      case when p_filter='pending' then created_at end asc,
      case when p_filter<>'pending' then created_at end desc,
      id desc
    limit 50 offset p_offset
  )
  select jsonb_build_object('total',(select count(*) from filtered),
    'rows',coalesce((select jsonb_agg(to_jsonb(page) order by
      case when p_filter='pending' then created_at end asc,
      case when p_filter<>'pending' then created_at end desc,id desc) from page),'[]'::jsonb))
  into result;
  return result;
end; $$;
revoke all on function public.twt_booking_queue(text,integer,text,text,text) from public,anon,authenticated;
grant execute on function public.twt_booking_queue(text,integer,text,text,text) to authenticated;

alter table public.bookings add column if not exists confirmed_at timestamptz;
create or replace function public.twt_set_booking_confirmation_time()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.booking_status='confirmed' then
    if tg_op='INSERT' then
      new.confirmed_at := coalesce(new.confirmed_at,clock_timestamp());
    elsif old.booking_status is distinct from new.booking_status then
      new.confirmed_at := coalesce(old.confirmed_at,clock_timestamp());
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists twt_booking_confirmation_time on public.bookings;
create trigger twt_booking_confirmation_time
before insert or update of booking_status on public.bookings
for each row execute function public.twt_set_booking_confirmation_time();
create or replace function public.twt_track_journey(p_session uuid,p_source text,p_device text,p_events jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare item jsonb; v_count integer; v_key text; v_headers jsonb; v_salt uuid;
 v_bucket timestamptz := date_trunc('minute',now());
begin
 if p_session is null or p_source is null or p_source not in ('direct','google','instagram','whatsapp','facebook','referral','campaign') or p_device is null or p_device not in ('mobile','tablet','desktop')
 or p_events is null or jsonb_typeof(p_events)<>'array' or jsonb_array_length(p_events)<1 or jsonb_array_length(p_events)>20 or octet_length(p_events::text)>12000 then raise exception 'invalid_analytics'; end if;
 -- Headers come from the gateway. Hash a daily rotating, salted network bucket;
 -- never save IPs, user agents, request headers, full URLs, or contact fields.
 v_headers:=coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb;
 select salt into v_salt from public.twt_journey_settings where id;
 v_key:=encode(sha256(convert_to(v_salt::text||current_date::text||coalesce(v_headers->>'x-forwarded-for','unknown'),'UTF8')),'hex');
 insert into public.twt_journey_limits as l(key,bucket,n) values(v_key,v_bucket,1)
 on conflict(key) do update set bucket=excluded.bucket,n=case when l.bucket=excluded.bucket then l.n+1 else 1 end returning n into v_count;
 if v_count>120 then return; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_session::text,27));
 select count(*) into v_count from public.twt_journey_events where session_id=p_session;
 if v_count>=200 then return; end if;
 if exists(select 1 from public.twt_journey_events where session_id=p_session and occurred_at<now()-interval '24 hours') then return; end if;
 for item in select value from jsonb_array_elements(p_events) loop
  if jsonb_typeof(item)<>'object' or (item->>'id') is null or (item->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  or (item->>'name') is null or (item->>'name') not in ('site_visit','trip_view','date_selected','checkout_open','payment_shown','payment_submitted','booking_requested','upi_copied','qr_downloaded','checkout_error','search_no_results','trip_no_departure','departure_searched','departure_selected','departure_checkout')
  or (item->>'trip') is not null and (item->>'trip') !~ '^[a-z0-9][a-z0-9_-]{0,99}$'
  or (item->>'error') is not null and (item->>'error') not in ('date_unavailable','payment_unavailable','checkout_unavailable','booking_submit_failed','qr_failed','pickup_missing','invalid_traveller_details')
  or ((item->>'name' in ('departure_searched','departure_selected','departure_checkout')) is distinct from (item->>'day' is not null))
  or (item->>'day') is not null and (item->>'day') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  or exists(select 1 from jsonb_object_keys(item) k where k not in ('id','name','trip','error','day')) then raise exception 'invalid_analytics'; end if;
  if v_count>=200 then exit; end if;
  insert into public.twt_journey_events(id,session_id,event_name,trip_id,source,device,error_code,departure_day)
  values((item->>'id')::uuid,p_session,item->>'name',item->>'trip',p_source,p_device,case when item->>'name'='checkout_error' then item->>'error' else null end,(item->>'day')::date)
  on conflict(id) do nothing;
  v_count:=v_count+1;
 end loop;
 delete from public.twt_journey_limits where bucket<now()-interval '1 day';
end; $$;
revoke all on function public.twt_track_journey(uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.twt_track_journey(uuid,text,text,jsonb) to anon;

CREATE OR REPLACE FUNCTION public.twt_journey_report(p_start date, p_end date, p_trip text DEFAULT ''::text, p_device text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb; lower_at timestamptz; upper_at timestamptz; previous_start date; previous_end date;
begin
 if auth.uid() is null or coalesce(auth.jwt()->'app_metadata'->>'trip_manager_admin','')<>'true' then raise insufficient_privilege using message='Booking administrator access required'; end if;
 if p_start is null or p_end is null or p_start>p_end or p_end-p_start>89 or p_start<(now() at time zone 'Asia/Kolkata')::date-90 or p_end>(now() at time zone 'Asia/Kolkata')::date
 or p_trip is null or p_trip<>'' and p_trip !~ '^[a-z0-9][a-z0-9_-]{0,99}$' or p_device is null or p_device not in ('','mobile','tablet','desktop') then raise exception 'invalid_range'; end if;
 lower_at:=p_start::timestamp at time zone 'Asia/Kolkata';upper_at:=(p_end+1)::timestamp at time zone 'Asia/Kolkata';
 previous_start:=p_start - (((p_end-p_start+7)/7)*7);
 previous_end:=previous_start+(p_end-p_start);
 with e as materialized (
 select * from public.twt_journey_events where occurred_at>=lower_at and occurred_at<upper_at and (p_device='' or device=p_device)
 ), filtered as materialized (select * from e where p_trip='' or trip_id=p_trip),
 starts as (select session_id,trip_id,min(occurred_at) as viewed from filtered where event_name='trip_view' and trip_id is not null group by session_id,trip_id),
 journeys as materialized (
 select s.*,d.reached_at as dated,c.reached_at as checkout,p.reached_at as payment,r.reached_at as submitted from starts s
 left join lateral(select min(occurred_at) as reached_at from public.twt_journey_events where occurred_at>=lower_at and occurred_at<upper_at and (p_device='' or device=p_device) and session_id=s.session_id and trip_id=s.trip_id and event_name='date_selected' and occurred_at>=s.viewed)d on true
 left join lateral(select min(occurred_at) as reached_at from public.twt_journey_events where occurred_at>=lower_at and occurred_at<upper_at and (p_device='' or device=p_device) and session_id=s.session_id and trip_id=s.trip_id and event_name='checkout_open' and occurred_at>=d.reached_at)c on true
 left join lateral(select min(occurred_at) as reached_at from public.twt_journey_events where occurred_at>=lower_at and occurred_at<upper_at and (p_device='' or device=p_device) and session_id=s.session_id and trip_id=s.trip_id and event_name='payment_shown' and occurred_at>=c.reached_at)p on true
 left join lateral(select min(occurred_at) as reached_at from public.twt_journey_events where occurred_at>=lower_at and occurred_at<upper_at and (p_device='' or device=p_device) and session_id=s.session_id and trip_id=s.trip_id and event_name='payment_submitted' and occurred_at>=p.reached_at)r on true
 ), b as (select * from public.bookings where created_at>=lower_at and created_at<upper_at and (p_trip='' or trip_id=p_trip) and left(coalesce(special_requests,''),13)='[TWT_PAYMENT:')
 select jsonb_build_object(
 'timezone','Asia/Kolkata','launched_at',(select launched_at from public.twt_journey_settings where id),
 'sessions',(select count(distinct session_id) from e where event_name='site_visit' and (p_trip='' or session_id in(select session_id from filtered))),
 'funnel',jsonb_build_array(
 jsonb_build_object('key','trip_view','label','Viewed a trip','count',(select count(*) from journeys)),
 jsonb_build_object('key','date_selected','label','Selected a date','count',(select count(dated) from journeys)),
 jsonb_build_object('key','checkout_open','label','Opened checkout','count',(select count(checkout) from journeys)),
 jsonb_build_object('key','payment_shown','label','Reached UPI payment','count',(select count(payment) from journeys)),
 jsonb_build_object('key','payment_submitted','label','Submitted payment details','count',(select count(submitted) from journeys))),
 'direct_checkout',(select count(*) from (select distinct session_id,trip_id from filtered where event_name='checkout_open' except select session_id,trip_id from journeys where checkout is not null)q),
 'requests',(select count(distinct session_id) from filtered where event_name='booking_requested'),
 'trips',coalesce((select jsonb_agg(to_jsonb(t)) from(select trip_id,count(*) as views,count(dated) as dates,count(checkout) as checkouts,count(payment) as payment,count(submitted) as submissions from journeys group by trip_id order by count(*) desc,trip_id)t),'[]'::jsonb),
 'trip_options',coalesce((select jsonb_agg(trip_id) from(select distinct trip_id from e where trip_id is not null order by trip_id)t),'[]'::jsonb),
 'sources',coalesce((select jsonb_agg(to_jsonb(t)) from(select source,count(distinct session_id) as sessions,count(distinct session_id) filter(where event_name='payment_submitted') as submissions from filtered group by source order by count(distinct session_id) desc)t),'[]'::jsonb),
 'devices',coalesce((select jsonb_agg(to_jsonb(t)) from(select device,count(distinct session_id) as sessions,count(distinct session_id) filter(where event_name='payment_submitted') as submissions from public.twt_journey_events where occurred_at>=lower_at and occurred_at<upper_at and (p_trip='' or trip_id=p_trip) group by device)t),'[]'::jsonb),
 'daily',coalesce((select jsonb_agg(to_jsonb(t)) from(select (occurred_at at time zone 'Asia/Kolkata')::date as day,count(distinct session_id) as sessions,count(distinct session_id) filter(where event_name='payment_submitted') as submissions from filtered group by 1 order by 1)t),'[]'::jsonb),
 'hourly',coalesce((select jsonb_agg(to_jsonb(t) order by t.weekday,t.hour) from (
  select extract(isodow from occurred_at at time zone 'Asia/Kolkata')::int as weekday,
   extract(hour from occurred_at at time zone 'Asia/Kolkata')::int as hour,
   count(distinct session_id) as sessions,
   count(distinct session_id) filter(where event_name='payment_submitted') as submissions
  from filtered group by 1,2
 )t),'[]'::jsonb),
 'demand',jsonb_build_object(
  'no_results',case when p_trip='' then (select count(distinct session_id) from filtered where event_name='search_no_results') end,
  'no_departure',(select count(distinct session_id) from filtered where event_name='trip_no_departure')),
 'departure_opportunities',coalesce((select jsonb_agg(to_jsonb(t) order by t.dropped desc,t.selected desc) from (
  select trip_id,departure_day as day,device,count(*) as selected,
    count(*) filter(where opened>=picked) as checkout,
    count(*) filter(where opened is null or opened<picked) as dropped
  from (
    select session_id,trip_id,departure_day,device,
      min(occurred_at) filter(where event_name='departure_selected') as picked,
      max(occurred_at) filter(where event_name='departure_checkout') as opened
    from filtered
    where event_name in ('departure_selected','departure_checkout') and departure_day is not null and trip_id is not null
    group by session_id,trip_id,departure_day,device
  )j where picked is not null
  group by trip_id,departure_day,device order by dropped desc,selected desc,trip_id,day,device limit 10
 )t),'[]'::jsonb),
 'searched_dates',coalesce((select jsonb_agg(to_jsonb(t) order by t.day) from (
  select departure_day as day,count(distinct session_id) as sessions from filtered
  where event_name='departure_searched' group by 1 order by 2 desc,1 limit 10
 )t),'[]'::jsonb),
 'comparison',case
  when previous_start >= greatest((now() at time zone 'Asia/Kolkata')::date-89,
    (select (launched_at at time zone 'Asia/Kolkata')::date+1 from public.twt_journey_settings where id))
  then (select jsonb_build_object('start',previous_start,'end',previous_end,
    'sessions',count(distinct session_id),
    'submissions',count(distinct session_id) filter(where event_name='payment_submitted'))
   from public.twt_journey_events where occurred_at>=previous_start::timestamp at time zone 'Asia/Kolkata'
   and occurred_at<case when p_start=p_end and p_end=(now() at time zone 'Asia/Kolkata')::date
     then (previous_end + (now() at time zone 'Asia/Kolkata')::time) at time zone 'Asia/Kolkata'
     else (previous_end+1)::timestamp at time zone 'Asia/Kolkata' end
   and (p_trip='' or trip_id=p_trip) and (p_device='' or device=p_device))
 end,
 'activity',jsonb_build_object('sessions',(select count(distinct session_id) from filtered),
  'submissions',(select count(distinct session_id) from filtered where event_name='payment_submitted')),
 'errors',coalesce((select jsonb_agg(to_jsonb(t)) from(select coalesce(error_code,'checkout_unavailable') as code,count(distinct session_id) as sessions from filtered where event_name='checkout_error' group by 1 order by 2 desc)t),'[]'::jsonb),
 'engagement',jsonb_build_object('upi_copied',(select count(distinct session_id) from filtered where event_name='upi_copied'),'qr_downloaded',(select count(distinct session_id) from filtered where event_name='qr_downloaded')),
 'review',case when p_device<>'' then null else jsonb_build_object('submitted',(select count(*) from b),'pending',(select count(*) from b where payment_review_status='pending'),'overdue',(select count(*) from b where payment_review_status='pending' and created_at<now()-interval '24 hours'),
 'confirmed',(select count(*) from b where booking_status='confirmed'),
 'average_confirmation_hours',(select round(avg(extract(epoch from(confirmed_at-created_at))/3600)::numeric,1) from b where confirmed_at>=created_at),
 'verified',(select count(*) from b where payment_review_status='verified'),'rejected',(select count(*) from b where payment_review_status='rejected'),'average_review_hours',(select round(avg(extract(epoch from(payment_reviewed_at-created_at))/3600)::numeric,1) from b where payment_reviewed_at is not null)) end
 ) into result;
 return result;
end; $function$;

commit;
