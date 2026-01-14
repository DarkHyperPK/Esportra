-- Drop the trigger that syncs best_of (since the column is gone)
DROP TRIGGER IF EXISTS trigger_sync_veto_best_of ON match_map_vetos;

-- Drop the function used by the trigger
DROP FUNCTION IF EXISTS sync_veto_best_of_from_stage();
