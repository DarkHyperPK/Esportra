SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name IN (
        'valorant_match_map_vetos', 
        'valorant_match_map_veto_actions', 
        'valorant_tournament_map_pools',
        'match_map_vetos',
        'match_map_veto_actions',
        'tournament_map_pools'
    )
ORDER BY 
    table_name, ordinal_position;
