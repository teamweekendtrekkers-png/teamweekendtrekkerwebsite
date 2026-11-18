-- Isolated CI fixture: enough sessions to reproduce the old materialized-scan timeout.
-- Never run this synthetic traffic fixture against the live analytics database.
begin;
with sessions as materialized (
 select gen_random_uuid() as session_id, n from generate_series(1,3000) n
)
insert into public.twt_journey_events(id,session_id,event_name,trip_id,source,device,occurred_at)
select gen_random_uuid(),s.session_id,event.name,
 case when event.name='site_visit' then null else 'volume-trip' end,
 'direct','mobile',
 (((now() at time zone 'Asia/Kolkata')::date-(s.n%28))::timestamp at time zone 'Asia/Kolkata')
 + event.position*interval '1 minute'
from sessions s cross join unnest(array['site_visit','trip_view','date_selected','checkout_open','payment_shown','payment_submitted'])
 with ordinality as event(name,position);
analyze public.twt_journey_events;
set local role authenticated;
select set_config('test.uid','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
select set_config('test.jwt','{"app_metadata":{"trip_manager_admin":true}}',true);
-- Keep this below the production API's eight-second limit, not an increased timeout.
set local statement_timeout='4s';
do $$declare r jsonb; d date:=(now() at time zone 'Asia/Kolkata')::date;begin
 r:=public.twt_journey_report(d-29,d);
 if (r->>'sessions')::int<>3000 or (r->'funnel'->0->>'count')::int<>3000
 or (r->'funnel'->4->>'count')::int<>3000 then
  raise exception 'Volume report lost ordered journeys';
 end if;
 r:=public.twt_journey_report(d-89,d,'volume-trip','mobile');
 if (r->'funnel'->4->>'count')::int<>3000 or r->'review'<>'null'::jsonb then
  raise exception 'Volume report filters changed';
 end if;
end $$;
rollback;
