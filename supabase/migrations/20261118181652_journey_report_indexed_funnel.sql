-- Replace repeated full materialized-event scans with indexed session/trip lookups.
-- Preserve the administrator guard, date limits, aggregate-only output and grants.
begin;
set local lock_timeout='2s';
create index if not exists twt_journey_funnel on public.twt_journey_events(session_id,trip_id,event_name,occurred_at);
CREATE OR REPLACE FUNCTION public.twt_journey_report(p_start date, p_end date, p_trip text DEFAULT ''::text, p_device text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb; lower_at timestamptz; upper_at timestamptz;
begin
 if auth.uid() is null or coalesce(auth.jwt()->'app_metadata'->>'trip_manager_admin','')<>'true' then raise insufficient_privilege using message='Booking administrator access required'; end if;
 if p_start is null or p_end is null or p_start>p_end or p_end-p_start>89 or p_start<(now() at time zone 'Asia/Kolkata')::date-90 or p_end>(now() at time zone 'Asia/Kolkata')::date
 or p_trip is null or p_trip<>'' and p_trip !~ '^[a-z0-9][a-z0-9_-]{0,99}$' or p_device is null or p_device not in ('','mobile','tablet','desktop') then raise exception 'invalid_range'; end if;
 lower_at:=p_start::timestamp at time zone 'Asia/Kolkata';upper_at:=(p_end+1)::timestamp at time zone 'Asia/Kolkata';
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
 'trips',coalesce((select jsonb_agg(to_jsonb(t)) from(select trip_id,count(*) as views,count(checkout) as checkouts,count(submitted) as submissions from journeys group by trip_id order by count(*) desc,trip_id)t),'[]'::jsonb),
 'trip_options',coalesce((select jsonb_agg(trip_id) from(select distinct trip_id from e where trip_id is not null order by trip_id)t),'[]'::jsonb),
 'sources',coalesce((select jsonb_agg(to_jsonb(t)) from(select source,count(distinct session_id) as sessions,count(distinct session_id) filter(where event_name='payment_submitted') as submissions from filtered group by source order by count(distinct session_id) desc)t),'[]'::jsonb),
 'devices',coalesce((select jsonb_agg(to_jsonb(t)) from(select device,count(distinct session_id) as sessions,count(distinct session_id) filter(where event_name='payment_submitted') as submissions from public.twt_journey_events where occurred_at>=lower_at and occurred_at<upper_at and (p_trip='' or trip_id=p_trip) group by device)t),'[]'::jsonb),
 'daily',coalesce((select jsonb_agg(to_jsonb(t)) from(select (occurred_at at time zone 'Asia/Kolkata')::date as day,count(distinct session_id) as sessions,count(distinct session_id) filter(where event_name='payment_submitted') as submissions from filtered group by 1 order by 1)t),'[]'::jsonb),
 'errors',coalesce((select jsonb_agg(to_jsonb(t)) from(select coalesce(error_code,'checkout_unavailable') as code,count(distinct session_id) as sessions from filtered where event_name='checkout_error' group by 1 order by 2 desc)t),'[]'::jsonb),
 'engagement',jsonb_build_object('upi_copied',(select count(distinct session_id) from filtered where event_name='upi_copied'),'qr_downloaded',(select count(distinct session_id) from filtered where event_name='qr_downloaded')),
 'review',case when p_device<>'' then null else jsonb_build_object('submitted',(select count(*) from b),'pending',(select count(*) from b where payment_review_status='pending'),'verified',(select count(*) from b where payment_review_status='verified'),'rejected',(select count(*) from b where payment_review_status='rejected'),'average_review_hours',(select round(avg(extract(epoch from(payment_reviewed_at-created_at))/3600)::numeric,1) from b where payment_reviewed_at is not null)) end
 ) into result;
 return result;
end; $function$;

commit;

