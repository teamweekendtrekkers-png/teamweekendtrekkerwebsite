-- Apply after captain-manual-access.sql. Existing credentials keep their hashes.
begin;
do $$
declare
  setter text := pg_get_functiondef('public.pickup_set_list_access(text,text,text)'::regprocedure);
  reader text := pg_get_functiondef('public.pickup_read_captain_list(text,text)'::regprocedure);
  new_setter text;
  new_reader text;
begin
  new_setter := replace(setter,
    'length(p_password) < 12 or octet_length(p_password) > 64',
    'length(p_password) not between 4 and 12 or p_password ~ ''[[:cntrl:]]''');
  new_setter := replace(new_setter, 'Use 12–64 bytes for the password, without spaces at either end.',
    'Use 4–12 characters without spaces at either end.');
  new_reader := replace(reader, 'octet_length(p_password) not between 12 and 64',
    '(length(p_password) < 4 or octet_length(p_password) > 64)');
  if strpos(new_setter, 'length(p_password) not between 4 and 12') = 0 or new_reader = reader then
    raise exception 'Unexpected captain password validation';
  end if;
  execute new_setter;
  execute new_reader;
end; $$;
commit;
