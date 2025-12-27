
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('stage_participants', 'tournament_matches')
ORDER BY table_name, column_name;
