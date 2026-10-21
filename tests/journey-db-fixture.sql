create role anon;create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
create function auth.jwt() returns jsonb language sql as $$ select coalesce(nullif(current_setting('test.jwt',true),''),'{}')::jsonb $$;
create table public.bookings(id uuid primary key default gen_random_uuid(),trip_id text,created_at timestamptz default now(),special_requests text,payment_review_status text default 'pending',payment_reviewed_at timestamptz);
