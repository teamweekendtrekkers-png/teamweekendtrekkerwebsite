-- Apply in the Pickup project. Traveller-facing RPCs do not return these fields.
begin;
alter table public.pickup_checkins
  add column captain_balance_paise integer check (captain_balance_paise between 0 and 999999999),
  add column captain_room text check (length(captain_room) <= 120),
  add column captain_request text check (length(captain_request) <= 500);

do $$
declare
  original text := pg_get_functiondef('public.pickup_read_captain_list(text,text)'::regprocedure);
  updated text;
begin
  updated := replace(original, $needle$'passengers',to_jsonb($needle$,
    $fields$'balancePaise',c.captain_balance_paise,'room',c.captain_room,'specialRequest',c.captain_request,'passengers',to_jsonb($fields$);
  if original = updated then raise exception 'Unexpected captain list function'; end if;
  execute updated;
end; $$;
commit;
