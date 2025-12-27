-- Schema Inspection Script
-- Run this to see the current columns and types for the bracket-related tables.

SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name IN ('tournament_stages', 'stage_participants', 'tournament_matches', 'tournament_participants')
ORDER BY 
    table_name, ordinal_position;
