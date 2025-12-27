-- Check tournament participants and their status
SELECT 
    t.name as tournament_name,
    t.id as tournament_id,
    count(tp.id) as total_participants,
    count(CASE WHEN tp.status = 'approved' THEN 1 END) as approved_participants,
    count(CASE WHEN tp.status = 'pending' THEN 1 END) as pending_participants
FROM tournaments t
LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
GROUP BY t.id, t.name;

-- Check stage participants for each stage
SELECT 
    t.name as tournament_name,
    s.name as stage_name,
    s.id as stage_id,
    count(sp.id) as enrolled_teams
FROM tournament_stages s
JOIN tournaments t ON s.tournament_id = t.id
LEFT JOIN stage_participants sp ON s.id = sp.stage_id
GROUP BY t.name, s.name, s.id;
