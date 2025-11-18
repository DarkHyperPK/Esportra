-- Enable Realtime for Bracket and Map Veto System
-- This migration enables Supabase Realtime on all tables needed for
-- real-time bracket updates and map veto synchronization across browsers

BEGIN;

-- Enable Realtime for Bracket System Tables
-- These tables handle tournament bracket matches, results, and participants

-- 1. tournament_matches - Core bracket matches (team swaps, scores, status)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'tournament_matches'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE tournament_matches;
        RAISE NOTICE 'Added tournament_matches to supabase_realtime publication';
    ELSE
        RAISE NOTICE 'tournament_matches already in supabase_realtime publication';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding tournament_matches: %', SQLERRM;
END $$;

-- 2. tournament_match_results - Match result uploads and verification
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'tournament_match_results'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE tournament_match_results;
        RAISE NOTICE 'Added tournament_match_results to supabase_realtime publication';
    ELSE
        RAISE NOTICE 'tournament_match_results already in supabase_realtime publication';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding tournament_match_results: %', SQLERRM;
END $$;

-- 3. tournament_participants - Participant/team changes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'tournament_participants'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE tournament_participants;
        RAISE NOTICE 'Added tournament_participants to supabase_realtime publication';
    ELSE
        RAISE NOTICE 'tournament_participants already in supabase_realtime publication';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding tournament_participants: %', SQLERRM;
END $$;

-- Enable Realtime for Map Veto System Tables
-- These tables handle map veto state and actions

-- 4. match_map_vetos - Map veto state (BO selection, status, team links)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'match_map_vetos'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE match_map_vetos;
        RAISE NOTICE 'Added match_map_vetos to supabase_realtime publication';
    ELSE
        RAISE NOTICE 'match_map_vetos already in supabase_realtime publication';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding match_map_vetos: %', SQLERRM;
END $$;

-- 5. match_map_veto_actions - Map ban/pick actions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'match_map_veto_actions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE match_map_veto_actions;
        RAISE NOTICE 'Added match_map_veto_actions to supabase_realtime publication';
    ELSE
        RAISE NOTICE 'match_map_veto_actions already in supabase_realtime publication';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding match_map_veto_actions: %', SQLERRM;
END $$;

-- Verify all tables are added to the publication
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename IN (
        'tournament_matches',
        'tournament_match_results',
        'tournament_participants',
        'match_map_vetos',
        'match_map_veto_actions'
    );
    
    RAISE NOTICE 'Total tables in supabase_realtime publication: %', table_count;
    
    IF table_count < 5 THEN
        RAISE WARNING 'Expected 5 tables, but found %. Please check manually.', table_count;
    ELSE
        RAISE NOTICE 'All 5 tables successfully added to supabase_realtime publication';
    END IF;
END $$;

COMMIT;

-- Note: After running this migration, verify in Supabase Dashboard:
-- 1. Go to Database → Replication
-- 2. Check that all 5 tables show as "Active" for Realtime
-- 3. If any table shows as inactive, you may need to enable it manually in the dashboard

