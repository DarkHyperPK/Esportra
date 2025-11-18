-- Enhance map veto system with BO format, attack/defend, and better tracking
-- Idempotent: safe to run multiple times

begin;

-- Add best_of to match_map_vetos (BO1, BO3, BO5)
alter table public.match_map_vetos
  add column if not exists best_of integer default 1 check (best_of in (1, 3, 5));

-- Add attack/defend selection for picks
alter table public.match_map_vetos
  add column if not exists team1_picked_maps jsonb default '[]', -- [{map_id, side: 'attack'|'defend'}]
  add column if not exists team2_picked_maps jsonb default '[]';

-- Update match_map_veto_actions to track which team did what
alter table public.match_map_veto_actions
  add column if not exists side text check (side in ('attack', 'defend'));

-- Create function to reset veto process
create or replace function public.reset_match_veto(
  p_match_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_veto_id uuid;
begin
  -- Find existing veto
  select id into v_veto_id
  from public.match_map_vetos
  where match_id = p_match_id;
  
  if not found then
    raise exception 'Veto process not found';
  end if;
  
  -- Delete all actions
  delete from public.match_map_veto_actions
  where veto_id = v_veto_id;
  
  -- Reset veto state
  update public.match_map_vetos
  set
    status = 'pending',
    current_team_id = null,
    current_action = null,
    current_action_number = 0,
    team1_banned_maps = '{}',
    team2_banned_maps = '{}',
    team1_picked_maps = '[]',
    team2_picked_maps = '[]',
    selected_map_id = null,
    started_at = null,
    completed_at = null,
    turn_started_at = null,
    updated_at = now()
  where id = v_veto_id;
end;
$$;

comment on function public.reset_match_veto is 'Reset a map veto process to allow starting over';

commit;

