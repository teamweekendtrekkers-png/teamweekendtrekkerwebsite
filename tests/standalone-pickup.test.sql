begin;
grant usage on schema auth to anon,authenticated;
insert into public.pickup_departures (slug,title,departure_date,open,packing) values
  ('pickup-test-a','Test Trek A','2099-11-28',true,array['Torch','Water']),
  ('pickup-test-b','Test Trek B','2099-12-05',true,array['Jacket']);
insert into public.pickup_stops(id,departure,name,pickup_time) values
  ('aeb9fc45-a25c-4684-9aa9-7555bf834a95','pickup-test-a','Stop A','9 PM'),
  ('ad966666-c8f9-4f8e-8a26-4aafb6fbc300','pickup-test-b','Stop B','10 PM');

set local role authenticated;
select set_config('test.uid','24819c6c-ba58-4eb1-a043-f141c00058ab',true);
do $$ begin
  begin
    perform public.pickup_generate_list_access('pickup-test-a');
    raise exception 'Ordinary user received organizer access';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('test.jwt','{"app_metadata":{"pickup_captain":true}}',true);
do $$
declare code uuid; older jsonb; newer jsonb;
begin
  code := public.pickup_invite('pickup-test-a',' REF-1 ');
  if code is distinct from public.pickup_invite('pickup-test-a','ref-1') then
    raise exception 'Repeat invitation created a second check-in';
  end if;
  if public.pickup_submission('pickup-test-b',code) is not null then
    raise exception 'Private link crossed departures';
  end if;
  begin
    perform public.pickup_submission('pickup-test-a',code,'Example','9000000001',3,'ad966666-c8f9-4f8e-8a26-4aafb6fbc300');
    raise exception 'A stop from another trip was accepted';
  exception when raise_exception then
    if sqlerrm <> 'invalid_checkin' then raise; end if;
  end;
  perform public.pickup_submission('pickup-test-a',code,'Example','9000000001',3,'aeb9fc45-a25c-4684-9aa9-7555bf834a95');
  perform public.pickup_submission('pickup-test-a',code,'Example','9000000001',2,'aeb9fc45-a25c-4684-9aa9-7555bf834a95');
  perform public.pickup_submission('pickup-test-b',public.pickup_invite('pickup-test-b','REF-2'),'Other party','9000000002',4,'ad966666-c8f9-4f8e-8a26-4aafb6fbc300');
  older := public.pickup_generate_list_access('pickup-test-a');
  newer := public.pickup_generate_list_access('pickup-test-a');
  if public.pickup_read_captain_list(older->>'username',older->>'password') is not null then
    raise exception 'Replaced captain password still works';
  end if;
  perform set_config('test.pickup_access',newer::text,true);
end $$;

reset role;
set local role anon;
do $$
declare credentials jsonb := current_setting('test.pickup_access')::jsonb; result jsonb;
begin
  begin
    perform 1 from public.pickup_checkins;
    raise exception 'Public callers can read the check-in table';
  exception when insufficient_privilege then null; end;
  if public.pickup_read_captain_list(credentials->>'username',repeat('0',32)) is not null then
    raise exception 'Incorrect password returned a list';
  end if;
  result := public.pickup_read_captain_list(credentials->>'username',credentials->>'password');
  if result->>'title' is distinct from 'Test Trek A'
     or jsonb_array_length(result->'stops') <> 1
     or jsonb_array_length(result->'stops'->0->'parties') <> 1
     or result->'stops'->0->'parties'->0->>'people' is distinct from '2'
     or result::text like '%Other party%' then
    raise exception 'Captain list was incomplete or crossed departures';
  end if;
end $$;
rollback;
