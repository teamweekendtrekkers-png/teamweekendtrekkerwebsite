begin;
create extension if not exists pgcrypto with schema extensions;

create or replace function public.pickup_set_list_access(p_departure text, p_username text, p_password text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  access_user text := lower(trim(p_username));
begin
  if auth.uid() is null or coalesce(auth.jwt()->'app_metadata'->>'pickup_captain', '') <> 'true' then
    raise insufficient_privilege;
  end if;
  if access_user is null or access_user !~ '^[a-z0-9._-]{3,72}$' then
    raise exception 'Use 3–72 letters, numbers, dots, underscores or hyphens.' using errcode = '22023';
  end if;
  if p_password is null or length(p_password) < 12 or octet_length(p_password) > 64 or p_password <> trim(p_password) then
    raise exception 'Use 12–64 bytes for the password, without spaces at either end.' using errcode = '22023';
  end if;
  insert into public.pickup_list_access(departure, username, password_hash)
  values (p_departure, access_user, convert_to(extensions.crypt(p_password, extensions.gen_salt('bf', 10)), 'UTF8'))
  on conflict (departure) do update set username = excluded.username, password_hash = excluded.password_hash;
  return jsonb_build_object('username', access_user);
exception when unique_violation then
  raise exception 'That username is already used for another departure.' using errcode = '23505';
end; $$;

revoke all on function public.pickup_set_list_access(text,text,text) from public, anon, authenticated;
grant execute on function public.pickup_set_list_access(text,text,text) to authenticated;

create or replace function public.pickup_read_captain_list(p_username text,p_password text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare selected public.pickup_departures%rowtype;
begin
  if length(p_username) not between 1 and 72 or octet_length(p_password) not between 12 and 64 then return null; end if;
  select d.* into selected from public.pickup_departures d
    join public.pickup_list_access a on a.departure=d.slug
    where a.username=lower(p_username) and case when octet_length(a.password_hash) = 32
      then length(p_password) = 32 and a.password_hash=sha256(convert_to(a.username || ':' || p_password,'UTF8'))
      else a.password_hash=convert_to(extensions.crypt(p_password, convert_from(a.password_hash,'UTF8')),'UTF8')
    end
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
