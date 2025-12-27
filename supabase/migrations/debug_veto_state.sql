-- Inspect the latest match veto and its stage config
WITH latest_veto AS (
    SELECT * FROM match_map_vetos ORDER BY created_at DESC LIMIT 1
),
match_info AS (
    SELECT m.*, s.config as stage_config
    FROM tournament_matches m
    JOIN tournament_stages s ON m.stage_id = s.id
    WHERE m.id = (SELECT match_id FROM latest_veto)
)
SELECT 
    v.id as veto_id,
    v.match_id,
    v.status,
    v.best_of as veto_best_of,
    v.veto_format,
    v.selected_map_pool,
    m.stage_config,
    m.stage_config->'veto' as veto_config,
    m.stage_config->'veto'->>'best_of' as config_best_of
FROM latest_veto v
CROSS JOIN match_info m;
