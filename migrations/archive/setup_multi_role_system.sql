-- Multi-role verification system setup (idempotent)
-- Ensures per-role verification and assignment tables, constraints, indexes, and minimal RLS

-- 1) Tables
create table if not exists verified_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('organizer','venue_owner')),
  status text not null check (status in ('pending','approved','rejected')),
  is_active boolean not null default true,
  reviewed_at timestamptz,
  updated_at timestamptz default now(),
  unique (user_id, role)
);

create table if not exists user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('organizer','venue_owner')),
  is_active boolean not null default true,
  assigned_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, role)
);

-- 2) Indexes
create index if not exists idx_verified_roles_user_role on verified_roles(user_id, role);
create index if not exists idx_user_roles_user_role on user_roles(user_id, role);

-- 3) RLS policies: allow users to read their own records
alter table verified_roles enable row level security;
alter table user_roles enable row level security;

do $$ begin
  create policy "read own verified_roles"
  on verified_roles for select
  to authenticated
  using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "read own user_roles"
  on user_roles for select
  to authenticated
  using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Allow admins to read all rows
do $$ begin
  create policy "admin read all verified_roles"
  on verified_roles for select
  to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and coalesce(p.is_admin, false) = true));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "admin read all user_roles"
  on user_roles for select
  to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and coalesce(p.is_admin, false) = true));
exception when duplicate_object then null; end $$;

-- Allow admins to insert/update rows
do $$ begin
  create policy "admin write verified_roles"
  on verified_roles for insert to authenticated
  with check (exists (select 1 from profiles p where p.id = auth.uid() and coalesce(p.is_admin, false) = true));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "admin update verified_roles"
  on verified_roles for update to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and coalesce(p.is_admin, false) = true))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and coalesce(p.is_admin, false) = true));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "admin write user_roles"
  on user_roles for insert to authenticated
  with check (exists (select 1 from profiles p where p.id = auth.uid() and coalesce(p.is_admin, false) = true));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "admin update user_roles"
  on user_roles for update to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and coalesce(p.is_admin, false) = true))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and coalesce(p.is_admin, false) = true));
exception when duplicate_object then null; end $$;

-- Optionally, admins can write. Adjust role identifier as per your setup.
-- Replace 'service_role' with a Postgres role or add a dedicated admin policy if needed.
-- These are no-ops if such roles/policies already exist.

-- 4) Sanity: backfill unique constraints if missing (defensive no-op if already present)
do $$ begin
  alter table verified_roles add constraint verified_roles_user_role_key unique (user_id, role);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table user_roles add constraint user_roles_user_role_key unique (user_id, role);
exception when duplicate_object then null; end $$;


