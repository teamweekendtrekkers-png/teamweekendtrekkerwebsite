-- Run this in the separate Pickup project.
begin;
create table public.pickup_departures (
  slug text primary key check (slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  title text not null,
  departure_date date not null,
  open boolean not null default false,
  packing text[] not null default '{}'
);
create table public.pickup_stops (
  id uuid primary key default gen_random_uuid(),
  departure text not null references public.pickup_departures(slug),
  name text not null,
  pickup_time text not null,
  landmark text not null default '',
  map_url text not null default '',
  position integer not null default 0,
  unique (departure,id)
);
create table public.pickup_checkins (
  code uuid primary key default gen_random_uuid(),
  departure text not null references public.pickup_departures(slug),
  booking_reference text not null,
  lead_name text,
  phone text,
  party_size integer check (party_size between 1 and 50),
  stop uuid,
  updated_at timestamptz,
  unique (departure,booking_reference),
  foreign key (departure,stop) references public.pickup_stops(departure,id)
);

alter table public.pickup_departures enable row level security;
alter table public.pickup_stops enable row level security;
alter table public.pickup_checkins enable row level security;
revoke all on public.pickup_departures,public.pickup_stops,public.pickup_checkins from public,anon,authenticated;
grant select on public.pickup_departures,public.pickup_stops to anon,authenticated;
grant select,insert,update on public.pickup_checkins to authenticated;
grant insert,update on public.pickup_departures,public.pickup_stops to authenticated;

create policy public_pickup_departures on public.pickup_departures for select
  using (open or (auth.jwt()->'app_metadata'->>'pickup_captain') = 'true');
create policy public_pickup_stops on public.pickup_stops for select
  using (exists (select 1 from public.pickup_departures d where d.slug = departure));
create policy captain_departures on public.pickup_departures for all to authenticated
  using ((auth.jwt()->'app_metadata'->>'pickup_captain') = 'true')
  with check ((auth.jwt()->'app_metadata'->>'pickup_captain') = 'true');
create policy captain_stops on public.pickup_stops for all to authenticated
  using ((auth.jwt()->'app_metadata'->>'pickup_captain') = 'true')
  with check ((auth.jwt()->'app_metadata'->>'pickup_captain') = 'true');
create policy captain_checkins on public.pickup_checkins for all to authenticated
  using ((auth.jwt()->'app_metadata'->>'pickup_captain') = 'true')
  with check ((auth.jwt()->'app_metadata'->>'pickup_captain') = 'true');

create function public.pickup_submission(p_departure text,p_code uuid,p_name text default null,
  p_phone text default null,p_people integer default null,p_stop uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare row_data public.pickup_checkins%rowtype;
begin
  select c.* into row_data from public.pickup_checkins c
    join public.pickup_departures d on d.slug=c.departure
    where c.departure=p_departure and c.code=p_code and d.open
      and d.departure_date >= (now() at time zone 'Asia/Kolkata')::date
    for update of c;
  if not found then return null; end if;
  if p_name is not null then
    if length(btrim(p_name)) not between 1 and 100 or p_name ~ '[[:cntrl:]]'
       or p_phone is null or p_phone !~ '^\+?[0-9 ()-]{10,21}$'
       or length(regexp_replace(p_phone,'[^0-9]','','g')) not between 10 and 15
       or p_people is null or p_people not between 1 and 50
       or not exists (select 1 from public.pickup_stops s where s.departure=p_departure and s.id=p_stop) then
      raise exception 'invalid_checkin';
    end if;
    update public.pickup_checkins set lead_name=btrim(p_name),phone=btrim(p_phone),
      party_size=p_people,stop=p_stop,updated_at=now()
      where code=p_code returning * into row_data;
  end if;
  return jsonb_build_object('name',row_data.lead_name,'phone',row_data.phone,
    'people',row_data.party_size,'stop',row_data.stop,'updatedAt',row_data.updated_at);
end; $$;
revoke all on function public.pickup_submission(text,uuid,text,text,integer,uuid) from public,anon,authenticated;
grant execute on function public.pickup_submission(text,uuid,text,text,integer,uuid) to anon,authenticated;

create function public.pickup_invite(p_departure text,p_reference text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare invite uuid;
begin
  if coalesce(auth.jwt()->'app_metadata'->>'pickup_captain','') <> 'true' then
    raise insufficient_privilege;
  end if;
  p_reference := upper(btrim(p_reference));
  if p_reference is null or length(p_reference) not between 1 and 80 then raise exception 'invalid_reference'; end if;
  insert into public.pickup_checkins as c(departure,booking_reference) values(p_departure,p_reference)
    on conflict (departure,booking_reference) do update set booking_reference=excluded.booking_reference
    returning c.code into invite;
  return invite;
end; $$;
revoke all on function public.pickup_invite(text,text) from public,anon,authenticated;
grant execute on function public.pickup_invite(text,text) to authenticated;
commit;
