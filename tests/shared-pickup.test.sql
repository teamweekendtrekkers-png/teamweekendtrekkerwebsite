begin;
insert into public.pickup_departures (slug,title,departure_date,open) values
  ('shared-test','Shared test departure','2099-11-28',true);
insert into public.pickup_stops(id,departure,name,pickup_time) values
  ('aeb9fc45-a25c-4684-9aa9-7555bf834a95','shared-test','Stop A','9 PM'),
  ('ad966666-c8f9-4f8e-8a26-4aafb6fbc300','shared-test','Stop B','10 PM');
set local role anon;
do $$
declare
  browser uuid := '8661caac-77d8-4099-a907-08e6a8d0b317';
  other uuid := '1f95eca7-4b8f-4809-b6f1-9e06ae7f2d6b';
  first_stop uuid := 'aeb9fc45-a25c-4684-9aa9-7555bf834a95';
  second_stop uuid := 'ad966666-c8f9-4f8e-8a26-4aafb6fbc300';
begin
  if public.pickup_shared_checkin('shared-test',browser,'Example','+91 90000 00001',2,first_stop)->>'people' is distinct from '2' then
    raise exception 'Shared form could not create check-in';
  end if;
  if public.pickup_shared_checkin('shared-test',other) is not null then
    raise exception 'A different browser could read a check-in';
  end if;
  if public.pickup_shared_checkin('shared-test',other,'Example','9000000001',2,second_stop)->>'contactOrganizer' is distinct from 'true' then
    raise exception 'Duplicate phone number accepted from another browser';
  end if;
  if public.pickup_shared_checkin('shared-test',browser,'Example','9000000001',3,second_stop)->>'stop' is distinct from second_stop::text then
    raise exception 'Existing browser could not edit its check-in';
  end if;
  if public.pickup_shared_checkin('shared-test',browser)->>'people' is distinct from '3' then
    raise exception 'Saved traveller count did not persist';
  end if;
end $$;
reset role;
do $$ begin
  if (select count(*) from public.pickup_checkins where departure='shared-test') <> 1 then
    raise exception 'Reopening the form created duplicate records';
  end if;
end $$;
rollback;
