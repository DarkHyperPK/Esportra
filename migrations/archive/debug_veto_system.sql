-- =====================================================
-- SQL Queries to Debug Map Veto System
-- =====================================================
-- Run these queries in Supabase SQL Editor to check the state of your veto system

-- 1. Check all veto records for a specific tournament
-- Replace 'YOUR_TOURNAMENT_ID' with your actual tournament ID
SELECT 
  v.id as veto_id,
  v.match_id,
  v.tournament_id,
  v.status,
  v.best_of,
  v.current_action,
  v.current_action_number,
  v.current_team_id,
  v.team1_id,
  v.team2_id,
  v.team1_banned_maps,
  v.team2_banned_maps,
  v.team1_picked_maps,
  v.team2_picked_maps,
  v.selected_map_pool,
  v.selected_map_id,
  v.created_at,
  v.updated_at,
  tm.round,
  tm.match_number,
  t1.name as team1_name,
  t2.name as team2_name
FROM valorant_match_map_vetos v
LEFT JOIN tournament_matches tm ON tm.id = v.match_id
LEFT JOIN teams t1 ON t1.id = v.team1_id
LEFT JOIN teams t2 ON t2.id = v.team2_id
WHERE v.tournament_id = 'YOUR_TOURNAMENT_ID'  -- Replace with your tournament ID
ORDER BY tm.round, tm.match_number;

-- 2. Check all veto actions for a specific match
-- Replace 'YOUR_MATCH_ID' with your actual match ID
SELECT 
  a.id,
  a.veto_id,
  a.match_id,
  a.team_id,
  a.action_type,
  a.action_number,
  a.map_id,
  a.side,
  a.created_at,
  t.name as team_name,
  m.name as map_name
FROM valorant_match_map_veto_actions a
LEFT JOIN teams t ON t.id = a.team_id
LEFT JOIN valorant_maps m ON m.id = a.map_id
WHERE a.match_id = 'YOUR_MATCH_ID'  -- Replace with your match ID
ORDER BY a.action_number;

-- 3. Check for duplicate teams in bracket matches
SELECT 
  tm.tournament_id,
  tm.round,
  tm.match_number,
  tm.team1_id,
  tm.team2_id,
  t1.name as team1_name,
  t2.name as team2_name,
  CASE 
    WHEN tm.team1_id = tm.team2_id AND tm.team1_id IS NOT NULL THEN 'DUPLICATE'
    ELSE 'OK'
  END as status
FROM tournament_matches tm
LEFT JOIN teams t1 ON t1.id = tm.team1_id
LEFT JOIN teams t2 ON t2.id = tm.team2_id
WHERE tm.tournament_id = 'YOUR_TOURNAMENT_ID'  -- Replace with your tournament ID
  AND tm.round = 1  -- Check Round 1 for duplicates
ORDER BY tm.match_number;

-- 4. Check all teams in Round 1 matches (to find duplicates)
SELECT 
  tm.round,
  tm.match_number,
  tm.team1_id,
  tm.team2_id,
  t1.name as team1_name,
  t2.name as team2_name,
  COUNT(*) OVER (PARTITION BY tm.team1_id) as team1_count,
  COUNT(*) OVER (PARTITION BY tm.team2_id) as team2_count
FROM tournament_matches tm
LEFT JOIN teams t1 ON t1.id = tm.team1_id
LEFT JOIN teams t2 ON t2.id = tm.team2_id
WHERE tm.tournament_id = 'YOUR_TOURNAMENT_ID'  -- Replace with your tournament ID
  AND tm.round = 1
ORDER BY tm.match_number;

-- 5. Find teams that appear multiple times in Round 1
SELECT 
  team_id,
  team_name,
  COUNT(*) as appearance_count,
  STRING_AGG(match_number::text, ', ' ORDER BY match_number) as match_numbers
FROM (
  SELECT tm.team1_id as team_id, t1.name as team_name, tm.match_number
  FROM tournament_matches tm
  LEFT JOIN teams t1 ON t1.id = tm.team1_id
  WHERE tm.tournament_id = 'YOUR_TOURNAMENT_ID'  -- Replace with your tournament ID
    AND tm.round = 1
    AND tm.team1_id IS NOT NULL
    AND NOT tm.team1_id::text LIKE 'bye-%'
  
  UNION ALL
  
  SELECT tm.team2_id as team_id, t2.name as team_name, tm.match_number
  FROM tournament_matches tm
  LEFT JOIN teams t2 ON t2.id = tm.team2_id
  WHERE tm.tournament_id = 'YOUR_TOURNAMENT_ID'  -- Replace with your tournament ID
    AND tm.round = 1
    AND tm.team2_id IS NOT NULL
    AND NOT tm.team2_id::text LIKE 'bye-%'
) combined
GROUP BY team_id, team_name
HAVING COUNT(*) > 1
ORDER BY appearance_count DESC;

-- 6. Check veto state consistency (banned maps vs actions)
SELECT 
  v.id as veto_id,
  v.match_id,
  v.team1_banned_maps as veto_team1_banned,
  v.team2_banned_maps as veto_team2_banned,
  ARRAY_AGG(DISTINCT CASE WHEN a.action_type = 'ban' AND a.team_id = v.team1_id THEN a.map_id END) FILTER (WHERE a.action_type = 'ban' AND a.team_id = v.team1_id) as actions_team1_banned,
  ARRAY_AGG(DISTINCT CASE WHEN a.action_type = 'ban' AND a.team_id = v.team2_id THEN a.map_id END) FILTER (WHERE a.action_type = 'ban' AND a.team_id = v.team2_id) as actions_team2_banned,
  CASE 
    WHEN v.team1_banned_maps IS DISTINCT FROM ARRAY_AGG(DISTINCT CASE WHEN a.action_type = 'ban' AND a.team_id = v.team1_id THEN a.map_id END) FILTER (WHERE a.action_type = 'ban' AND a.team_id = v.team1_id)
      OR v.team2_banned_maps IS DISTINCT FROM ARRAY_AGG(DISTINCT CASE WHEN a.action_type = 'ban' AND a.team_id = v.team2_id THEN a.map_id END) FILTER (WHERE a.action_type = 'ban' AND a.team_id = v.team2_id)
    THEN 'MISMATCH'
    ELSE 'OK'
  END as consistency_status
FROM valorant_match_map_vetos v
LEFT JOIN valorant_match_map_veto_actions a ON a.veto_id = v.id
WHERE v.tournament_id = 'YOUR_TOURNAMENT_ID'  -- Replace with your tournament ID
GROUP BY v.id, v.match_id, v.team1_banned_maps, v.team2_banned_maps, v.team1_id, v.team2_id
ORDER BY v.match_id;

-- 7. Count actions per match (to verify action sequence)
SELECT 
  v.match_id,
  v.current_action_number as expected_action_number,
  COUNT(a.id) as actual_action_count,
  MAX(a.action_number) as max_action_number,
  CASE 
    WHEN v.current_action_number != COUNT(a.id) THEN 'MISMATCH'
    ELSE 'OK'
  END as status
FROM valorant_match_map_vetos v
LEFT JOIN valorant_match_map_veto_actions a ON a.veto_id = v.id
WHERE v.tournament_id = 'YOUR_TOURNAMENT_ID'  -- Replace with your tournament ID
GROUP BY v.match_id, v.current_action_number
ORDER BY v.match_id;

-- 8. Check for orphaned actions (actions without a veto record)
SELECT 
  a.id,
  a.veto_id,
  a.match_id,
  a.action_type,
  a.action_number,
  CASE 
    WHEN v.id IS NULL THEN 'ORPHANED'
    ELSE 'OK'
  END as status
FROM valorant_match_map_veto_actions a
LEFT JOIN valorant_match_map_vetos v ON v.id = a.veto_id
WHERE v.id IS NULL;

-- 9. Reset a specific match's veto (use with caution!)
-- Replace 'YOUR_MATCH_ID' with your actual match ID
-- DO NOT RUN THIS IN PRODUCTION WITHOUT BACKUP
/*
DO $$
DECLARE
  v_veto_id uuid;
BEGIN
  -- Find veto
  SELECT id INTO v_veto_id
  FROM valorant_match_map_vetos
  WHERE match_id = 'YOUR_MATCH_ID';  -- Replace with your match ID
  
  IF v_veto_id IS NOT NULL THEN
    -- Delete actions
    DELETE FROM valorant_match_map_veto_actions
    WHERE veto_id = v_veto_id;
    
    -- Reset veto
    UPDATE valorant_match_map_vetos
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
      completed_at = null,
      updated_at = now()
    WHERE id = v_veto_id;
    
    RAISE NOTICE 'Veto reset for match: YOUR_MATCH_ID';
  ELSE
    RAISE NOTICE 'No veto found for match: YOUR_MATCH_ID';
  END IF;
END $$;
*/

