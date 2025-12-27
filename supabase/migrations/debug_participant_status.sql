-- Debug: Check participant statuses per tournament
SELECT 
    t.name as tournament_name,
    tp.status,
    count(*) as team_count
FROM tournament_participants tp
JOIN tournaments t ON tp.tournament_id = t.id
GROUP BY t.name, tp.status
ORDER BY t.name, tp.status;
