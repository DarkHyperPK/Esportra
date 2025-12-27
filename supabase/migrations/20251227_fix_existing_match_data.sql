-- Migration to populate missing stage_id on tournament_matches
-- This fixes matches created before the stage_id persistence fix

-- Update tournament_matches to set stage_id where it's currently NULL
-- We'll match based on tournament_id and assume all matches belong to the first stage
-- (This is a safe assumption for most tournaments with a single stage)

UPDATE tournament_matches tm
SET stage_id = (
  SELECT ts.id 
  FROM tournament_stages ts 
  WHERE ts.tournament_id = tm.tournament_id 
  ORDER BY ts.stage_order ASC 
  LIMIT 1
)
WHERE tm.stage_id IS NULL
  AND tm.tournament_id IS NOT NULL;

-- Also update best_of from stage config where it's 1 (default) or NULL
UPDATE tournament_matches tm
SET best_of = COALESCE(
  (
    SELECT COALESCE(
      (ts.config->>'bestOf')::int,
      (ts.config->'veto'->>'best_of')::int,
      1
    )
    FROM tournament_stages ts 
    WHERE ts.id = tm.stage_id
  ),
  1
)
WHERE tm.stage_id IS NOT NULL
  AND (tm.best_of IS NULL OR tm.best_of = 1);
