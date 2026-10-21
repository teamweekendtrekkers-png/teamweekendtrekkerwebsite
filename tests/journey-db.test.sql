-- Runs on an isolated PostgreSQL database, never on production.
begin;
set local role anon;
select public.twt_track_journey('11111111-1111-4111-8111-111111111111','instagram','mobile','[{"id":"00000000-0000-4000-8000-000000000001","name":"site_visit","trip":null,"error":null},{"id":"00000000-0000-4000-8000-000000000002","name":"trip_view","trip":"theyyam","error":null},{"id":"00000000-0000-4000-8000-000000000003","name":"date_selected","trip":"theyyam","error":null},{"id":"00000000-0000-4000-8000-000000000004","name":"checkout_open","trip":"theyyam","error":null},{"id":"00000000-0000-4000-8000-000000000005","name":"payment_shown","trip":"theyyam","error":null},{"id":"00000000-0000-4000-8000-000000000006","name":"payment_submitted","trip":"theyyam","error":null}]');
-- Idempotent duplicate; no extra rows.
select public.twt_track_journey('11111111-1111-4111-8111-111111111111','instagram','mobile','[{"id":"00000000-0000-4000-8000-000000000006","name":"payment_submitted","trip":"theyyam","error":null}]');
do $$begin
 begin perform * from public.twt_journey_events;raise exception 'anonymous raw read allowed';exception when insufficient_privilege then null;end;
 begin perform public.twt_journey_report(current_date,current_date);raise exception 'anonymous report allowed';exception when insufficient_privilege then null;end;
 begin perform public.twt_track_journey('11111111-1111-4111-8111-111111111111','instagram','mobile','[{"id":"00000000-0000-4000-8000-000000000007","name":"trip_view","email":"customer@example.com"}]');raise exception 'PII accepted';exception when raise_exception then if sqlerrm<>'invalid_analytics' then raise;end if;end;
end $$;
reset role;
select public.twt_track_journey('22222222-2222-4222-8222-222222222222','direct','desktop','[{"id":"00000000-0000-4000-8000-000000000008","name":"trip_view","trip":"theyyam"}]');
select public.twt_track_journey('33333333-3333-4333-8333-333333333333','google','desktop','[{"id":"00000000-0000-4000-8000-000000000009","name":"checkout_open","trip":"other-trip"},{"id":"00000000-0000-4000-8000-000000000010","name":"payment_shown","trip":"other-trip"}]');
insert into public.bookings(trip_id,special_requests,payment_review_status,payment_reviewed_at)values('theyyam','[TWT_PAYMENT:report','verified',now());
set local role authenticated;
do $$begin
 begin perform public.twt_journey_report(current_date,current_date);raise exception 'non-admin report allowed';exception when insufficient_privilege then null;end;
end $$;
select set_config('test.uid','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
select set_config('test.jwt','{"app_metadata":{"trip_manager_admin":true}}',true);
do $$declare r jsonb; d date:=(now() at time zone 'Asia/Kolkata')::date;begin
 r:=public.twt_journey_report(d,d);
 if (r->'funnel'->0->>'count')::int<>2 or (r->'funnel'->4->>'count')::int<>1 or (r->>'direct_checkout')::int<>1 then raise exception 'incorrect funnel: %',r;end if;
 if (r->'review'->>'verified')::int<>1 then raise exception 'incorrect review: %',r;end if;
 if r::text like '%special_requests%' or r::text like '%email%' then raise exception 'private data in aggregate';end if;
 r:=public.twt_journey_report(d,d,'theyyam','desktop');
 if (r->'funnel'->0->>'count')::int<>1 or (r->'funnel'->4->>'count')::int<>0 or r->'review'<>'null'::jsonb then raise exception 'filters incorrect: %',r;end if;
 begin perform public.twt_journey_report(d-100,d);raise exception 'unbounded report allowed';exception when raise_exception then if sqlerrm<>'invalid_range' then raise;end if;end;
end $$;
reset role;
do $$begin if (select count(*) from public.twt_journey_events)<>9 then raise exception 'idempotency failed';end if;end $$;
rollback;
