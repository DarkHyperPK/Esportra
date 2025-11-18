    -- Fix initialize_match_veto function to accept all required parameters
    -- This migration updates the function signature to match the client code

    begin;

    -- Drop and recreate the function with correct signature
    drop function if exists public.initialize_match_veto(uuid, text);
    drop function if exists public.initialize_match_veto(uuid, uuid, uuid, uuid);

    -- Create the function with the correct signature matching client calls
    create or replace function public.initialize_match_veto(
    p_match_id uuid,
    p_tournament_id uuid,
    p_team1_id uuid default null,
    p_team2_id uuid default null,
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
    -- Get match details (if match exists, use it; otherwise use provided params)
    select tournament_id, team1_id, team2_id
    into v_match_record
    from public.tournament_matches
    where id = p_match_id;
    
    -- Use provided tournament_id if match doesn't exist or doesn't have tournament_id
    if not found or v_match_record.tournament_id is null then
        v_match_record.tournament_id := p_tournament_id;
        v_match_record.team1_id := p_team1_id;
        v_match_record.team2_id := p_team2_id;
    end if;
    
    -- Use provided team IDs if they're not in the match record
    if p_team1_id is not null then
        v_match_record.team1_id := p_team1_id;
    end if;
    if p_team2_id is not null then
        v_match_record.team2_id := p_team2_id;
    end if;
    
    if v_match_record.tournament_id is null then
        raise exception 'Tournament ID is required';
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
    
    -- Determine team IDs
    v_team1_id := v_match_record.team1_id;
    v_team2_id := v_match_record.team2_id;
    
    -- Generate unique tokens for each team (only if teams exist)
    v_team1_token := case when v_team1_id is not null then encode(gen_random_bytes(16), 'hex') else null end;
    v_team2_token := case when v_team2_id is not null then encode(gen_random_bytes(16), 'hex') else null end;
    
    -- Create new veto process
    insert into public.match_map_vetos (
        match_id,
        tournament_id,
        team1_id,
        team2_id,
        team1_link_token,
        team2_link_token,
        veto_format,
        best_of, -- Set to NULL initially - organizer will select BO1/BO3/BO5
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
        null, -- best_of is NULL until organizer selects BO1/BO3/BO5
        'pending', -- Start as pending, will be changed to in_progress when BO is selected
        v_team1_id, -- Start with team1 if exists
        null, -- current_action is null until BO is selected
        0, -- Start at 0, will be set to 1 when BO is selected
        null, -- Don't set turn_started_at until veto actually starts
        null -- Don't set started_at until veto actually starts
    )
    returning id into v_veto_id;
    
    return v_veto_id;
    end;
    $$;

    -- Grant execute permissions
    grant execute on function public.initialize_match_veto(uuid, uuid, uuid, uuid, text) to authenticated;
    grant execute on function public.initialize_match_veto(uuid, uuid, uuid, uuid, text) to service_role;

    commit;

