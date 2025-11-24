-- =====================================================
-- RENAME MAP VETO TABLES TO GAME-SPECIFIC NAMING
-- =====================================================
-- This migration renames map veto system tables to use game-specific prefixes
-- Only affects Valorant-specific map veto tables
--
-- Tables being renamed:
-- 1. tournament_map_pools → valorant_tournament_map_pools
-- 2. match_map_vetos → valorant_match_map_vetos
-- 3. match_map_veto_actions → valorant_match_map_veto_actions

BEGIN;

-- =====================================================
-- 1. RENAME tournament_map_pools
-- =====================================================
ALTER TABLE IF EXISTS public.tournament_map_pools 
  RENAME TO valorant_tournament_map_pools;

-- Update indexes
DROP INDEX IF EXISTS public.idx_tournament_map_pools_tournament;
CREATE INDEX IF NOT EXISTS idx_valorant_tournament_map_pools_tournament 
  ON public.valorant_tournament_map_pools(tournament_id);

-- =====================================================
-- 2. RENAME match_map_vetos
-- =====================================================
ALTER TABLE IF EXISTS public.match_map_vetos 
  RENAME TO valorant_match_map_vetos;

-- Update indexes
DROP INDEX IF EXISTS public.idx_match_map_vetos_match;
DROP INDEX IF EXISTS public.idx_match_map_vetos_tournament;
DROP INDEX IF EXISTS public.idx_match_map_vetos_status;

CREATE INDEX IF NOT EXISTS idx_valorant_match_map_vetos_match 
  ON public.valorant_match_map_vetos(match_id);
CREATE INDEX IF NOT EXISTS idx_valorant_match_map_vetos_tournament 
  ON public.valorant_match_map_vetos(tournament_id);
CREATE INDEX IF NOT EXISTS idx_valorant_match_map_vetos_status 
  ON public.valorant_match_map_vetos(status);

-- Update foreign key references in match_map_veto_actions
-- (Will be done after renaming that table)

-- =====================================================
-- 3. RENAME match_map_veto_actions
-- =====================================================
ALTER TABLE IF EXISTS public.match_map_veto_actions 
  RENAME TO valorant_match_map_veto_actions;

-- Update foreign key constraint (veto_id reference)
ALTER TABLE IF EXISTS public.valorant_match_map_veto_actions
  DROP CONSTRAINT IF EXISTS match_map_veto_actions_veto_id_fkey;

ALTER TABLE IF EXISTS public.valorant_match_map_veto_actions
  ADD CONSTRAINT valorant_match_map_veto_actions_veto_id_fkey 
  FOREIGN KEY (veto_id) 
  REFERENCES public.valorant_match_map_vetos(id) 
  ON DELETE CASCADE;

-- Update indexes
DROP INDEX IF EXISTS public.idx_match_map_veto_actions_veto;
DROP INDEX IF EXISTS public.idx_match_map_veto_actions_match;

CREATE INDEX IF NOT EXISTS idx_valorant_match_map_veto_actions_veto 
  ON public.valorant_match_map_veto_actions(veto_id);
CREATE INDEX IF NOT EXISTS idx_valorant_match_map_veto_actions_match 
  ON public.valorant_match_map_veto_actions(match_id);

-- =====================================================
-- 4. UPDATE RLS POLICIES
-- =====================================================

-- Drop old policies and create new ones with updated table names
DO $$ 
BEGIN
  -- Tournament Map Pools policies
  DROP POLICY IF EXISTS tournament_map_pools_select_public ON public.valorant_tournament_map_pools;
  DROP POLICY IF EXISTS tournament_map_pools_modify_organizer ON public.valorant_tournament_map_pools;
  
  CREATE POLICY valorant_tournament_map_pools_select_public ON public.valorant_tournament_map_pools
    FOR SELECT USING (true);
  
  CREATE POLICY valorant_tournament_map_pools_modify_organizer ON public.valorant_tournament_map_pools
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.tournaments t
        WHERE t.id = tournament_id AND t.organizer_id = auth.uid()
      ) OR auth.role() = 'service_role'
    );

  -- Match Map Vetos policies
  DROP POLICY IF EXISTS match_map_vetos_select_public ON public.valorant_match_map_vetos;
  DROP POLICY IF EXISTS match_map_vetos_modify_captain ON public.valorant_match_map_vetos;
  DROP POLICY IF EXISTS match_map_vetos_insert_organizer ON public.valorant_match_map_vetos;
  
  CREATE POLICY valorant_match_map_vetos_select_public ON public.valorant_match_map_vetos
    FOR SELECT USING (true);
  
  CREATE POLICY valorant_match_map_vetos_modify_captain ON public.valorant_match_map_vetos
    FOR UPDATE USING (
      EXISTS (
        SELECT 1 FROM public.tournaments t
        WHERE t.id = tournament_id AND t.organizer_id = auth.uid()
      )
      OR
      (
        current_team_id IS NOT NULL AND
        EXISTS (
          SELECT 1 FROM public.team_members tm
          WHERE tm.team_id = current_team_id
            AND tm.user_id = auth.uid()
            AND tm.role = 'captain'
            AND tm.is_active = true
        )
      )
      OR auth.role() = 'service_role'
    );
  
  CREATE POLICY valorant_match_map_vetos_insert_organizer ON public.valorant_match_map_vetos
    FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.tournaments t
        WHERE t.id = tournament_id AND t.organizer_id = auth.uid()
      ) OR auth.role() = 'service_role'
    );

  -- Match Map Veto Actions policies
  DROP POLICY IF EXISTS match_map_veto_actions_select_public ON public.valorant_match_map_veto_actions;
  DROP POLICY IF EXISTS match_map_veto_actions_insert_captain ON public.valorant_match_map_veto_actions;
  
  CREATE POLICY valorant_match_map_veto_actions_select_public ON public.valorant_match_map_veto_actions
    FOR SELECT USING (true);
  
  CREATE POLICY valorant_match_map_veto_actions_insert_captain ON public.valorant_match_map_veto_actions
    FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.valorant_match_map_vetos mmv
        JOIN public.tournaments t ON t.id = mmv.tournament_id
        WHERE mmv.id = veto_id AND t.organizer_id = auth.uid()
      )
      OR
      (
        team_id IS NOT NULL AND
        EXISTS (
          SELECT 1 FROM public.team_members tm
          WHERE tm.team_id = team_id
            AND tm.user_id = auth.uid()
            AND tm.role = 'captain'
            AND tm.is_active = true
        )
      )
      OR auth.role() = 'service_role'
    );
END $$;

-- =====================================================
-- 5. UPDATE FUNCTIONS
-- =====================================================

-- Update reset_match_veto function to use new table names
CREATE OR REPLACE FUNCTION public.reset_match_veto(
  p_match_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_veto_id uuid;
BEGIN
  -- Find existing veto
  SELECT id INTO v_veto_id
  FROM public.valorant_match_map_vetos
  WHERE match_id = p_match_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Veto process not found';
  END IF;
  
  -- Delete all actions
  DELETE FROM public.valorant_match_map_veto_actions
  WHERE veto_id = v_veto_id;
  
  -- Reset veto state
  UPDATE public.valorant_match_map_vetos
  SET
    status = 'pending',
    current_team_id = null,
    current_action = null,
    current_action_number = 0,
    team1_banned_maps = '{}',
    team2_banned_maps = '{}',
    team1_picked_maps = '{}',
    team2_picked_maps = '{}',
    selected_map_id = null,
    best_of = null,
    selected_map_pool = null,
    turn_started_at = null,
    started_at = null,
    completed_at = null
  WHERE id = v_veto_id;
END;
$$;

-- Update initialize_match_veto function to use new table name
CREATE OR REPLACE FUNCTION public.initialize_match_veto(
  p_match_id uuid,
  p_veto_format text default 'standard_7'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_veto_id uuid;
  v_match_record record;
  v_team1_id uuid;
  v_team2_id uuid;
BEGIN
  -- Get match details
  SELECT tournament_id, team1_id, team2_id
  INTO v_match_record
  FROM public.tournament_matches
  WHERE id = p_match_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
  
  -- Check if veto already exists
  SELECT id INTO v_veto_id
  FROM public.valorant_match_map_vetos
  WHERE match_id = p_match_id;
  
  IF FOUND THEN
    RETURN v_veto_id; -- Return existing veto ID
  END IF;
  
  -- Determine starting team (higher seed or random)
  v_team1_id := v_match_record.team1_id;
  v_team2_id := v_match_record.team2_id;
  
  -- Create new veto process
  INSERT INTO public.valorant_match_map_vetos (
    match_id,
    tournament_id,
    team1_id,
    team2_id,
    veto_format,
    status,
    current_team_id,
    current_action,
    current_action_number,
    turn_started_at,
    started_at
  ) VALUES (
    p_match_id,
    v_match_record.tournament_id,
    v_team1_id,
    v_team2_id,
    p_veto_format,
    'in_progress',
    v_team1_id, -- Start with team1
    'ban', -- First action is always a ban
    1, -- First action
    NOW(),
    NOW()
  )
  RETURNING id INTO v_veto_id;
  
  RETURN v_veto_id;
END;
$$;

-- =====================================================
-- 6. UPDATE COMMENTS
-- =====================================================
COMMENT ON TABLE public.valorant_tournament_map_pools IS 'Maps available for Valorant tournaments';
COMMENT ON TABLE public.valorant_match_map_vetos IS 'Map veto process state for Valorant matches';
COMMENT ON TABLE public.valorant_match_map_veto_actions IS 'Log of all Valorant veto actions taken';

COMMIT;

-- =====================================================
-- SUMMARY
-- =====================================================
-- Renamed tables:
-- ✅ tournament_map_pools → valorant_tournament_map_pools
-- ✅ match_map_vetos → valorant_match_map_vetos
-- ✅ match_map_veto_actions → valorant_match_map_veto_actions
--
-- Updated:
-- ✅ Indexes
-- ✅ Foreign keys
-- ✅ RLS policies
-- ✅ Functions
-- ✅ Comments

