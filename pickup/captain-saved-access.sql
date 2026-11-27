-- Apply after captain-password-length.sql in the Pickup project.
begin;
create extension if not exists supabase_vault with schema vault;
alter table public.pickup_list_access add column if not exists manual_secret_id uuid;

create or replace function public.pickup_clear_saved_captain_password()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if old.password_hash is not distinct from new.password_hash
      and old.username is not distinct from new.username then return new; end if;
    new.manual_secret_id := null;
  end if;
  if old.manual_secret_id is not null then
    delete from vault.secrets where id = old.manual_secret_id;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;
revoke all on function public.pickup_clear_saved_captain_password() from public, anon, authenticated;
drop trigger if exists pickup_clear_saved_captain_password on public.pickup_list_access;
create trigger pickup_clear_saved_captain_password
before update of password_hash, username or delete on public.pickup_list_access
for each row execute function public.pickup_clear_saved_captain_password();

create or replace function public.pickup_set_list_access(p_departure text, p_username text, p_password text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  access_user text := lower(trim(p_username));
  secret_id uuid;
begin
  if auth.uid() is null or coalesce(auth.jwt()->'app_metadata'->>'pickup_captain', '') <> 'true' then
    raise insufficient_privilege;
  end if;
  if access_user is null or access_user !~ '^[a-z0-9._-]{3,72}$' then
    raise exception 'Use 3–72 letters, numbers, dots, underscores or hyphens.' using errcode = '22023';
  end if;
  if p_password is null or length(p_password) not between 4 and 12
    or p_password ~ '[[:cntrl:]]' or p_password <> trim(p_password) then
    raise exception 'Use 4–12 characters without spaces at either end.' using errcode = '22023';
  end if;
  insert into public.pickup_list_access(departure, username, password_hash)
  values (p_departure, access_user, convert_to(extensions.crypt(p_password, extensions.gen_salt('bf', 10)), 'UTF8'))
  on conflict (departure) do update set username = excluded.username, password_hash = excluded.password_hash;
  secret_id := vault.create_secret(p_password);
  update public.pickup_list_access set manual_secret_id = secret_id where departure = p_departure;
  return jsonb_build_object('username', access_user, 'saved', true);
exception when unique_violation then
  raise exception 'That username is already used for another departure.' using errcode = '23505';
end; $$;

create or replace function public.pickup_get_saved_list_access(p_departure text, p_reveal boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  access public.pickup_list_access%rowtype;
  revealed text;
begin
  if auth.uid() is null or coalesce(auth.jwt()->'app_metadata'->>'pickup_captain', '') <> 'true' then
    raise insufficient_privilege;
  end if;
  select * into access from public.pickup_list_access where departure = p_departure;
  if not found then return null; end if;
  if p_reveal and access.manual_secret_id is not null then
    select decrypted_secret into revealed from vault.decrypted_secrets where id = access.manual_secret_id;
  end if;
  return jsonb_build_object('username', access.username, 'saved', access.manual_secret_id is not null, 'password', revealed);
end; $$;
revoke all on function public.pickup_set_list_access(text,text,text) from public, anon, authenticated;
revoke all on function public.pickup_get_saved_list_access(text,boolean) from public, anon, authenticated;
grant execute on function public.pickup_set_list_access(text,text,text) to authenticated;
grant execute on function public.pickup_get_saved_list_access(text,boolean) to authenticated;
commit;
