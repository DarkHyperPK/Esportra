-- Create dispute_comments table for back-and-forth communication
-- This allows organizers and users to have a conversation before resolving disputes

begin;

-- Create dispute_comments table
create table if not exists public.dispute_comments (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.tournament_disputes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  comment text not null,
  is_internal boolean default false, -- Internal notes only visible to organizers/admins
  created_at timestamptz not null default now()
);

-- Create indexes
create index if not exists idx_dc_dispute on public.dispute_comments(dispute_id);
create index if not exists idx_dc_user on public.dispute_comments(user_id);
create index if not exists idx_dc_created on public.dispute_comments(created_at);

-- Enable RLS
alter table public.dispute_comments enable row level security;

-- RLS Policies
do $$
begin
  -- Users can see their own comments and comments on their disputes (unless internal)
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' 
      and tablename='dispute_comments' 
      and policyname='dc_select_own_or_dispute'
  ) then
    create policy dc_select_own_or_dispute on public.dispute_comments
    for select
    using (
      -- Users can see their own comments
      user_id = auth.uid()
      -- Users can see non-internal comments on disputes they raised
      or (
        not is_internal
        and exists (
          select 1 from public.tournament_disputes td
          where td.id = dispute_id and td.raised_by_user_id = auth.uid()
        )
      )
      -- Organizers can see ALL comments (including internal) on disputes in their tournaments
      or exists (
        select 1 from public.tournament_disputes td
        join public.tournaments t on t.id = td.tournament_id
        where td.id = dispute_id 
          and (t.organizer_id = auth.uid() or td.assigned_to_user_id = auth.uid())
      )
      -- Staff can see ALL comments (including internal) on disputes in tournaments they assist
      or exists (
        select 1 from public.tournament_disputes td
        join public.tournament_staff ts on ts.tournament_id = td.tournament_id
        where td.id = dispute_id
          and ts.user_id = auth.uid()
          and ts.status = 'active'
          and 'disputes:assist' = any(ts.permissions)
      )
      or auth.role() = 'service_role'
    );
  end if;

  -- Users can insert comments on their own disputes
  -- Organizers/admins can insert comments on disputes in their tournaments
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' 
      and tablename='dispute_comments' 
      and policyname='dc_insert_own_or_organizer'
  ) then
    create policy dc_insert_own_or_organizer on public.dispute_comments
    for insert
    with check (
      user_id = auth.uid()
      and (
        exists (
          select 1 from public.tournament_disputes td
          where td.id = dispute_id and td.raised_by_user_id = auth.uid()
        )
        or exists (
          select 1 from public.tournament_disputes td
          join public.tournaments t on t.id = td.tournament_id
          where td.id = dispute_id 
            and (t.organizer_id = auth.uid() or td.assigned_to_user_id = auth.uid())
        )
        or exists (
          select 1 from public.tournament_disputes td
          join public.tournament_staff ts on ts.tournament_id = td.tournament_id
          where td.id = dispute_id
            and ts.user_id = auth.uid()
            and ts.status = 'active'
            and 'disputes:assist' = any(ts.permissions)
        )
        or auth.role() = 'service_role'
      )
    );
  end if;
end $$;

commit;

