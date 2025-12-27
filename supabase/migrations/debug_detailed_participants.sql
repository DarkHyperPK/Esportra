-- Detailed Debug: Inspect all participants for all tournaments
-- This will help identify why teams are not being picked up by the bracket generator.

SELECT 
    t.name as tournament_name,
    tp.id as participant_id,
    tp.participant_type,
    tp.status,
    tp.team_id,
    tm.name as team_name,
    tp.gamer_tag,
    tp.user_id
FROM tournament_participants tp
JOIN tournaments t ON tp.tournament_id = t.id
LEFT JOIN teams tm ON tp.team_id = tm.id
ORDER BY t.name, tp.created_at DESC;

-- Check Stage Participants as well to see who is already enrolled
SELECT 
    t.name as tournament_name,
    s.name as stage_name,
    sp.team_id,
    tm.name as team_name
FROM stage_participants sp
JOIN tournament_stages s ON sp.stage_id = s.id
JOIN tournaments t ON s.tournament_id = t.id
LEFT JOIN teams tm ON sp.team_id = tm.id;
