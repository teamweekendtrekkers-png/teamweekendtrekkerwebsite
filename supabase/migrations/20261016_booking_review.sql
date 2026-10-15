-- Customer records remain private. These RPCs require a separately granted
-- Supabase Auth administrator claim; GitHub tokens and anonymous users cannot use them.
alter table public.bookings add column if not exists payment_review_status text not null default 'pending'
  check (payment_review_status in ('pending','verified','rejected'));
alter table public.bookings add column if not exists payment_review_note text not null default '';
alter table public.bookings add column if not exists payment_reviewed_at timestamptz;
alter table public.bookings add column if not exists payment_reviewed_by uuid;

create or replace function public.twt_list_bookings(p_search text default '', p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or coalesce(auth.jwt()->'app_metadata'->>'trip_manager_admin','') <> 'true' then
    raise insufficient_privilege using message='Booking administrator access required';
  end if;
  if p_search is null or length(p_search)>150 or p_offset is null or p_offset<0 or p_offset>100000 then
    raise exception 'invalid_request';
  end if;
  return coalesce((select jsonb_agg(to_jsonb(rows)) from (
    select id,booking_reference,trip_name,departure_label,full_name,email,phone,
      travellers,total_amount,special_requests,created_at,payment_review_status,
      payment_review_note,payment_reviewed_at
    from public.bookings b
    where p_search='' or strpos(lower(concat_ws(' ',b.booking_reference,b.full_name,b.phone,b.special_requests)),lower(p_search))>0
    order by b.created_at desc,b.id desc limit 50 offset p_offset
  ) rows),'[]'::jsonb);
end; $$;

create or replace function public.twt_review_booking(p_id uuid,p_status text,p_note text,p_expected_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare saved public.bookings;
begin
  if auth.uid() is null or coalesce(auth.jwt()->'app_metadata'->>'trip_manager_admin','') <> 'true' then
    raise insufficient_privilege using message='Booking administrator access required';
  end if;
  if p_status is null or p_status not in ('pending','verified','rejected') or p_note is null or length(p_note)>500 then raise exception 'invalid_request'; end if;
  select * into saved from public.bookings where id=p_id for update;
  if not found then raise exception 'booking_unavailable'; end if;
  if saved.payment_reviewed_at is distinct from p_expected_at then raise exception 'review_conflict'; end if;
  if saved.special_requests is null or left(saved.special_requests,13)<>'[TWT_PAYMENT:' then raise exception 'payment_report_required'; end if;
  update public.bookings set payment_review_status=p_status,payment_review_note=p_note,
    payment_reviewed_at=clock_timestamp(),payment_reviewed_by=auth.uid() where id=p_id;
  -- Payment review does not confirm seat availability or rewrite booking status.
  return jsonb_build_object('saved',true);
end; $$;

revoke all on function public.twt_list_bookings(text,integer) from public,anon;
revoke all on function public.twt_review_booking(uuid,text,text,timestamptz) from public,anon;
grant execute on function public.twt_list_bookings(text,integer) to authenticated;
grant execute on function public.twt_review_booking(uuid,text,text,timestamptz) to authenticated;
