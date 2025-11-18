-- Add team-specific shareable links for map veto (like mapban.gg)
-- Each team gets a unique token to access their veto interface

begin;

-- Add link tokens to match_map_vetos table
alter table public.match_map_vetos
  add column if not exists team1_link_token text,
  add column if not exists team2_link_token text;

-- Generate unique tokens for existing vetos
update public.match_map_vetos
set 
  team1_link_token = encode(gen_random_bytes(16), 'hex')
where team1_link_token is null;

update public.match_map_vetos
set 
  team2_link_token = encode(gen_random_bytes(16), 'hex')
where team2_link_token is null;

-- Create indexes for token lookups
create index if not exists idx_match_map_vetos_team1_token on public.match_map_vetos(team1_link_token);
create index if not exists idx_match_map_vetos_team2_token on public.match_map_vetos(team2_link_token);

-- Update the initialize_match_veto function to generate tokens
create or replace function public.initialize_match_veto(
  p_match_id uuid,
  p_veto_format text default 'standard_7'
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_veto_id uuid;
  v_match_record record;
  v_team1_id uuid;
  v_team2_id uuid;
  v_team1_token text;
  v_team2_token text;
begin
  -- Get match details
  select tournament_id, team1_id, team2_id
  into v_match_record
  from public.tournament_matches
  where id = p_match_id;
  
  if not found then
    raise exception 'Match not found';
  end if;
  
  -- Check if veto already exists
  select id into v_veto_id
  from public.match_map_vetos
  where match_id = p_match_id;
  
  if found then
    -- Ensure tokens exist if they don't
    update public.match_map_vetos
    set 
      team1_link_token = coalesce(team1_link_token, encode(gen_random_bytes(16), 'hex')),
      team2_link_token = coalesce(team2_link_token, encode(gen_random_bytes(16), 'hex'))
    where id = v_veto_id;
    return v_veto_id; -- Return existing veto ID
  end if;
  
  -- Determine starting team (higher seed or random)
  v_team1_id := v_match_record.team1_id;
  v_team2_id := v_match_record.team2_id;
  
  -- Generate unique tokens for each team
  v_team1_token := encode(gen_random_bytes(16), 'hex');
  v_team2_token := encode(gen_random_bytes(16), 'hex');
  
  -- Create new veto process
  insert into public.match_map_vetos (
    match_id,
    tournament_id,
    team1_id,
    team2_id,
    team1_link_token,
    team2_link_token,
    veto_format,
    status,
    current_team_id,
    current_action,
    current_action_number,
    turn_started_at,
    started_at
  ) values (
    p_match_id,
    v_match_record.tournament_id,
    v_team1_id,
    v_team2_id,
    v_team1_token,
    v_team2_token,
    p_veto_format,
    'in_progress',
    v_team1_id, -- Start with team1
    'ban', -- First action is always a ban
    1, -- First action
    now(),
    now()
  )
  returning id into v_veto_id;
  
  return v_veto_id;
end;
$$;

comment on column public.match_map_vetos.team1_link_token is 'Unique token for team 1 to access their veto interface';
comment on column public.match_map_vetos.team2_link_token is 'Unique token for team 2 to access their veto interface';

commit;

