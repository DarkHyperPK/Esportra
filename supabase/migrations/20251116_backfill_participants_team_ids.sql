begin;

-- 1) Backfill team_id from exact name match (case-insensitive) against teams
update public.tournament_participants tp
set team_id = t.id
from public.teams t
where tp.participant_type = 'team'
  and tp.team_id is null
  and tp.team_name is not null
  and lower(tp.team_name) = lower(t.name);

-- 2) If roster_id exists but team_id is still null, backfill from team_rosters
update public.tournament_participants tp
set team_id = tr.team_id
from public.team_rosters tr
where tp.participant_type = 'team'
  and tp.team_id is null
  and tp.roster_id = tr.id;

-- 3) If team_id exists and roster_name present but roster_id is null, backfill roster_id by name
update public.tournament_participants tp
set roster_id = tr.id
from public.team_rosters tr
where tp.participant_type = 'team'
  and tp.team_id = tr.team_id
  and tp.roster_id is null
  and tp.roster_name is not null
  and lower(tr.name) = lower(tp.roster_name);

commit;


