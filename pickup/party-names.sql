-- Install in the separate Pickup project after shared-checkin.sql.
begin;
alter table public.pickup_checkins add column passenger_names text[] not null default '{}';

create function public.pickup_party_checkin(p_departure text,p_code uuid,p_legacy boolean default false,
  p_name text default null,p_phone text default null,p_people integer default null,p_stop uuid default null,
  p_passengers text[] default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb; names text[];
begin
  if p_name is not null and p_passengers is not null then
    if p_people is null or p_people not between 1 and 50 or cardinality(p_passengers)>p_people-1
      or exists(select 1 from unnest(p_passengers) name where name is null or length(name)>100 or name ~ '[[:cntrl:]]') then
      raise exception 'invalid_passengers';
    end if;
    select coalesce(array_agg(btrim(name) order by position),'{}') into names
      from unnest(p_passengers) with ordinality listed(name,position);
  end if;
  if p_legacy then
    result := public.pickup_submission(p_departure,p_code,p_name,p_phone,p_people,p_stop);
  else
    result := public.pickup_shared_checkin(p_departure,p_code,p_name,p_phone,p_people,p_stop);
  end if;
  if result is null or not (result ? 'people') then return result; end if;
  if p_name is not null and names is not null then
    update public.pickup_checkins c set passenger_names=names
      where c.departure=p_departure and c.code=p_code;
  end if;
  select c.passenger_names into names from public.pickup_checkins c
    where c.departure=p_departure and c.code=p_code;
  return result || jsonb_build_object('passengers',coalesce(names[1:greatest(0,(result->>'people')::integer-1)],'{}'));
end; $$;
revoke all on function public.pickup_party_checkin(text,uuid,boolean,text,text,integer,uuid,text[]) from public,anon,authenticated;
grant execute on function public.pickup_party_checkin(text,uuid,boolean,text,text,integer,uuid,text[]) to anon,authenticated;

create or replace function public.pickup_read_captain_list(p_username text,p_password text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare selected public.pickup_departures%rowtype;
begin
  if length(p_username) <> 39 or length(p_password) <> 32 then return null; end if;
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
