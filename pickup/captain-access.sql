-- Run after schema.sql in the separate Pickup project.
begin;
create table public.pickup_list_access (
  departure text primary key references public.pickup_departures(slug),
  username text not null unique,
  password_hash bytea not null
);
alter table public.pickup_list_access enable row level security;
revoke all on public.pickup_list_access from public,anon,authenticated;

create function public.pickup_generate_list_access(p_departure text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  access_user text := 'pickup-' || replace(gen_random_uuid()::text,'-','');
  access_password text := replace(gen_random_uuid()::text,'-','');
begin
  if auth.uid() is null or coalesce(auth.jwt()->'app_metadata'->>'pickup_captain','') <> 'true' then
    raise insufficient_privilege;
  end if;
  insert into public.pickup_list_access(departure,username,password_hash)
    values(p_departure,access_user,sha256(convert_to(access_user || ':' || access_password,'UTF8')))
    on conflict(departure) do update set username=excluded.username,password_hash=excluded.password_hash;
  return jsonb_build_object('username',access_user,'password',access_password);
end; $$;

create function public.pickup_read_captain_list(p_username text,p_password text)
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
        select jsonb_agg(jsonb_build_object('name',c.lead_name,'phone',c.phone,'people',c.party_size)
          order by c.lead_name,c.updated_at) as parties
        from public.pickup_checkins c where c.departure=selected.slug and c.stop=s.id and c.updated_at is not null
      ) scoped where s.departure=selected.slug and scoped.parties is not null),'[]'::jsonb));
end; $$;

revoke all on function public.pickup_generate_list_access(text) from public,anon,authenticated;
grant execute on function public.pickup_generate_list_access(text) to authenticated;
revoke all on function public.pickup_read_captain_list(text,text) from public,anon,authenticated;
grant execute on function public.pickup_read_captain_list(text,text) to anon,authenticated;
commit;
