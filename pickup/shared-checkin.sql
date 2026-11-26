-- Install in the separate Pickup project after schema.sql.
begin;
alter table public.pickup_checkins add column shared_phone_key text;
create unique index pickup_checkins_shared_phone on public.pickup_checkins(departure,shared_phone_key)
  where shared_phone_key is not null;
create table public.pickup_shared_limits (
  source_hash bytea primary key,
  window_at timestamptz not null,
  attempts integer not null
);
create table public.pickup_shared_settings (salt uuid not null default gen_random_uuid());
insert into public.pickup_shared_settings default values;
alter table public.pickup_shared_limits enable row level security;
alter table public.pickup_shared_settings enable row level security;
revoke all on public.pickup_shared_limits,public.pickup_shared_settings from public,anon,authenticated;

create function public.pickup_shared_checkin(p_departure text,p_code uuid,p_name text default null,
  p_phone text default null,p_people integer default null,p_stop uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  entry public.pickup_checkins%rowtype;
  browser_reference text := 'SHARED-' || p_code::text;
  source bytea;
  minute_start timestamptz := date_trunc('minute',now());
  count_in_window integer;
begin
  if p_code is null or p_departure is null or p_departure !~ '^[a-z0-9][a-z0-9-]{0,79}$' then return null; end if;
  perform 1 from public.pickup_departures d where d.slug=p_departure and d.open
    and d.departure_date >= (now() at time zone 'Asia/Kolkata')::date for share;
  if not found then return null; end if;

  if p_name is not null then
    if length(btrim(p_name)) not between 1 and 100 or p_name ~ '[[:cntrl:]]'
       or p_phone is null or p_phone !~ '^\+?[0-9 ()-]{10,21}$'
       or length(regexp_replace(p_phone,'[^0-9]','','g')) not between 10 and 15
       or p_people is null or p_people not between 1 and 50
       or not exists (select 1 from public.pickup_stops s where s.departure=p_departure and s.id=p_stop) then
      raise exception 'invalid_checkin';
    end if;
    source := sha256(convert_to((select salt from public.pickup_shared_settings)::text || '|' ||
      left(split_part(coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-forwarded-for','unknown'),',',1),80),'UTF8'));
    insert into public.pickup_shared_limits as limits (source_hash,window_at,attempts) values(source,minute_start,1)
      on conflict(source_hash) do update set window_at=excluded.window_at,
      attempts=case when limits.window_at=excluded.window_at then limits.attempts+1 else 1 end
      returning attempts into count_in_window;
    if count_in_window > 40 then return jsonb_build_object('rateLimited',true); end if;
    begin
      insert into public.pickup_checkins as c(code,departure,booking_reference,lead_name,phone,party_size,stop,updated_at,shared_phone_key)
        values(p_code,p_departure,browser_reference,btrim(p_name),btrim(p_phone),p_people,p_stop,now(),
          regexp_replace(regexp_replace(p_phone,'[^0-9]','','g'),'^91([0-9]{10})$','\1'))
        on conflict(code) do update set lead_name=excluded.lead_name,phone=excluded.phone,
          party_size=excluded.party_size,stop=excluded.stop,updated_at=excluded.updated_at,
          shared_phone_key=excluded.shared_phone_key
        where c.departure=excluded.departure and c.booking_reference=excluded.booking_reference
        returning * into entry;
      if not found then return null; end if;
    exception when unique_violation then
      return jsonb_build_object('contactOrganizer',true);
    end;
  else
    select * into entry from public.pickup_checkins c
      where c.code=p_code and c.departure=p_departure and c.booking_reference=browser_reference;
    if not found then return null; end if;
  end if;
  return jsonb_build_object('name',entry.lead_name,'phone',entry.phone,'people',entry.party_size,
    'stop',entry.stop,'updatedAt',entry.updated_at);
end; $$;
revoke all on function public.pickup_shared_checkin(text,uuid,text,text,integer,uuid) from public,anon,authenticated;
grant execute on function public.pickup_shared_checkin(text,uuid,text,text,integer,uuid) to anon,authenticated;
commit;
