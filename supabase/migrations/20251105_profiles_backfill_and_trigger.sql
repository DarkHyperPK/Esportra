-- Backfill missing profiles for users referenced in team_members
-- and ensure future inserts create a minimal profile if absent.

begin;

-- Create minimal profiles for any team member user_id without a profile
insert into public.profiles (id, username)
select tm.user_id, concat('player_', left(tm.user_id::text, 8))
from public.team_members tm
left join public.profiles p on p.id = tm.user_id
where p.id is null
group by tm.user_id;

-- Helper trigger to ensure a profile exists for new team members
create or replace function public.ensure_profile_for_team_member()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, username)
  values (new.user_id, concat('player_', left(new.user_id::text, 8)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_ensure_profile_for_team_member on public.team_members;
create trigger trg_ensure_profile_for_team_member
before insert on public.team_members
for each row execute function public.ensure_profile_for_team_member();

commit;


