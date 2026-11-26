begin;
insert into public.bookings(idempotency_key,trip_id,departure_date,departure_label,full_name,phone,travellers,traveller_details,booking_status)
values('a2ae2eaf-c7c6-4775-8d63-91dc30d743cb','pickup-fixture','2099-11-30','Nov 30','Fixture traveller','+91 9000000001',3,
  '[{"pickup":"Stop A"},{"pickup":"Stop B"},{}]','confirmed');

set local role anon;
do $$ begin
  if public.twt_pickup_details('a2ae2eaf-c7c6-4775-8d63-91dc30d743cb','9000000002') is not null then
    raise exception 'Wrong phone could read booking';
  end if;
  if public.twt_pickup_details('a2ae2eaf-c7c6-4775-8d63-91dc30d743cb','9000000001')->>'travellers' is distinct from '3' then
    raise exception 'Pickup details not returned after verification';
  end if;
  begin
    perform public.twt_pickup_manifest('pickup-fixture','2099-11-30');
    raise exception 'Anonymous manifest access was granted';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
set local role authenticated;
select set_config('test.uid','d261383c-5740-4eda-b954-cac63784dfb2',true);
do $$ begin
  begin
    perform public.twt_pickup_manifest('pickup-fixture','2099-11-30');
    raise exception 'Non-admin manifest access was granted';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('test.jwt','{"app_metadata":{"trip_manager_admin":true}}',true);
do $$ begin
  if jsonb_array_length(public.twt_pickup_manifest('pickup-fixture','2099-11-30')) <> 3 then
    raise exception 'Split pickups or missing pickups were lost';
  end if;
  if public.twt_pickup_details('a2ae2eaf-c7c6-4775-8d63-91dc30d743cb','9000000001','Stop A')->>'pickup' is distinct from 'Stop A' then
    raise exception 'Pickup change failed';
  end if;
  if public.twt_pickup_manifest('pickup-fixture','2099-11-30')->0->>'people' is distinct from '3' then
    raise exception 'Pickup change did not move the whole party';
  end if;
end $$;
rollback;
