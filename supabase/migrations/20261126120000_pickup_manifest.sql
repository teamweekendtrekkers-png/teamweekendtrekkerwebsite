begin;

alter table public.bookings add column if not exists pickup_override text;

-- The private booking key and the booking phone are both required. Public
-- callers can only access the pickup details for that single booking.
create or replace function public.twt_pickup_details(p_key uuid, p_phone text, p_stop text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  booking public.bookings%rowtype;
  phone_digits text := regexp_replace(left(coalesce(p_phone,''), 40), '[^0-9]', '', 'g');
begin
  if length(phone_digits) < 10 or (p_stop is not null and
     (length(btrim(p_stop)) not between 1 and 120 or p_stop ~ '[[:cntrl:]]')) then
    return null;
  end if;
  select b.* into booking from public.bookings b
    where b.idempotency_key = p_key and b.booking_status = 'confirmed'
      and b.departure_date >= (now() at time zone 'Asia/Kolkata')::date
      and regexp_replace(regexp_replace(b.phone,'[^0-9]','','g'),'^91([0-9]{10})$','\1')
        = regexp_replace(phone_digits,'^91([0-9]{10})$','\1')
    for update;
  if not found then return null; end if;
  if p_stop is not null then
    update public.bookings set pickup_override = btrim(p_stop) where id = booking.id
      returning * into booking;
  end if;
  return jsonb_build_object('trip',booking.trip_id,'name',booking.full_name,
    'travellers',booking.travellers,'departure',booking.departure_label,
    'pickup',booking.pickup_override,'originalPickups',coalesce((
      select jsonb_agg(distinct person->>'pickup')
      from jsonb_array_elements(coalesce(booking.traveller_details,'[]'::jsonb)) person
      where nullif(person->>'pickup','') is not null
    ),'[]'::jsonb));
end; $$;

create or replace function public.twt_pickup_manifest(p_trip text, p_departure date)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or coalesce(auth.jwt()->'app_metadata'->>'trip_manager_admin','') <> 'true' then
    raise insufficient_privilege using message='Booking administrator access required';
  end if;
  return coalesce((select jsonb_agg(to_jsonb(row) order by row.stop nulls last, row.name)
    from (
      select b.full_name as name,b.phone,groups.stop,groups.people
      from public.bookings b
      cross join lateral (
        select b.pickup_override as stop, b.travellers as people where b.pickup_override is not null
        union all
        select nullif(btrim(b.traveller_details->index->>'pickup'),''), count(*)::integer
        from generate_series(0,b.travellers-1) as entries(index)
        where b.pickup_override is null group by 1
      ) groups
      where b.trip_id=p_trip and b.departure_date=p_departure and b.booking_status='confirmed'
    ) row),'[]'::jsonb);
end; $$;

revoke all on function public.twt_pickup_details(uuid,text,text) from public,anon,authenticated;
grant execute on function public.twt_pickup_details(uuid,text,text) to anon,authenticated;
revoke all on function public.twt_pickup_manifest(text,date) from public,anon,authenticated;
grant execute on function public.twt_pickup_manifest(text,date) to authenticated;

commit;
