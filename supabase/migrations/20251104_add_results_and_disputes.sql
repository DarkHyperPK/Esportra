  -- Match results and disputes for Esportra
  -- Idempotent DDL with safe checks

  begin;

  -- Buckets used in dashboard:
  --   - tournament-results (final result screenshots)
  --   - tournament-screenshots (dispute evidence)

  -- Create table: tournament_match_results
  create table if not exists public.tournament_match_results (
    id uuid primary key default gen_random_uuid(),
    tournament_id uuid not null references public.tournaments(id) on delete cascade,
    match_id uuid,
    team_id uuid references public.teams(id) on delete set null,
    reporter_user_id uuid not null references auth.users(id) on delete cascade,
    image_url text,
    comment text,
    status text not null default 'pending', -- pending|accepted|rejected
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  create index if not exists idx_tmr_tournament on public.tournament_match_results(tournament_id);
  create index if not exists idx_tmr_reporter on public.tournament_match_results(reporter_user_id);

  alter table public.tournament_match_results enable row level security;

  -- Policies: reporters can CRUD own; organizers of the tournament can read/update
  do $$
  begin
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='tournament_match_results' and policyname='tmr_select_self_or_org'
    ) then
      create policy tmr_select_self_or_org on public.tournament_match_results for select
      using (
        reporter_user_id = auth.uid()
        or exists (
          select 1 from public.tournaments t
          where t.id = tournament_id and (t.organizer_id = auth.uid())
        )
        or auth.role() = 'service_role'
      );
    end if;

    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='tournament_match_results' and policyname='tmr_insert_self'
    ) then
      create policy tmr_insert_self on public.tournament_match_results for insert
      with check (reporter_user_id = auth.uid() or auth.role() = 'service_role');
    end if;

    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='tournament_match_results' and policyname='tmr_update_org_or_self'
    ) then
      create policy tmr_update_org_or_self on public.tournament_match_results for update
      using (
        reporter_user_id = auth.uid()
        or exists (
          select 1 from public.tournaments t
          where t.id = tournament_id and (t.organizer_id = auth.uid())
        )
        or auth.role() = 'service_role'
      )
      with check (
        reporter_user_id = auth.uid()
        or exists (
          select 1 from public.tournaments t
          where t.id = tournament_id and (t.organizer_id = auth.uid())
        )
        or auth.role() = 'service_role'
      );
    end if;

    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='tournament_match_results' and policyname='tmr_delete_org_or_self'
    ) then
      create policy tmr_delete_org_or_self on public.tournament_match_results for delete
      using (
        reporter_user_id = auth.uid()
        or exists (
          select 1 from public.tournaments t
          where t.id = tournament_id and (t.organizer_id = auth.uid())
        )
        or auth.role() = 'service_role'
      );
    end if;
  end $$;

  -- Create table: tournament_disputes
  create table if not exists public.tournament_disputes (
    id uuid primary key default gen_random_uuid(),
    tournament_id uuid not null references public.tournaments(id) on delete cascade,
    match_id uuid,
    raised_by_user_id uuid not null references auth.users(id) on delete cascade,
    team_id uuid references public.teams(id) on delete set null,
    title text not null,
    description text,
    evidence_url text,
    status text not null default 'open', -- open|in_review|resolved|rejected
    assigned_to_user_id uuid references auth.users(id) on delete set null,
    resolution_notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  create index if not exists idx_td_tournament on public.tournament_disputes(tournament_id);
  create index if not exists idx_td_raised_by on public.tournament_disputes(raised_by_user_id);

  alter table public.tournament_disputes enable row level security;

  do $$
  begin
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='tournament_disputes' and policyname='td_select_participant_or_org'
    ) then
      create policy td_select_participant_or_org on public.tournament_disputes for select
      using (
        raised_by_user_id = auth.uid()
        or exists (
          select 1 from public.tournaments t
          where t.id = tournament_id and (t.organizer_id = auth.uid())
        )
        or auth.role() = 'service_role'
      );
    end if;

    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='tournament_disputes' and policyname='td_insert_self'
    ) then
      create policy td_insert_self on public.tournament_disputes for insert
      with check (raised_by_user_id = auth.uid() or auth.role() = 'service_role');
    end if;

    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='tournament_disputes' and policyname='td_update_org'
    ) then
      create policy td_update_org on public.tournament_disputes for update
      using (
        exists (
          select 1 from public.tournaments t
          where t.id = tournament_id and (t.organizer_id = auth.uid())
        )
        or auth.role() = 'service_role'
      )
      with check (
        exists (
          select 1 from public.tournaments t
          where t.id = tournament_id and (t.organizer_id = auth.uid())
        )
        or auth.role() = 'service_role'
      );
    end if;

    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='tournament_disputes' and policyname='td_delete_org'
    ) then
      create policy td_delete_org on public.tournament_disputes for delete
      using (
        exists (
          select 1 from public.tournaments t
          where t.id = tournament_id and (t.organizer_id = auth.uid())
        )
        or auth.role() = 'service_role'
      );
    end if;
  end $$;

  commit;


