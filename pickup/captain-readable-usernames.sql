begin;
create or replace function public.pickup_generate_list_access(p_departure text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  selected public.pickup_departures%rowtype;
  trip_name text;
  access_user text;
  access_password text := replace(gen_random_uuid()::text, '-', '');
begin
  if auth.uid() is null or coalesce(auth.jwt()->'app_metadata'->>'pickup_captain', '') <> 'true' then
    raise insufficient_privilege;
  end if;
  select * into strict selected from public.pickup_departures where slug = p_departure;
  trip_name := trim(both '-' from left(regexp_replace(lower(selected.title), '[^a-z0-9]+', '-', 'g'), 40));
  access_user := 'pickup-' || coalesce(nullif(trip_name, ''), 'trip') || '-' ||
    to_char(selected.departure_date, 'YYYYMMDD') || '-' ||
    left(encode(sha256(convert_to(p_departure, 'UTF8')), 'hex'), 12);
  insert into public.pickup_list_access(departure, username, password_hash)
    values (p_departure, access_user, sha256(convert_to(access_user || ':' || access_password, 'UTF8')))
    on conflict (departure) do update set username = excluded.username, password_hash = excluded.password_hash;
  return jsonb_build_object('username', access_user, 'password', access_password);
end; $$;

create or replace function public.pickup_read_captain_list(p_username text,p_password text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare selected public.pickup_departures%rowtype;
begin
  if length(p_username) not between 1 and 72 or length(p_password) <> 32 then return null; end if;
  select d.* into selected from public.pickup_departures d
    join public.pickup_list_access a on a.departure=d.slug
    where a.username=p_username and a.password_hash=sha256(convert_to(p_username || ':' || p_password,'UTF8'))
      and d.departure_date+1 >= (now() at time zone 'Asia/Kolkata')::date;
  if not found then return null; end if;
  return jsonb_build_object('title',selected.title,'date',selected.departure_date,
    'stops',coalesce((select jsonb_agg(jsonb_build_object('name',s.name,'time',s.pickup_time,
      'landmark',s.landmark,'parties',scoped.parties) order by s.position,s.id)
      from public.pickup_stops s cross join lateral (
        select jsonb_agg(jsonb_build_object('name',c.lead_name,'phone',c.phone,'people',c.party_size,
          'passengers',to_jsonb(array_remove(c.passenger_names[1:greatest(0,c.party_size-1)],''))) order by c.lead_name,c.updated_at) as parties
        from public.pickup_checkins c where c.departure=selected.slug and c.stop=s.id and c.updated_at is not null
      ) scoped where s.departure=selected.slug and scoped.parties is not null),'[]'::jsonb));
end; $$;
commit;
