-- Team invitations with accept/decline RPC
begin;

create table if not exists public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  roster_id uuid null references public.team_rosters(id) on delete set null,
  invited_user_id uuid not null references public.profiles(id) on delete cascade,
  invited_email text null,
  invited_by_user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','expired')),
  created_at timestamptz not null default now(),
  responded_at timestamptz null
);

alter table if exists public.team_invitations enable row level security;

-- Invited user can see and act on their invites
do $$ begin
  create policy ti_select_self on public.team_invitations for select using (invited_user_id = auth.uid() or auth.role() = 'service_role');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy ti_modify_self on public.team_invitations for update using (invited_user_id = auth.uid() or auth.role() = 'service_role') with check (invited_user_id = auth.uid() or auth.role() = 'service_role');
exception when duplicate_object then null; end $$;

-- Team owner can create/view invites
do $$ begin
  create policy ti_select_owner on public.team_invitations for select using (
    exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid()) or auth.role() = 'service_role'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy ti_insert_owner on public.team_invitations for insert with check (
    exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid()) or auth.role() = 'service_role'
  );
exception when duplicate_object then null; end $$;

-- Accept invite RPC
create or replace function public.accept_team_invite(invite_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_team uuid;
  v_roster uuid;
  v_invited uuid;
  v_status text;
  v_size int;
  v_count int;
begin
  select team_id, roster_id, invited_user_id, status into v_team, v_roster, v_invited, v_status
  from public.team_invitations where id = invite_id for update;

  if not found then
    raise exception 'Invite not found';
  end if;
  if v_invited <> auth.uid() then
    raise exception 'Not your invite';
  end if;
  if v_status <> 'pending' then
    return;
  end if;

  -- Ensure team member
  insert into public.team_members (team_id, user_id, role, is_active)
  values (v_team, v_invited, 'member', true)
  on conflict (team_id, user_id) do nothing;

  -- Add to roster if specified, respecting 5v5 cap (7) else team_size
  if v_roster is not null then
    select team_size into v_size from public.team_rosters where id = v_roster;
    if v_size is null then v_size := 5; end if;
    select count(*) into v_count from public.team_roster_members where roster_id = v_roster;
    if (v_size = 5 and v_count < 7) or (v_size <> 5 and v_count < v_size) then
      insert into public.team_roster_members (roster_id, user_id) values (v_roster, v_invited)
      on conflict do nothing;
    end if;
  end if;

  update public.team_invitations set status = 'accepted', responded_at = now() where id = invite_id;
end;
$$;

-- Decline invite RPC
create or replace function public.decline_team_invite(invite_id uuid)
returns void
language sql
security definer
as $$
  update public.team_invitations
  set status = 'declined', responded_at = now()
  where id = invite_id and invited_user_id = auth.uid() and status = 'pending';
$$;

commit;


