

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'Legacy tournament_registrations table removed - use tournament_participants instead';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'casual',
    'organizer',
    'venue_owner',
    'admin'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."invite_status" AS ENUM (
    'pending',
    'accepted',
    'declined',
    'expired'
);


ALTER TYPE "public"."invite_status" OWNER TO "postgres";


CREATE TYPE "public"."ledger_type" AS ENUM (
    'credit',
    'debit'
);


ALTER TYPE "public"."ledger_type" OWNER TO "postgres";


CREATE TYPE "public"."match_status" AS ENUM (
    'scheduled',
    'in_progress',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."match_status" OWNER TO "postgres";


CREATE TYPE "public"."notification_type" AS ENUM (
    'info',
    'success',
    'warning',
    'error',
    'team_invite',
    'staff_invite',
    'tournament_announcement'
);


ALTER TYPE "public"."notification_type" OWNER TO "postgres";


CREATE TYPE "public"."payment_status" AS ENUM (
    'pending',
    'succeeded',
    'failed',
    'refunded'
);


ALTER TYPE "public"."payment_status" OWNER TO "postgres";


CREATE TYPE "public"."payout_status" AS ENUM (
    'requested',
    'approved',
    'rejected',
    'paid',
    'failed'
);


ALTER TYPE "public"."payout_status" OWNER TO "postgres";


CREATE TYPE "public"."registration_status" AS ENUM (
    'pending',
    'approved',
    'rejected',
    'cancelled',
    'checked_in',
    'eliminated',
    'disqualified',
    'waitlist'
);


ALTER TYPE "public"."registration_status" OWNER TO "postgres";


CREATE TYPE "public"."registration_type" AS ENUM (
    'solo',
    'team'
);


ALTER TYPE "public"."registration_type" OWNER TO "postgres";


CREATE TYPE "public"."team_member_role" AS ENUM (
    'owner',
    'captain',
    'member'
);


ALTER TYPE "public"."team_member_role" OWNER TO "postgres";


CREATE TYPE "public"."tournament_format" AS ENUM (
    'single_elimination',
    'double_elimination',
    'round_robin',
    'swiss',
    'custom',
    'battle_royale'
);


ALTER TYPE "public"."tournament_format" OWNER TO "postgres";


CREATE TYPE "public"."tournament_status" AS ENUM (
    'draft',
    'open',
    'closed',
    'check_in',
    'ongoing',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."tournament_status" OWNER TO "postgres";


CREATE TYPE "public"."verification_status" AS ENUM (
    'unverified',
    'pending',
    'verified'
);


ALTER TYPE "public"."verification_status" OWNER TO "postgres";


CREATE TYPE "public"."wallet_owner" AS ENUM (
    'platform',
    'organizer',
    'team',
    'user'
);


ALTER TYPE "public"."wallet_owner" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_team_invite"("invite_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_team uuid;
  v_roster uuid;
  v_invited uuid;
  v_status text;
  v_size int;
  v_count int;
begin
  select team_id, roster_id, invited_user_id, status into v_team, v_roster, v_invited, v_status
  from public.team_invitations where id = invite_id for update;

  if not found then
    raise exception 'Invite not found';
  end if;
  if v_invited <> auth.uid() then
    raise exception 'Not your invite';
  end if;
  if v_status <> 'pending' then
    return;
  end if;

  -- Ensure team member
  insert into public.team_members (team_id, user_id, role, is_active)
  values (v_team, v_invited, 'member', true)
  on conflict (team_id, user_id) do nothing;

  -- Add to roster if specified, respecting 5v5 cap (7) else team_size
  if v_roster is not null then
    select team_size into v_size from public.team_rosters where id = v_roster;
    if v_size is null then v_size := 5; end if;
    select count(*) into v_count from public.team_roster_members where roster_id = v_roster;
    if (v_size = 5 and v_count < 7) or (v_size <> 5 and v_count < v_size) then
      insert into public.team_roster_members (roster_id, user_id) values (v_roster, v_invited)
      on conflict do nothing;
    end if;
  end if;

  update public.team_invitations set status = 'accepted', responded_at = now() where id = invite_id;
end;
$$;


ALTER FUNCTION "public"."accept_team_invite"("invite_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_suspend_user"("target_user_id" "uuid", "reason" "text", "duration" "text", "type" "text", "until_time" timestamp with time zone) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Verify caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND (is_admin = true OR role = 'admin')
  ) THEN
    RAISE EXCEPTION 'Not authorized to suspend users';
  END IF;

  -- Update target user
  UPDATE profiles
  SET 
    is_suspended = true,
    suspension_reason = reason,
    suspension_type = type,
    suspension_until = until_time,
    updated_at = NOW()
  WHERE id = target_user_id;
END;
$$;


ALTER FUNCTION "public"."admin_suspend_user"("target_user_id" "uuid", "reason" "text", "duration" "text", "type" "text", "until_time" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_unsuspend_user"("target_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Verify caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND (is_admin = true OR role = 'admin')
  ) THEN
    RAISE EXCEPTION 'Not authorized to unsuspend users';
  END IF;

  -- Update target user
  UPDATE profiles
  SET 
    is_suspended = false,
    suspension_reason = null,
    suspension_type = null,
    suspension_until = null,
    updated_at = NOW()
  WHERE id = target_user_id;
END;
$$;


ALTER FUNCTION "public"."admin_unsuspend_user"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."advance_match_v2"("p_match_id" "uuid", "p_winner_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_match RECORD;
    v_loser_id UUID;
    v_next_match_id UUID;
    v_loser_next_match_id UUID;
BEGIN
    -- Get current match details
    SELECT * INTO v_match
    FROM public.tournament_matches
    WHERE id = p_match_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Match not found';
    END IF;

    -- Determine the loser
    IF v_match.team1_id = p_winner_id THEN
        v_loser_id := v_match.team2_id;
    ELSIF v_match.team2_id = p_winner_id THEN
        v_loser_id := v_match.team1_id;
    ELSE
        RAISE EXCEPTION 'Winner ID does not match either team in the match';
    END IF;

    -- Update current match with winner
    UPDATE public.tournament_matches
    SET winner_id = p_winner_id,
        status = 'completed',
        updated_at = NOW()
    WHERE id = p_match_id;

    -- Get advancement targets
    v_next_match_id := v_match.next_match_id;
    v_loser_next_match_id := v_match.loser_next_match_id;

    -- Advance winner to next match (if exists)
    IF v_next_match_id IS NOT NULL THEN
        UPDATE public.tournament_matches
        SET team1_id = CASE 
            WHEN team1_id IS NULL THEN p_winner_id
            WHEN team2_id IS NULL THEN team1_id
            ELSE team1_id
        END,
        team2_id = CASE
            WHEN team1_id IS NULL THEN team2_id
            WHEN team2_id IS NULL THEN p_winner_id
            ELSE team2_id
        END,
        updated_at = NOW()
        WHERE id = v_next_match_id;
    END IF;

    -- Advance loser to losers bracket (if exists)
    IF v_loser_next_match_id IS NOT NULL AND v_loser_id IS NOT NULL THEN
        UPDATE public.tournament_matches
        SET team1_id = CASE 
            WHEN team1_id IS NULL THEN v_loser_id
            WHEN team2_id IS NULL THEN team1_id
            ELSE team1_id
        END,
        team2_id = CASE
            WHEN team1_id IS NULL THEN team2_id
            WHEN team2_id IS NULL THEN v_loser_id
            ELSE team2_id
        END,
        updated_at = NOW()
        WHERE id = v_loser_next_match_id;
    END IF;

END;
$$;


ALTER FUNCTION "public"."advance_match_v2"("p_match_id" "uuid", "p_winner_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."advance_match_v2"("p_match_id" "uuid", "p_winner_id" "uuid") IS 'Advances winner and loser to their respective next matches for Double Elimination brackets';



CREATE OR REPLACE FUNCTION "public"."advance_match_v2"("p_match_id" "uuid", "p_winner_id" "uuid", "p_team1_score" integer, "p_team2_score" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_match RECORD;
    v_loser_id UUID;
    v_next_match RECORD;
    v_loser_next_match RECORD;
BEGIN
    -- 1. Get current match details
    SELECT * INTO v_match FROM tournament_matches WHERE id = p_match_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Match not found';
    END IF;

    -- 2. Determine loser
    IF p_winner_id = v_match.team1_id THEN
        v_loser_id := v_match.team2_id;
    ELSIF p_winner_id = v_match.team2_id THEN
        v_loser_id := v_match.team1_id;
    ELSE
        RAISE EXCEPTION 'Winner ID must be one of the participants';
    END IF;

    -- 3. Update current match
    UPDATE tournament_matches
    SET 
        winner_id = p_winner_id,
        team1_score = p_team1_score,
        team2_score = p_team2_score,
        status = 'completed',
        updated_at = NOW()
    WHERE id = p_match_id;

    -- 4. Advance Winner
    IF v_match.next_match_id IS NOT NULL THEN
        SELECT * INTO v_next_match FROM tournament_matches WHERE id = v_match.next_match_id;
        
        -- Special handling for Grand Final Reset
        IF v_match.bracket_side = 'final' THEN
            -- Only advance to reset if the Losers Bracket team (team2) wins
            IF p_winner_id = v_match.team2_id THEN
                UPDATE tournament_matches 
                SET team1_id = v_match.team1_id,
                    team2_id = v_match.team2_id,
                    status = 'pending',
                    updated_at = NOW()
                WHERE id = v_match.next_match_id;
            ELSE
                -- WB team won, cancel the reset match
                UPDATE tournament_matches 
                SET status = 'cancelled',
                    updated_at = NOW()
                WHERE id = v_match.next_match_id;
            END IF;
        ELSE
            -- Standard advancement
            IF v_next_match.team1_id IS NULL THEN
                UPDATE tournament_matches SET team1_id = p_winner_id WHERE id = v_match.next_match_id;
            ELSIF v_next_match.team2_id IS NULL THEN
                UPDATE tournament_matches SET team2_id = p_winner_id WHERE id = v_match.next_match_id;
            ELSE
                -- If both slots are full, update the one that matches the winner if it was already there (re-reporting)
                UPDATE tournament_matches 
                SET team1_id = CASE WHEN team1_id = p_winner_id THEN p_winner_id ELSE team1_id END,
                    team2_id = CASE WHEN team2_id = p_winner_id THEN p_winner_id ELSE team2_id END
                WHERE id = v_match.next_match_id;
            END IF;
        END IF;
    END IF;

    -- 5. Advance Loser (Double Elimination)
    IF v_match.loser_next_match_id IS NOT NULL AND v_loser_id IS NOT NULL THEN
        SELECT * INTO v_loser_next_match FROM tournament_matches WHERE id = v_match.loser_next_match_id;
        
        IF v_loser_next_match.team1_id IS NULL THEN
            UPDATE tournament_matches SET team1_id = v_loser_id WHERE id = v_match.loser_next_match_id;
        ELSIF v_loser_next_match.team2_id IS NULL THEN
            UPDATE tournament_matches SET team2_id = v_loser_id WHERE id = v_match.loser_next_match_id;
        END IF;
    END IF;

END;
$$;


ALTER FUNCTION "public"."advance_match_v2"("p_match_id" "uuid", "p_winner_id" "uuid", "p_team1_score" integer, "p_team2_score" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."advance_teams_to_next_stage"("p_current_stage_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_tournament_id UUID;
    v_next_stage_id UUID;
    v_advancement_count INTEGER;
    v_advanced_count INTEGER := 0;
    v_team_id UUID;
BEGIN
    -- 1. Get current stage details
    SELECT tournament_id, advancement_count INTO v_tournament_id, v_advancement_count
    FROM tournament_stages
    WHERE id = p_current_stage_id;

    IF v_advancement_count IS NULL OR v_advancement_count <= 0 THEN
        RAISE EXCEPTION 'Advancement count not set for this stage';
    END IF;

    -- 2. Find next stage
    SELECT id INTO v_next_stage_id
    FROM tournament_stages
    WHERE tournament_id = v_tournament_id
    AND stage_order > (SELECT stage_order FROM tournament_stages WHERE id = p_current_stage_id)
    ORDER BY stage_order ASC
    LIMIT 1;

    IF v_next_stage_id IS NULL THEN
        RAISE EXCEPTION 'No next stage found';
    END IF;

    -- 3. Identify top N teams based on wins and round reached
    FOR v_team_id IN (
        WITH team_performance AS (
            SELECT 
                team_id,
                MAX(round) as max_round,
                COUNT(*) FILTER (WHERE winner_id = team_id) as wins,
                COUNT(*) FILTER (WHERE winner_id IS NOT NULL AND winner_id != team_id) as losses,
                SUM(CASE WHEN winner_id = team_id THEN 3 ELSE 0 END) as points -- Standard 3 points for win
            FROM (
                SELECT team1_id as team_id, round, winner_id FROM tournament_matches WHERE stage_id = p_current_stage_id AND team1_id IS NOT NULL
                UNION ALL
                SELECT team2_id as team_id, round, winner_id FROM tournament_matches WHERE stage_id = p_current_stage_id AND team2_id IS NOT NULL
            ) all_teams
            GROUP BY team_id
        )
        SELECT tp.team_id
        FROM team_performance tp
        ORDER BY tp.points DESC, tp.max_round DESC, tp.wins DESC
        LIMIT v_advancement_count
    ) LOOP
        -- 4. Enroll in next stage
        PERFORM public.enroll_team_in_stage(v_next_stage_id, v_team_id);
        v_advanced_count := v_advanced_count + 1;
    END LOOP;

    RETURN v_advanced_count;
END;
$$;


ALTER FUNCTION "public"."advance_teams_to_next_stage"("p_current_stage_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_verification_request"("request_id" "uuid", "admin_notes" "text" DEFAULT NULL::"text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    request_record RECORD;
    result JSON;
BEGIN
    -- Get the verification request
    SELECT * INTO request_record 
    FROM public.verification_requests 
    WHERE id = request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Verification request not found or not pending');
    END IF;
    
    -- Update the request status
    UPDATE public.verification_requests 
    SET 
        status = 'approved',
        reviewed_by = auth.uid(),
        reviewed_at = NOW(),
        verification_notes = admin_notes
    WHERE id = request_id;
    
    -- Add to verified_roles
    INSERT INTO public.verified_roles (user_id, role, verified_by, verification_request_id)
    VALUES (request_record.user_id, request_record.requested_role, auth.uid(), request_id);
    
    -- Update user profile
    UPDATE public.profiles 
    SET 
        role = request_record.requested_role,
        is_verified = true,
        verification_status = 'verified'
    WHERE id = request_record.user_id;
    
    result := json_build_object(
        'success', true,
        'message', 'Verification request approved successfully'
    );
    
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."approve_verification_request"("request_id" "uuid", "admin_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_teams_to_bracket"("p_stage_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_team_ids UUID[];
    v_match RECORD;
    v_team_idx INTEGER := 1;
    v_team_count INTEGER;
BEGIN
    -- Get all teams from stage_participants, ordered for seeding
    SELECT ARRAY_AGG(team_id ORDER BY seed NULLS LAST, team_id) INTO v_team_ids
    FROM stage_participants
    WHERE stage_id = p_stage_id AND team_id IS NOT NULL;
    
    IF v_team_ids IS NULL THEN
        RAISE NOTICE 'No teams in stage_participants for stage %', p_stage_id;
        RETURN;
    END IF;
    
    v_team_count := array_length(v_team_ids, 1);
    RAISE NOTICE 'Assigning % teams to bracket', v_team_count;
    
    -- Get all Round 1 Winners bracket matches ordered by match_number
    FOR v_match IN (
        SELECT id, match_number
        FROM tournament_matches
        WHERE stage_id = p_stage_id 
          AND round = 1 
          AND (bracket_side = 'winners' OR bracket_side IS NULL)
        ORDER BY match_number
    ) LOOP
        -- Assign team1 (top seed)
        IF v_team_idx <= v_team_count THEN
            UPDATE tournament_matches 
            SET team1_id = v_team_ids[v_team_idx]
            WHERE id = v_match.id;
            v_team_idx := v_team_idx + 1;
        END IF;
        
        -- Assign team2 (bottom seed - pair from opposite end)
        IF v_team_idx <= v_team_count THEN
            UPDATE tournament_matches 
            SET team2_id = v_team_ids[v_team_idx]
            WHERE id = v_match.id;
            v_team_idx := v_team_idx + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Assigned % teams to Round 1 matches', v_team_idx - 1;
END;
$$;


ALTER FUNCTION "public"."assign_teams_to_bracket"("p_stage_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_user_role"("p_user_id" "uuid", "p_role" "text", "p_assigned_by" "uuid" DEFAULT NULL::"uuid", "p_is_primary" boolean DEFAULT false) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  role_exists BOOLEAN;
BEGIN
  -- Check if user already has this role
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles 
    WHERE user_id = p_user_id AND role = p_role
  ) INTO role_exists;
  
  IF role_exists THEN
    -- Update existing role to active
    UPDATE public.user_roles 
    SET is_active = true, 
        assigned_by = p_assigned_by,
        assigned_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id AND role = p_role;
  ELSE
    -- Insert new role
    INSERT INTO public.user_roles (user_id, role, assigned_by, is_primary)
    VALUES (p_user_id, p_role, p_assigned_by, p_is_primary);
  END IF;
  
  -- If this is set as primary, unset other primary roles
  IF p_is_primary THEN
    UPDATE public.user_roles 
    SET is_primary = false, updated_at = NOW()
    WHERE user_id = p_user_id AND role != p_role;
  END IF;
  
  RETURN true;
END;
$$;


ALTER FUNCTION "public"."assign_user_role"("p_user_id" "uuid", "p_role" "text", "p_assigned_by" "uuid", "p_is_primary" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."block_organizer_sensitive_tournament_updates"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Allow service_role and admins to update anything
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RETURN NEW;
  END IF;

  -- Block organizers from updating these sensitive columns
  IF NEW.is_featured IS DISTINCT FROM OLD.is_featured THEN
    RAISE EXCEPTION 'Only admins can change is_featured';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND OLD.status = 'pending_approval' THEN
    RAISE EXCEPTION 'Only admins can approve tournaments';
  END IF;
  IF NEW.approved_by IS DISTINCT FROM OLD.approved_by THEN
    RAISE EXCEPTION 'Only admins can set approved_by';
  END IF;
  IF NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
    RAISE EXCEPTION 'Only admins can set approved_at';
  END IF;
  IF NEW.winner_id IS DISTINCT FROM OLD.winner_id THEN
    RAISE EXCEPTION 'Only admins can set winner_id';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."block_organizer_sensitive_tournament_updates"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."block_team_stats_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Allow service_role and admins to update anything
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RETURN NEW;
  END IF;

  -- Block everyone else from updating the stats column
  IF NEW.stats IS DISTINCT FROM OLD.stats THEN
    RAISE EXCEPTION 'Only the system can update team stats';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."block_team_stats_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."block_venue_booking_payment_spoofing"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Only the system can update booking status';
  END IF;
  IF NEW.payment_id IS DISTINCT FROM OLD.payment_id THEN
    RAISE EXCEPTION 'Only the system can update payment_id';
  END IF;
  IF NEW.total_amount IS DISTINCT FROM OLD.total_amount THEN
    RAISE EXCEPTION 'Only the system can update total_amount';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."block_venue_booking_payment_spoofing"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cascade_stage_bestof_to_vetos"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF NEW.best_of IS DISTINCT FROM OLD.best_of THEN
        UPDATE public.match_map_vetos 
        SET best_of = NEW.best_of
        WHERE stage_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."cascade_stage_bestof_to_vetos"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_soft_deletes"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  DELETE FROM public.tournaments
  WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '7 days';

  DELETE FROM public.teams
  WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '7 days';

  DELETE FROM public.venues
  WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '7 days';
    
  RAISE NOTICE 'Cleaned up soft-deleted records older than 7 days';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_soft_deletes"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_old_soft_deletes"() IS 'Permanently deletes tournaments, teams, and venues that have been soft-deleted for more than 7 days. Should be called by a scheduled job.';



CREATE OR REPLACE FUNCTION "public"."copy_storage_object"("src_bucket" "text", "src_name" "text", "dest_name" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    src_obj storage.objects%ROWTYPE;
BEGIN
    SELECT * INTO src_obj
    FROM storage.objects
    WHERE bucket_id = src_bucket AND name = src_name;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Object % not found in bucket %', src_name, src_bucket;
    END IF;

    INSERT INTO storage.objects (
        bucket_id, 
        name, 
        owner, 
        owner_id, 
        metadata, 
        version
    ) VALUES (
        src_bucket, 
        dest_name, 
        src_obj.owner, 
        src_obj.owner_id, 
        src_obj.metadata, 
        src_obj.version
    )
    ON CONFLICT DO NOTHING;

    DELETE FROM storage.objects
    WHERE bucket_id = src_bucket AND name = src_name;
END;
$$;


ALTER FUNCTION "public"."copy_storage_object"("src_bucket" "text", "src_name" "text", "dest_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_notification"("user_id" "uuid", "title" "text", "message" "text", "type" "public"."notification_type" DEFAULT 'info'::"public"."notification_type", "data" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO public.notifications (user_id, title, message, type, data)
    VALUES (user_id, title, message, type, data)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$;


ALTER FUNCTION "public"."create_notification"("user_id" "uuid", "title" "text", "message" "text", "type" "public"."notification_type", "data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_team_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select team_id
  from public.team_members
  where user_id = auth.uid()
    and is_active = true
$$;


ALTER FUNCTION "public"."current_user_team_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decline_team_invite"("invite_id" "uuid") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  update public.team_invitations
  set status = 'declined', responded_at = now()
  where id = invite_id and invited_user_id = auth.uid() and status = 'pending';
$$;


ALTER FUNCTION "public"."decline_team_invite"("invite_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_organization_safely"("p_org_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_active_count INT;
BEGIN
  -- Check for active tournaments
  SELECT COUNT(*) INTO v_active_count
  FROM tournaments
  WHERE organizer_id = (SELECT owner_id FROM organizations WHERE id = p_org_id)
  AND status IN ('open', 'ongoing', 'check_in');

  IF v_active_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cannot delete organization with active tournaments. Please complete or cancel them first.');
  END IF;

  -- Delete organization (Cascading deletes should handle children if configured, 
  -- otherwise we might need manual cleanup. Assuming FKs are set to CASCADE or we need to delete tournaments explicitly)
  
  -- Manual cleanup to be safe, assuming owner_id relates to auth.users or organizations table structure
  -- Note: existing code uses `organizations.owner_id` (User) -> `tournaments.organizer_id` (User).
  -- Wait, the organization entity might just be a profile.
  -- Let's check `tournaments` schema. `organizer_id` usually links to `auth.users` OR `organizations`.
  -- Code says: `from('tournaments').eq('organizer_id', user?.id)`
  -- So tournaments are linked to the USER, not the Organization ID directly?
  -- But `OrganizationSettings` fetches `organizations` by `owner_id`.
  -- If I delete the row in `organizations`, the user still exists.
  -- The user wants to delete "their organization account".
  -- This essentially means deleting the `organizations` row.
  
  DELETE FROM organizations WHERE id = p_org_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'Organization deleted successfully.');
END;
$$;


ALTER FUNCTION "public"."delete_organization_safely"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_roster_member_limits"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  sz int;
  current_count int;
  max_allowed int;
begin
  select team_size into sz from public.team_rosters where id = new.roster_id;
  if sz is null then
    raise exception 'Roster not found';
  end if;

  select count(*) into current_count from public.team_roster_members
  where roster_id = new.roster_id;

  max_allowed := case when sz = 5 then 7 else sz end;

  if current_count + 1 > max_allowed then
    raise exception 'Roster member limit exceeded (max %).', max_allowed;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."enforce_roster_member_limits"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enroll_team_in_stage"("p_stage_id" "uuid", "p_team_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Check if stage is locked
    IF EXISTS (SELECT 1 FROM tournament_stages WHERE id = p_stage_id AND is_locked = true) THEN
        RAISE EXCEPTION 'Stage is locked and cannot accept new enrollments';
    END IF;

    -- Check if already enrolled
    IF EXISTS (SELECT 1 FROM stage_participants WHERE stage_id = p_stage_id AND team_id = p_team_id) THEN
        RETURN;
    END IF;

    INSERT INTO stage_participants (stage_id, team_id)
    VALUES (p_stage_id, p_team_id);
END;
$$;


ALTER FUNCTION "public"."enroll_team_in_stage"("p_stage_id" "uuid", "p_team_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_wallet"("p_owner" "public"."wallet_owner", "p_owner_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE w_id UUID; BEGIN
  SELECT id INTO w_id FROM wallets WHERE owner_type=p_owner AND owner_id=p_owner_id;
  IF w_id IS NULL THEN
    INSERT INTO wallets(owner_type, owner_id) VALUES (p_owner, p_owner_id) RETURNING id INTO w_id;
  END IF;
  RETURN w_id;
END; $$;


ALTER FUNCTION "public"."ensure_wallet"("p_owner" "public"."wallet_owner", "p_owner_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."finalize_match_locked"("p_match_id" "uuid", "p_expected_version" integer, "p_winner_id" "uuid", "p_loser_id" "uuid", "p_team1_score" integer, "p_team2_score" integer) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_actual_version INTEGER;
    v_tournament_id UUID;
    v_is_authorized BOOLEAN;
BEGIN
    -- 1. Pessimistic Lock
    SELECT version, v.tournament_id INTO v_actual_version, v_tournament_id
    FROM public.brkt_matches m
    JOIN public.brkt_versions v ON m.version_id = v.id
    WHERE m.id = p_match_id
    FOR UPDATE;

    IF v_actual_version IS NULL THEN
        RETURN FALSE;
    END IF;

    -- 2. Version Check
    IF v_actual_version != p_expected_version THEN
        RAISE EXCEPTION 'Match version mismatch. Expected %, got %', p_expected_version, v_actual_version;
    END IF;

    -- 3. Authorization Check
    SELECT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND (p.is_admin = true OR p.role = 'admin')
    ) OR EXISTS (
        SELECT 1 FROM public.tournaments t
        WHERE t.id = v_tournament_id 
        AND (t.organizer_id = auth.uid() OR t.organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()))
    ) INTO v_is_authorized;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Unauthorized to finalize this match';
    END IF;

    -- 4. Atomic Score Update
    UPDATE public.brkt_matches
    SET 
        winner_id = p_winner_id,
        loser_id = p_loser_id,
        team1_score = p_team1_score,
        team2_score = p_team2_score,
        status = 'completed',
        version = version + 1,
        updated_at = now()
    WHERE id = p_match_id;

    -- 5. Instant Database-Side Progression
    PERFORM public.proc_internal_advance_match(p_match_id, p_winner_id, p_loser_id);

    -- 6. External Notify Event
    INSERT INTO public.match_completed_events (match_id, winner_id, loser_id, status)
    VALUES (p_match_id, p_winner_id, p_loser_id, 'processed');

    RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."finalize_match_locked"("p_match_id" "uuid", "p_expected_version" integer, "p_winner_id" "uuid", "p_loser_id" "uuid", "p_team1_score" integer, "p_team2_score" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fix_match_veto_state"("p_veto_id" "uuid", "p_team1_id" "uuid", "p_team2_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_veto_record record;
  v_is_authorized boolean;
BEGIN
  -- Fetch current veto state
  SELECT * INTO v_veto_record
  FROM public.valorant_match_map_vetos
  WHERE id = p_veto_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Veto not found';
  END IF;

  -- Security Check: Caller must be captain/owner of p_team1_id or p_team2_id OR organizer
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id IN (p_team1_id, p_team2_id)
    AND user_id = auth.uid()
    AND role IN ('captain', 'owner')
    AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM public.teams
    WHERE id IN (p_team1_id, p_team2_id)
    AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = v_veto_record.tournament_id
    AND t.organizer_id = auth.uid()
  ) INTO v_is_authorized;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Unauthorized to fix veto state';
  END IF;

  -- Update IDs
  UPDATE public.valorant_match_map_vetos
  SET 
    team1_id = p_team1_id,
    team2_id = p_team2_id,
    -- Fix current_team_id
    current_team_id = CASE 
      -- If it matches old Team 1, update to new Team 1
      WHEN current_team_id = v_veto_record.team1_id THEN p_team1_id
      -- If it matches old Team 2, update to new Team 2
      WHEN current_team_id = v_veto_record.team2_id THEN p_team2_id
      -- If status is pending, always reset to Team 1 (start of veto)
      WHEN status = 'pending' THEN p_team1_id
      -- If null, default to Team 1
      WHEN current_team_id IS NULL THEN p_team1_id
      -- Otherwise keep it (though if it was stale and didn't match above, it might still be broken)
      ELSE current_team_id 
    END,
    -- Fix current_action if status is pending and it's not 'ban'
    current_action = CASE
      WHEN status = 'pending' AND (current_action IS NULL OR current_action != 'ban') THEN 'ban'
      ELSE current_action
    END,
    -- Fix current_action_number if status is pending and it's not 1
    current_action_number = CASE
      WHEN status = 'pending' AND current_action_number != 1 THEN 1
      ELSE current_action_number
    END
  WHERE id = p_veto_id;
  
END;
$$;


ALTER FUNCTION "public"."fix_match_veto_state"("p_veto_id" "uuid", "p_team1_id" "uuid", "p_team2_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fix_match_veto_state"("p_veto_id" "uuid", "p_team1_id" "uuid", "p_team2_id" "uuid") IS 'Allows captains to correct stale team IDs in the veto record, bypassing RLS';



CREATE OR REPLACE FUNCTION "public"."fn_sync_tournament_organizer"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    IF NEW.organization_id IS NOT NULL THEN
        SELECT owner_id INTO NEW.organizer_id
        FROM public.organizations
        WHERE id = NEW.organization_id;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_sync_tournament_organizer"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."forfeit_match"("p_match_id" "uuid", "p_forfeiting_team_id" "uuid", "p_winning_team_id" "uuid", "p_reason" "text" DEFAULT 'Auto-Forfeit: Missed Check-in'::"text") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Update match status and winner
  UPDATE brkt_matches
  SET 
    status = 'completed',
    winner_id = p_winning_team_id,
    loser_id = p_forfeiting_team_id,
    end_time = NOW(),
    metadata = jsonb_set(COALESCE(metadata, '{}'), '{forfeit_reason}', to_jsonb(p_reason))
  WHERE id = p_match_id;
END;
$$;


ALTER FUNCTION "public"."forfeit_match"("p_match_id" "uuid", "p_forfeiting_team_id" "uuid", "p_winning_team_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."forfeit_match"("p_match_id" "uuid", "p_forfeiting_team_id" "uuid", "p_winning_team_id" "uuid", "p_reason" "text", "p_winner_score" integer, "p_loser_score" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_team1_id UUID;
    v_team2_id UUID;
BEGIN
    -- Get match details
    SELECT team1_id, team2_id INTO v_team1_id, v_team2_id
    FROM brkt_matches
    WHERE id = p_match_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Match not found';
    END IF;

    -- Update match
    UPDATE brkt_matches
    SET 
        status = 'completed',
        winner_id = p_winning_team_id,
        loser_id = p_forfeiting_team_id,
        team1_score = CASE WHEN team1_id = p_winning_team_id THEN p_winner_score ELSE p_loser_score END,
        team2_score = CASE WHEN team2_id = p_winning_team_id THEN p_winner_score ELSE p_loser_score END,
        result_notes = p_reason,
        updated_at = NOW()
    WHERE id = p_match_id;
    
    -- We intentionally do NOT update tournament_participants status here.
    -- This ensures the team is kept in the tournament (just with a loss).
END;
$$;


ALTER FUNCTION "public"."forfeit_match"("p_match_id" "uuid", "p_forfeiting_team_id" "uuid", "p_winning_team_id" "uuid", "p_reason" "text", "p_winner_score" integer, "p_loser_score" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_dummy_teams"("target_tournament_id" "uuid", "count" integer) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    i INT;
    new_team_id UUID;
BEGIN
    FOR i IN 1..count LOOP
        INSERT INTO teams (name, tag, game, owner_id)
        VALUES ('Test Team ' || i, 'TT' || i, 'Organization', 'f0835b7f-cf1c-4cca-8437-017f3448aa50')
        RETURNING id INTO new_team_id;

        INSERT INTO tournament_participants (tournament_id, team_id, status, participant_type)
        VALUES (target_tournament_id, new_team_id, 'checked_in', 'team');
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."generate_dummy_teams"("target_tournament_id" "uuid", "count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_profile_license_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- We only care about approved and active business roles (organizer or venue_owner)
  IF NEW.status = 'approved' AND NEW.is_active = true AND NEW.role IN ('organizer', 'venue_owner') THEN
    -- Check if the user already has a license_id
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.user_id AND license_id IS NOT NULL) THEN
      -- Automatically assign a new license ID
      UPDATE public.profiles
      SET license_id = gen_random_uuid()
      WHERE id = NEW.user_id AND license_id IS NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_profile_license_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_stage_bracket"("p_stage_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_tournament_id UUID;
    v_format TEXT;
    v_capacity INTEGER;
    v_num_rounds INTEGER;
    v_num_matches INTEGER;
    v_round INTEGER;
    v_match_num INTEGER;
    v_lb_rounds INTEGER;
    v_gf_id UUID;
BEGIN
    -- Get stage info
    SELECT tournament_id, format, capacity
    INTO v_tournament_id, v_format, v_capacity
    FROM tournament_stages
    WHERE id = p_stage_id;

    IF v_tournament_id IS NULL THEN
        RAISE EXCEPTION 'Stage not found: %', p_stage_id;
    END IF;

    IF v_format IS NULL OR v_format = '' THEN
        v_format := 'single_elimination';
    END IF;

    v_num_rounds := CEIL(LOG(2, GREATEST(v_capacity, 2)));

    DELETE FROM tournament_matches WHERE stage_id = p_stage_id;

    IF v_format = 'single_elimination' THEN
        FOR v_round IN 1..v_num_rounds LOOP
            v_num_matches := POWER(2, v_num_rounds - v_round)::INTEGER;
            FOR v_match_num IN 1..v_num_matches LOOP
                INSERT INTO tournament_matches (id, tournament_id, stage_id, round, match_number, status, bracket_side) 
                VALUES (gen_random_uuid(), v_tournament_id, p_stage_id, v_round, v_match_num, 'pending', 'winners');
            END LOOP;
        END LOOP;
        
    ELSIF v_format = 'double_elimination' THEN
        FOR v_round IN 1..v_num_rounds LOOP
            v_num_matches := POWER(2, v_num_rounds - v_round)::INTEGER;
            FOR v_match_num IN 1..v_num_matches LOOP
                INSERT INTO tournament_matches (id, tournament_id, stage_id, round, match_number, status, bracket_side) 
                VALUES (gen_random_uuid(), v_tournament_id, p_stage_id, v_round, v_match_num, 'pending', 'winners');
            END LOOP;
        END LOOP;
        
        v_lb_rounds := 2 * (v_num_rounds - 1);
        FOR v_round IN 1..v_lb_rounds LOOP
            IF v_round % 2 = 1 THEN
                v_num_matches := POWER(2, v_num_rounds - CEIL(v_round::FLOAT / 2) - 1)::INTEGER;
            ELSE
                v_num_matches := POWER(2, v_num_rounds - (v_round / 2) - 1)::INTEGER;
            END IF;
            v_num_matches := GREATEST(v_num_matches, 1);
            
            FOR v_match_num IN 1..v_num_matches LOOP
                INSERT INTO tournament_matches (id, tournament_id, stage_id, round, match_number, status, bracket_side) 
                VALUES (gen_random_uuid(), v_tournament_id, p_stage_id, v_round, v_match_num, 'pending', 'losers');
            END LOOP;
        END LOOP;
        
        v_gf_id := gen_random_uuid();
        INSERT INTO tournament_matches (id, tournament_id, stage_id, round, match_number, status, bracket_side) 
        VALUES (v_gf_id, v_tournament_id, p_stage_id, v_num_rounds + 1, 1, 'pending', 'final');
    ELSE
        RAISE EXCEPTION 'Unsupported format: %', v_format;
    END IF;

    -- Step 1: Seed teams from tournament_participants into stage_participants
    PERFORM public.seed_stage_from_registrations(p_stage_id);
    
    -- Step 2: Assign teams from stage_participants to Round 1 matches
    PERFORM public.assign_teams_to_bracket(p_stage_id);
END;
$$;


ALTER FUNCTION "public"."generate_stage_bracket"("p_stage_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_stage_bracket"("p_stage_id" "uuid") IS 'Generates bracket, seeds teams, and assigns them to Round 1 matches.';



CREATE OR REPLACE FUNCTION "public"."get_admin_dashboard_stats"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT json_build_object(
        'totalUsers', (SELECT count(*) FROM profiles),
        'activeVenues', (SELECT count(*) FROM venues),
        'activeTournaments', (SELECT count(*) FROM tournaments),
        'pendingVerifications', (SELECT count(*) FROM verification_requests WHERE status = 'pending'),
        'totalBookings', (SELECT count(*) FROM venue_bookings),
        'totalRevenue', (
            SELECT COALESCE(SUM(prize_pool), 0)
            FROM tournaments
            WHERE status != 'cancelled'
        ),
        'newUsersToday', (
            SELECT count(*)
            FROM profiles
            WHERE created_at >= NOW() - INTERVAL '24 hours'
        ),
        'pendingPartners', (SELECT count(*) FROM partner_applications WHERE status = 'pending')
    )::jsonb INTO result;

    RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_admin_dashboard_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_organizer_tournaments_with_counts"("p_organizer_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "game" "text", "start_date" timestamp with time zone, "end_date" timestamp with time zone, "venue_id" "uuid", "max_teams" integer, "prize_pool" numeric, "organizer_id" "uuid", "entry_fee" numeric, "is_public" boolean, "banner_url" "text", "logo_url" "text", "slug" "text", "description" "text", "deleted_at" timestamp with time zone, "current_participants" bigint, "status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  return query
  select 
    t.id,
    t.name,
    t.game,
    t.start_date,
    t.end_date,
    t.venue_id,
    t.max_teams,
    t.prize_pool,
    t.organizer_id,
    t.entry_fee,
    t.is_public,
    t.banner_url,
    t.logo_url,
    t.slug,
    t.description,
    t.deleted_at,
    (select count(*)::bigint from tournament_participants tp where tp.tournament_id = t.id) as current_participants,
    t.status::text
  from tournaments t
  where (
    t.organizer_id = p_organizer_id
    or exists (
      select 1 from tournament_staff ts 
      where ts.tournament_id = t.id 
      and ts.user_id = p_organizer_id
      and ts.status = 'active'
    )
  )
  and t.deleted_at is null
  order by t.start_date asc;
end;
$$;


ALTER FUNCTION "public"."get_organizer_tournaments_with_counts"("p_organizer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_roster_members"("r_id" "uuid") RETURNS TABLE("user_id" "uuid", "username" "text", "full_name" "text", "riot_tag" "text", "steam_tag" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with roster_members as (
    select m.user_id, p.username, p.full_name, p.riot_tag, p.steam_tag
    from public.team_roster_members m
    join public.profiles p on p.id = m.user_id
    where m.roster_id = r_id and (m.is_active is distinct from false)
  ),
  team_owner as (
    select t.owner_id as user_id, p.username, p.full_name, p.riot_tag, p.steam_tag
    from public.team_rosters r
    join public.teams t on t.id = r.team_id
    join public.profiles p on p.id = t.owner_id
    where r.id = r_id
      and not exists (
        select 1 from public.team_roster_members m
        where m.roster_id = r_id and m.user_id = t.owner_id and (m.is_active is distinct from false)
      )
  )
  select user_id, username, full_name, riot_tag, steam_tag from roster_members
  union
  select user_id, username, full_name, riot_tag, steam_tag from team_owner;
$$;


ALTER FUNCTION "public"."get_roster_members"("r_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_stage_best_of"("p_stage_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_best_of INTEGER;
BEGIN
    SELECT COALESCE(
        (config->>'bestOf')::int,
        (config->'veto'->>'best_of')::int,
        1
    ) INTO v_best_of
    FROM tournament_stages
    WHERE id = p_stage_id;
    
    RETURN COALESCE(v_best_of, 1);
END;
$$;


ALTER FUNCTION "public"."get_stage_best_of"("p_stage_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_stage_teams"("p_stage_id" "uuid") RETURNS TABLE("team_id" "uuid", "name" "text", "logo_url" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.name, t.logo_url
    FROM stage_participants sp
    JOIN teams t ON t.id = sp.team_id
    WHERE sp.stage_id = p_stage_id;
END;
$$;


ALTER FUNCTION "public"."get_stage_teams"("p_stage_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_team_members"("t_id" "uuid") RETURNS TABLE("user_id" "uuid", "username" "text", "email" "text", "avatar_url" "text", "card_image_url" "text", "role" "text", "joined_at" timestamp with time zone, "is_active" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  -- security check: only allow if caller is owner or member
  if exists (select 1 from public.teams t where t.id = t_id and t.owner_id = auth.uid())
     or exists (select 1 from public.team_members tm where tm.team_id = t_id and tm.user_id = auth.uid() and tm.is_active = true)
  then
    return query
      select 
        p.id as user_id, 
        p.username, 
        p.email, 
        p.avatar_url,
        p.card_image_url, 
        tm.role::text, 
        tm.joined_at, 
        tm.is_active
      from public.team_members tm
      join public.profiles p on p.id = tm.user_id
      where tm.team_id = t_id
        and tm.is_active = true;
  else
    -- Return empty set if not authorized
    return;
  end if;
end;
$$;


ALTER FUNCTION "public"."get_team_members"("t_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_team_roster"("t_id" "uuid") RETURNS TABLE("user_id" "uuid", "username" "text", "full_name" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select tm.user_id, p.username, p.full_name
  from public.team_members tm
  join public.profiles p on p.id = tm.user_id
  where tm.team_id = t_id and (tm.is_active is distinct from false);
$$;


ALTER FUNCTION "public"."get_team_roster"("t_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_tournament_participant_count"("t_id" "uuid") RETURNS integer
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select count(*)::int from public.tournament_participants where tournament_id = t_id;
$$;


ALTER FUNCTION "public"."get_tournament_participant_count"("t_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_tournament_registration_count"("tournament_uuid" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER 
        FROM public.tournament_participants 
        WHERE tournament_id = tournament_uuid 
        AND status IN ('pending', 'approved', 'checked_in')
    );
END;
$$;


ALTER FUNCTION "public"."get_tournament_registration_count"("tournament_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_permissions"("p_user_id" "uuid") RETURNS TABLE("permission" "text", "resource" "text", "action" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT rp.permission, rp.resource, rp.action
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON ur.role = rp.role
  WHERE ur.user_id = p_user_id 
    AND ur.is_active = true
  ORDER BY rp.resource, rp.action;
END;
$$;


ALTER FUNCTION "public"."get_user_permissions"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_roles"("p_user_id" "uuid") RETURNS TABLE("role" character varying, "is_active" boolean, "assigned_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT ur.role, ur.is_active, ur.assigned_at
    FROM public.user_roles ur
    WHERE ur.user_id = p_user_id AND ur.is_active = TRUE
    ORDER BY ur.assigned_at DESC;
$$;


ALTER FUNCTION "public"."get_user_roles"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_tournament_registrations"("user_uuid" "uuid") RETURNS TABLE("id" "uuid", "tournament_id" "uuid", "tournament_name" "text", "registration_type" "public"."registration_type", "status" "public"."registration_status", "registration_date" timestamp with time zone, "gamer_tag" "text", "team_name" "text")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tp.id,
        tp.tournament_id,
        t.name as tournament_name,
        tp.registration_type,
        tp.status,
        tp.registration_date,
        tp.gamer_tag,
        tp.team_name
    FROM public.tournament_participants tp
    JOIN public.tournaments t ON tp.tournament_id = t.id
    WHERE 
        (tp.registration_type = 'solo' AND tp.user_id = user_uuid) OR
        (tp.registration_type = 'team' AND tp.team_captain_id = user_uuid)
    ORDER BY tp.registration_date DESC;
END;
$$;


ALTER FUNCTION "public"."get_user_tournament_registrations"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_verification_request_basic"("request_id" "uuid") RETURNS TABLE("id" "uuid", "user_id" "uuid", "requested_role" "text", "status" "text", "created_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT 
    vr.id,
    vr.user_id,
    vr.requested_role,
    vr.status,
    vr.created_at
  FROM verification_requests vr
  WHERE vr.id = request_id;
$$;


ALTER FUNCTION "public"."get_verification_request_basic"("request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_verification_request_with_data"("request_id" "uuid") RETURNS TABLE("id" "uuid", "user_id" "uuid", "requested_role" "text", "status" "text", "first_name" "text", "last_name" "text", "business_name" "text", "business_type" "text", "contact_email" "text", "created_at" timestamp with time zone, "organizer_data" "jsonb", "venue_data" "jsonb", "venue_images" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  has_contact_email BOOLEAN;
BEGIN
  -- Check if contact_email column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'verification_requests' 
    AND column_name = 'contact_email'
  ) INTO has_contact_email;

  -- Return data based on what columns exist
  IF has_contact_email THEN
    RETURN QUERY
    SELECT 
      vr.id,
      vr.user_id,
      vr.requested_role,
      vr.status,
      vr.first_name,
      vr.last_name,
      vr.business_name,
      vr.business_type,
      vr.contact_email,
      vr.created_at,
      vr.organizer_data,
      vr.venue_data,
      vr.venue_images
    FROM verification_requests vr
    WHERE vr.id = request_id;
  ELSE
    RETURN QUERY
    SELECT 
      vr.id,
      vr.user_id,
      vr.requested_role,
      vr.status,
      vr.first_name,
      vr.last_name,
      vr.business_name,
      vr.business_type,
      ''::TEXT as contact_email,  -- Default empty string
      vr.created_at,
      vr.organizer_data,
      vr.venue_data,
      vr.venue_images
    FROM verification_requests vr
    WHERE vr.id = request_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_verification_request_with_data"("request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_verified_roles"("p_user_id" "uuid") RETURNS TABLE("role" character varying, "status" character varying, "verified_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT vr.role, vr.status, vr.verified_at
    FROM public.verified_roles vr
    WHERE vr.user_id = p_user_id AND vr.status = 'approved'
    ORDER BY vr.verified_at DESC;
$$;


ALTER FUNCTION "public"."get_verified_roles"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_sponsor_interaction"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    INSERT INTO public.daily_sponsor_stats (sponsor_id, stat_date, impressions, clicks)
    VALUES (
        NEW.sponsor_id, 
        CURRENT_DATE, 
        CASE WHEN NEW.event_type = 'impression' THEN 1 ELSE 0 END,
        CASE WHEN NEW.event_type = 'click' THEN 1 ELSE 0 END
    )
    ON CONFLICT (sponsor_id, stat_date)
    DO UPDATE SET
        impressions = daily_sponsor_stats.impressions + EXCLUDED.impressions,
        clicks = daily_sponsor_stats.clicks + EXCLUDED.clicks;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_sponsor_interaction"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    INSERT INTO public.profiles (id, username, full_name, email, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_admin_permission"("permission_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() 
        AND p.is_admin = true
        AND (
            'super_admin' = ANY(p.admin_roles) OR
            permission_name = ANY(p.admin_permissions)
        )
    );
END;
$$;


ALTER FUNCTION "public"."has_admin_permission"("permission_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_super_admin_role"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM admin_user_roles aur
    JOIN admin_roles ar ON ar.id = aur.role_id
    WHERE aur.user_id = auth.uid()
    AND lower(ar.name) = 'super_admin'
  );
END;
$$;


ALTER FUNCTION "public"."has_super_admin_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_verified_role"("role_name" "public"."app_role") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.verified_roles vr
        WHERE vr.user_id = auth.uid() 
        AND vr.role = role_name 
        AND vr.is_active = true
        AND (vr.expires_at IS NULL OR vr.expires_at > NOW())
    );
END;
$$;


ALTER FUNCTION "public"."has_verified_role"("role_name" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."initialize_match_veto"("p_match_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_veto_id uuid;
  v_match_record record;
  v_best_of integer;
BEGIN
  -- Get match details and stage best_of from column (not JSONB)
  SELECT 
    tm.tournament_id, 
    tm.team1_id, 
    tm.team2_id, 
    tm.stage_id,
    ts.best_of  -- Now reading from column
  INTO v_match_record
  FROM public.tournament_matches tm
  LEFT JOIN public.tournament_stages ts ON ts.id = tm.stage_id
  WHERE tm.id = p_match_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
  
  -- Use stage best_of column (trigger will sync it anyway, but be explicit)
  v_best_of := COALESCE(v_match_record.best_of, 1);
  
  -- Check if veto already exists
  SELECT id INTO v_veto_id
  FROM public.match_map_vetos
  WHERE match_id = p_match_id;
  
  IF FOUND THEN
    -- Update existing veto with stage_id (trigger will sync best_of)
    UPDATE public.match_map_vetos
    SET
      stage_id = v_match_record.stage_id,
      team1_link_token = COALESCE(team1_link_token, encode(gen_random_bytes(16), 'hex')),
      team2_link_token = COALESCE(team2_link_token, encode(gen_random_bytes(16), 'hex'))
    WHERE id = v_veto_id;
    
    RETURN v_veto_id;
  END IF;
  
  -- Create new veto with stage_id (trigger will auto-set best_of from stage)
  INSERT INTO public.match_map_vetos (
    match_id,
    tournament_id,
    stage_id,  -- New foreign key
    team1_id,
    team2_id,
    best_of,  -- Will be overwritten by trigger but set explicitly too
    status,
    current_team_id,
    current_action,
    current_action_number,
    turn_started_at,
    started_at,
    team1_link_token,
    team2_link_token
  ) VALUES (
    p_match_id,
    v_match_record.tournament_id,
    v_match_record.stage_id,  -- Set stage_id, trigger syncs best_of
    v_match_record.team1_id,
    v_match_record.team2_id,
    v_best_of,
    'in_progress',
    v_match_record.team1_id,
    'ban',
    1,
    NOW(),
    NOW(),
    encode(gen_random_bytes(16), 'hex'),
    encode(gen_random_bytes(16), 'hex')
  )
  RETURNING id INTO v_veto_id;
  
  RETURN v_veto_id;
END;
$$;


ALTER FUNCTION "public"."initialize_match_veto"("p_match_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."initialize_match_veto"("p_match_id" "uuid") IS 'Initialize a map veto. Uses stage_id with trigger-based best_of sync.';



CREATE OR REPLACE FUNCTION "public"."initialize_match_veto"("p_match_id" "uuid", "p_veto_format" "text" DEFAULT 'standard_7'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_veto_id uuid;
  v_match_record record;
  v_best_of integer;
BEGIN
  -- Derive best_of from format
  v_best_of := CASE 
    WHEN p_veto_format ILIKE '%bo1%' THEN 1
    WHEN p_veto_format ILIKE '%bo3%' THEN 3
    WHEN p_veto_format ILIKE '%bo5%' THEN 5
    WHEN p_veto_format = 'standard_7' THEN 1
    ELSE 1
  END;

  -- Get match details
  SELECT tournament_id, team1_id, team2_id
  INTO v_match_record
  FROM public.tournament_matches
  WHERE id = p_match_id;
  
  IF NOT FOUND THEN
    SELECT v.tournament_id, m.team1_id, m.team2_id
    INTO v_match_record
    FROM public.brkt_matches m
    JOIN public.brkt_versions v ON m.version_id = v.id
    WHERE m.id = p_match_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Match not found';
    END IF;
  END IF;
  
  -- Check existing
  SELECT id INTO v_veto_id
  FROM public.match_map_vetos
  WHERE match_id = p_match_id;
  
  IF FOUND THEN
    UPDATE public.match_map_vetos
    SET
      team1_link_token = COALESCE(team1_link_token, encode(gen_random_bytes(16), 'hex')),
      team2_link_token = COALESCE(team2_link_token, encode(gen_random_bytes(16), 'hex')),
      best_of = COALESCE(best_of, v_best_of)
    WHERE id = v_veto_id;
    
    RETURN v_veto_id;
  END IF;
  
  INSERT INTO public.match_map_vetos (
    match_id,
    tournament_id,
    team1_id,
    team2_id,
    veto_format,
    best_of,
    status,
    current_team_id,
    current_action,
    current_action_number,
    turn_started_at,
    started_at,
    team1_link_token,
    team2_link_token,
    team1_picked_maps,
    team2_picked_maps
  ) VALUES (
    p_match_id,
    v_match_record.tournament_id,
    v_match_record.team1_id,
    v_match_record.team2_id,
    p_veto_format,
    v_best_of,
    'in_progress', -- Start as in_progress if we have a default best_of
    v_match_record.team1_id,
    'ban',
    1,
    NOW(),
    NOW(),
    encode(gen_random_bytes(16), 'hex'),
    encode(gen_random_bytes(16), 'hex'),
    '[]'::jsonb,
    '[]'::jsonb
  )
  RETURNING id INTO v_veto_id;
  
  RETURN v_veto_id;
END;
$$;


ALTER FUNCTION "public"."initialize_match_veto"("p_match_id" "uuid", "p_veto_format" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND (is_admin = true OR role = 'admin')
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_user"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = p_user_id 
    AND is_admin = TRUE
  );
END;
$$;


ALTER FUNCTION "public"."is_admin_user"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_org_active_staff"("_organization_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.organization_staff
        WHERE organization_id = _organization_id
          AND user_id = auth.uid()
          AND status = 'active'
    );
END;
$$;


ALTER FUNCTION "public"."is_org_active_staff"("_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_org_admin"("_organization_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_staff
        WHERE organization_id = _organization_id
          AND user_id = auth.uid()
          AND role = 'admin'
          AND status = 'active'
    );
$$;


ALTER FUNCTION "public"."is_org_admin"("_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_org_staff_user"("_org_staff_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.organization_staff
        WHERE id = _org_staff_id
          AND user_id = auth.uid()
    );
END;
$$;


ALTER FUNCTION "public"."is_org_staff_user"("_org_staff_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_team_owner"("tid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.teams t
    where t.id = tid and t.owner_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_team_owner"("tid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_user_registered_for_tournament"("tournament_uuid" "uuid", "user_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.tournament_participants 
        WHERE tournament_id = tournament_uuid 
        AND (
            (registration_type = 'solo' AND user_id = user_uuid) OR
            (registration_type = 'team' AND team_captain_id = user_uuid)
        )
        AND status IN ('pending', 'approved', 'checked_in')
    );
END;
$$;


ALTER FUNCTION "public"."is_user_registered_for_tournament"("tournament_uuid" "uuid", "user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."proc_advance_bracket_match"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_version_id UUID;
    v_edge RECORD;
    v_update_field TEXT;
BEGIN
    -- Only process if status is 'pending' (default)
    IF NEW.status != 'pending' THEN
        RETURN NEW;
    END IF;

    -- 1. Get the match's version_id
    SELECT version_id INTO v_version_id
    FROM public.brkt_matches
    WHERE id = NEW.match_id;

    IF v_version_id IS NULL THEN
        UPDATE public.match_completed_events
        SET status = 'failed', error_message = 'Match not found'
        WHERE id = NEW.id;
        RETURN NEW;
    END IF;

    -- 2. Advance Winner
    FOR v_edge IN 
        SELECT target_match_id, target_slot 
        FROM public.brkt_advancements 
        WHERE version_id = v_version_id 
          AND source_match_id = NEW.match_id 
          AND type = 'winner'
    LOOP
        v_update_field := CASE WHEN v_edge.target_slot = 1 THEN 'team1_id' ELSE 'team2_id' END;
        
        UPDATE public.brkt_matches
        SET 
            -- Update the team
            team1_id = CASE WHEN v_edge.target_slot = 1 THEN NEW.winner_id ELSE team1_id END,
            team2_id = CASE WHEN v_edge.target_slot = 2 THEN NEW.winner_id ELSE team2_id END,
            -- Update overall version for optimistic locking
            version = version + 1
        WHERE id = v_edge.target_match_id;
    END LOOP;

    -- 3. Advance Loser
    FOR v_edge IN 
        SELECT target_match_id, target_slot 
        FROM public.brkt_advancements 
        WHERE version_id = v_version_id 
          AND source_match_id = NEW.match_id 
          AND type = 'loser'
    LOOP
        UPDATE public.brkt_matches
        SET 
            team1_id = CASE WHEN v_edge.target_slot = 1 THEN NEW.loser_id ELSE team1_id END,
            team2_id = CASE WHEN v_edge.target_slot = 2 THEN NEW.loser_id ELSE team2_id END,
            version = version + 1
        WHERE id = v_edge.target_match_id;
    END LOOP;

    -- 4. Mark as processed
    NEW.status := 'processed';
    NEW.processed_at := now();

    -- 5. Trigger cache rebuild notify (optional, but good practice)
    PERFORM pg_notify('bracket_update', json_build_object('version_id', v_version_id)::text);

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    NEW.status := 'failed';
    NEW.error_message := SQLERRM;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."proc_advance_bracket_match"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."proc_internal_advance_match"("p_source_match_id" "uuid", "p_winner_id" "uuid", "p_loser_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_version_id UUID;
    v_edge RECORD;
BEGIN
    SELECT version_id INTO v_version_id
    FROM public.brkt_matches
    WHERE id = p_source_match_id;

    IF v_version_id IS NULL THEN
        RAISE EXCEPTION 'Match % not found', p_source_match_id;
    END IF;

    -- Advance Winner
    IF p_winner_id IS NOT NULL THEN
        FOR v_edge IN 
            SELECT target_match_id, target_slot 
            FROM public.brkt_advancements 
            WHERE version_id = v_version_id 
              AND source_match_id = p_source_match_id 
              AND type = 'winner'
        LOOP
            UPDATE public.brkt_matches
            SET 
                team1_id = CASE WHEN v_edge.target_slot = 1 THEN p_winner_id ELSE team1_id END,
                team2_id = CASE WHEN v_edge.target_slot = 2 THEN p_winner_id ELSE team2_id END,
                version = version + 1 -- Increment version for target matches too
            WHERE id = v_edge.target_match_id;
        END LOOP;
    END IF;

    -- Advance Loser
    IF p_loser_id IS NOT NULL THEN
        FOR v_edge IN 
            SELECT target_match_id, target_slot 
            FROM public.brkt_advancements 
            WHERE version_id = v_version_id 
              AND source_match_id = p_source_match_id 
              AND type = 'loser'
        LOOP
            UPDATE public.brkt_matches
            SET 
                team1_id = CASE WHEN v_edge.target_slot = 1 THEN p_loser_id ELSE team1_id END,
                team2_id = CASE WHEN v_edge.target_slot = 2 THEN p_loser_id ELSE team2_id END,
                version = version + 1
            WHERE id = v_edge.target_match_id;
        END LOOP;
    END IF;

    INSERT INTO public.brkt_match_events (match_id, type, payload)
    VALUES (p_source_match_id, 'advancement_completed', jsonb_build_object(
        'winner_id', p_winner_id,
        'loser_id', p_loser_id,
        'timestamp', now()
    ));
END;
$$;


ALTER FUNCTION "public"."proc_internal_advance_match"("p_source_match_id" "uuid", "p_winner_id" "uuid", "p_loser_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_daily_sponsor_stats"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.daily_sponsor_stats (sponsor_id, stat_date, impressions, clicks)
  SELECT
    si.sponsor_id,
    si.created_at::date AS stat_date,
    COUNT(*) FILTER (WHERE si.event_type = 'impression') AS impressions,
    COUNT(*) FILTER (WHERE si.event_type = 'click') AS clicks
  FROM public.sponsor_impressions si
  WHERE si.created_at >= (now() - interval '2 days')
  GROUP BY si.sponsor_id, si.created_at::date
  ON CONFLICT (sponsor_id, stat_date)
  DO UPDATE SET
    impressions = EXCLUDED.impressions,
    clicks = EXCLUDED.clicks;
END;
$$;


ALTER FUNCTION "public"."refresh_daily_sponsor_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_verification_request"("request_id" "uuid", "rejection_reason" "text", "admin_notes" "text" DEFAULT NULL::"text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    result JSON;
BEGIN
    -- Update the request status
    UPDATE public.verification_requests 
    SET 
        status = 'rejected',
        reviewed_by = auth.uid(),
        reviewed_at = NOW(),
        rejection_reason = rejection_reason,
        verification_notes = admin_notes
    WHERE id = request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Verification request not found or not pending');
    END IF;
    
    result := json_build_object(
        'success', true,
        'message', 'Verification request rejected'
    );
    
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."reject_verification_request"("request_id" "uuid", "rejection_reason" "text", "admin_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_user_role"("p_user_id" "uuid", "p_role" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Don't allow removing the last role
  IF (SELECT COUNT(*) FROM public.user_roles WHERE user_id = p_user_id AND is_active = true) <= 1 THEN
    RAISE EXCEPTION 'Cannot remove the last active role from user';
  END IF;
  
  -- Deactivate the role
  UPDATE public.user_roles 
  SET is_active = false, updated_at = NOW()
  WHERE user_id = p_user_id AND role = p_role;
  
  -- If this was the primary role, set another role as primary
  IF (SELECT is_primary FROM public.user_roles WHERE user_id = p_user_id AND role = p_role) THEN
    UPDATE public.user_roles 
    SET is_primary = true, updated_at = NOW()
    WHERE user_id = p_user_id 
      AND is_active = true 
      AND role != p_role
    AND id = (
      SELECT id FROM public.user_roles 
      WHERE user_id = p_user_id 
        AND is_active = true 
        AND role != p_role 
      ORDER BY assigned_at ASC 
      LIMIT 1
    );
  END IF;
  
  RETURN true;
END;
$$;


ALTER FUNCTION "public"."remove_user_role"("p_user_id" "uuid", "p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reorder_tournament_stages"("p_stage_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    FOR i IN 1..array_length(p_stage_ids, 1) LOOP
        UPDATE tournament_stages
        SET stage_order = i,
            updated_at = NOW()
        WHERE id = p_stage_ids[i];
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."reorder_tournament_stages"("p_stage_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_match_veto"("p_match_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_veto_id uuid;
BEGIN
  SELECT id INTO v_veto_id
  FROM public.match_map_vetos
  WHERE match_id = p_match_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  DELETE FROM public.match_map_veto_actions
  WHERE veto_id = v_veto_id;
  
  UPDATE public.match_map_vetos
  SET
    status = 'pending',
    current_team_id = NULL, -- CLEAR IT to force BO dialog or auto-init
    current_action = NULL, -- CLEAR IT
    current_action_number = 1,
    team1_banned_maps = '{}',
    team2_banned_maps = '{}',
    team1_picked_maps = '[]'::jsonb,
    team2_picked_maps = '[]'::jsonb,
    selected_map_id = null,
    best_of = NULL, -- CLEAR IT to force re-selection
    turn_started_at = NULL,
    started_at = NULL,
    completed_at = null,
    updated_at = now()
  WHERE id = v_veto_id;
END;
$$;


ALTER FUNCTION "public"."reset_match_veto"("p_match_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reset_match_veto"("p_match_id" "uuid") IS 'Reset a Valorant map veto process to allow starting over';



CREATE OR REPLACE FUNCTION "public"."reset_tournament_bracket"("p_tournament_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_veto_ids uuid[];
BEGIN
  -- 1. Delete match results
  DELETE FROM public.tournament_match_results
  WHERE tournament_id = p_tournament_id;

  -- 2. Reset Vetos (logic from reset_tournament_vetos)
  -- Get all veto IDs for this tournament
  SELECT array_agg(id) INTO v_veto_ids
  FROM public.match_map_vetos
  WHERE tournament_id = p_tournament_id;

  IF v_veto_ids IS NOT NULL THEN
    -- Delete all actions for these vetos
    DELETE FROM public.match_map_veto_actions
    WHERE veto_id = ANY(v_veto_ids);

    -- Reset veto state (NOTE: best_of is NOT reset - it will be auto-updated by the UI)
    UPDATE public.match_map_vetos
    SET
      status = 'pending',
      current_team_id = null,
      current_action = null,
      current_action_number = 0,
      team1_banned_maps = '{}',
      team2_banned_maps = '{}',
      team1_picked_maps = '[]',
      team2_picked_maps = '[]',
      selected_map_id = null,
      -- best_of is intentionally NOT reset here
      turn_started_at = null,
      started_at = null,
      completed_at = null,
      updated_at = now()
    WHERE id = ANY(v_veto_ids);
  END IF;

  -- 3. Reset Seeded Matches (Winners Bracket Round 1) - KEEP TEAMS
  -- We identify these by round=1 AND (bracket_side='winners' OR bracket_side IS NULL)
  UPDATE public.tournament_matches
  SET
    status = 'pending',
    team1_score = null,
    team2_score = null,
    winner_team_id = null,
    party_code = null,
    updated_at = now()
  WHERE tournament_id = p_tournament_id 
    AND round = 1 
    AND (bracket_side = 'winners' OR bracket_side IS NULL);

  -- 4. Reset Dependent Matches (Lower Bracket Round 1, and ALL other rounds) - CLEAR TEAMS
  -- This includes:
  -- - Round 1 of Losers Bracket
  -- - Round > 1 of Winners Bracket
  -- - Round > 1 of Losers Bracket
  -- - Finals, Reset, etc.
  UPDATE public.tournament_matches
  SET
    status = 'pending',
    team1_score = null,
    team2_score = null,
    winner_team_id = null,
    team1_id = null,
    team2_id = null,
    party_code = null,
    updated_at = now()
  WHERE tournament_id = p_tournament_id 
    AND NOT (round = 1 AND (bracket_side = 'winners' OR bracket_side IS NULL));

END;
$$;


ALTER FUNCTION "public"."reset_tournament_bracket"("p_tournament_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reset_tournament_bracket"("p_tournament_id" "uuid") IS 'Completely resets a tournament bracket. Preserves teams ONLY for Winners Bracket Round 1. Clears teams for Lower Bracket Round 1 and all other matches.';



CREATE OR REPLACE FUNCTION "public"."reset_tournament_vetos"("p_tournament_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_veto_ids uuid[];
BEGIN
  -- Get all veto IDs for this tournament
  SELECT array_agg(id) INTO v_veto_ids
  FROM public.valorant_match_map_vetos
  WHERE tournament_id = p_tournament_id;

  IF v_veto_ids IS NULL THEN
    RETURN;
  END IF;

  -- Delete all actions for these vetos
  DELETE FROM public.valorant_match_map_veto_actions
  WHERE veto_id = ANY(v_veto_ids);

  -- Reset veto state
  UPDATE public.valorant_match_map_vetos
  SET
    status = 'pending',
    current_team_id = null,
    current_action = null,
    current_action_number = 0,
    team1_banned_maps = '{}',
    team2_banned_maps = '{}',
    team1_picked_maps = '{}',
    team2_picked_maps = '{}',
    selected_map_id = null,
    best_of = null,
    selected_map_pool = null,
    turn_started_at = null,
    started_at = null,
    completed_at = null,
    updated_at = now()
  WHERE id = ANY(v_veto_ids);
END;
$$;


ALTER FUNCTION "public"."reset_tournament_vetos"("p_tournament_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reset_tournament_vetos"("p_tournament_id" "uuid") IS 'Reset all map vetos for a tournament to allow starting over (batch operation)';



CREATE OR REPLACE FUNCTION "public"."rollup_daily_sponsor_stats"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.daily_sponsor_stats (sponsor_id, stat_date, impressions, clicks, unique_impressions)
  SELECT
    si.sponsor_id,
    DATE(si.created_at) AS stat_date,
    COUNT(*) FILTER (WHERE si.event_type = 'impression') AS impressions,
    COUNT(*) FILTER (WHERE si.event_type = 'click') AS clicks,
    COUNT(DISTINCT si.visitor_id) FILTER (WHERE si.event_type = 'impression') AS unique_impressions
  FROM public.sponsor_impressions si
  WHERE si.sponsor_id IS NOT NULL
  GROUP BY si.sponsor_id, DATE(si.created_at)
  ON CONFLICT (sponsor_id, stat_date)
  DO UPDATE SET
    impressions     = EXCLUDED.impressions,
    clicks          = EXCLUDED.clicks,
    unique_impressions = EXCLUDED.unique_impressions;
END;
$$;


ALTER FUNCTION "public"."rollup_daily_sponsor_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seed_stage_from_registrations"("p_stage_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_tournament_id UUID;
    v_team_id UUID;
    v_count INTEGER := 0;
BEGIN
    SELECT tournament_id INTO v_tournament_id FROM tournament_stages WHERE id = p_stage_id;
    IF v_tournament_id IS NULL THEN RAISE EXCEPTION 'Stage not found'; END IF;

    FOR v_team_id IN (
        SELECT team_id FROM tournament_participants 
        WHERE tournament_id = v_tournament_id 
        AND status IN ('approved', 'checked_in') -- Allow both approved and checked_in
        AND team_id IS NOT NULL
    ) LOOP
        IF NOT EXISTS (SELECT 1 FROM stage_participants WHERE stage_id = p_stage_id AND team_id = v_team_id) THEN
            INSERT INTO stage_participants (stage_id, team_id) VALUES (p_stage_id, v_team_id);
            v_count := v_count + 1;
        END IF;
    END LOOP;
    RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."seed_stage_from_registrations"("p_stage_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_stage1_initial_capacity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- When Stage 1 is created, set capacity from tournament's max_teams
    IF NEW.stage_order = 1 AND NEW.capacity IS NULL THEN
        SELECT max_teams INTO NEW.capacity
        FROM tournaments
        WHERE id = NEW.tournament_id;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_stage1_initial_capacity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."suspend_user"("p_user_id" "uuid", "p_reason" "text", "p_duration_days" integer DEFAULT 7) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_suspension_until TIMESTAMP;
BEGIN
    v_suspension_until := NOW() + (p_duration_days || ' days')::INTERVAL;
    
    UPDATE profiles 
    SET 
        is_suspended = true,
        suspension_reason = p_reason,
        suspension_until = v_suspension_until
    WHERE id = p_user_id;
    
    RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."suspend_user"("p_user_id" "uuid", "p_reason" "text", "p_duration_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_stage1_capacity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- When max_teams is updated on tournaments, update Stage 1 capacity
    IF TG_OP = 'UPDATE' AND OLD.max_teams IS DISTINCT FROM NEW.max_teams THEN
        UPDATE tournament_stages
        SET capacity = NEW.max_teams
        WHERE tournament_id = NEW.id
          AND stage_order = 1;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_stage1_capacity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_veto_bestof_from_stage"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Get best_of from stage and set it on the veto
    IF NEW.stage_id IS NOT NULL THEN
        SELECT best_of INTO NEW.best_of 
        FROM public.tournament_stages 
        WHERE id = NEW.stage_id;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_veto_bestof_from_stage"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_match_completed_webhook"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_url TEXT;
    v_secret TEXT;
    v_payload JSON;
    v_request_id BIGINT;
BEGIN
    SELECT value INTO v_url FROM decrypted_secrets WHERE name = 'WEBHOOK_URL_MATCH_COMPLETED';
    SELECT value INTO v_secret FROM decrypted_secrets WHERE name = 'WEBHOOK_SECRET_MATCH_COMPLETED';

    -- Build payload manually for net/http extension (assuming supabase-specific net package)
    v_payload := json_build_object(
        'type', 'INSERT',
        'table', TG_TABLE_NAME,
        'schema', TG_TABLE_SCHEMA,
        'record', row_to_json(NEW)
    );

    IF v_url IS NOT NULL THEN
        -- Fire and forget using pg_net extension deployed on Supabase
        SELECT net.http_post(
            url := v_url,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || v_secret
            ),
            body := v_payload::jsonb
        ) INTO v_request_id;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Do not fail the transaction if webhook fails to fire
        RAISE WARNING 'Webhook invocation failed: %', SQLERRM;
        RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_match_completed_webhook"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."undo_match_advancement"("p_match_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- 1. Authorization Check (Enterprise Grade)
    IF NOT public.is_admin() AND NOT EXISTS (
        SELECT 1 FROM public.tournaments t
        JOIN public.brkt_versions v ON t.id = v.tournament_id
        JOIN public.brkt_matches m ON v.id = m.version_id
        WHERE m.id = p_match_id
        AND (t.organizer_id = auth.uid() OR t.organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()))
    ) THEN
        RAISE EXCEPTION 'Unauthorized to undo advancement for this match';
    END IF;

    -- 2. Atomic Reversion (Slot-Aware & Robust)
    -- This handles any target match that received a team from the source match.
    -- We null out the specific slots and reset the status to pending.
    UPDATE public.brkt_matches target
    SET 
        team1_id = CASE 
            WHEN EXISTS (
                SELECT 1 FROM public.brkt_advancements a 
                WHERE a.source_match_id = p_match_id 
                  AND a.target_match_id = target.id 
                  AND a.target_slot = 1
            ) THEN NULL ELSE team1_id END,
        team2_id = CASE 
            WHEN EXISTS (
                SELECT 1 FROM public.brkt_advancements a 
                WHERE a.source_match_id = p_match_id 
                  AND a.target_match_id = target.id 
                  AND a.target_slot = 2
            ) THEN NULL ELSE team2_id END,
        status = 'pending',
        winner_id = NULL,
        loser_id = NULL,
        version = version + 1,
        updated_at = now()
    WHERE id IN (
        SELECT target_match_id 
        FROM public.brkt_advancements 
        WHERE source_match_id = p_match_id
    );

    -- 3. Log Audit Event
    INSERT INTO public.brkt_match_events (match_id, type, payload)
    VALUES (p_match_id, 'match_reset', jsonb_build_object(
        'timestamp', now(),
        'undone_by', auth.uid()
    ));

END;
$$;


ALTER FUNCTION "public"."undo_match_advancement"("p_match_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_cs2_map_scores_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_cs2_map_scores_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_match_draft_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_match_draft_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_organizations_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_organizations_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_tournament_registrations_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_tournament_registrations_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_permission"("p_user_id" "uuid", "p_permission" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = p_user_id 
      AND ur.is_active = true
      AND rp.permission = p_permission
  );
END;
$$;


ALTER FUNCTION "public"."user_has_permission"("p_user_id" "uuid", "p_permission" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_role"("p_user_id" "uuid", "p_role" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM public.user_roles 
    WHERE user_id = p_user_id 
      AND role = p_role 
      AND is_active = true
  );
END;
$$;


ALTER FUNCTION "public"."user_has_role"("p_user_id" "uuid", "p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_roster_name_match"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if new.roster_id is not null and new.roster_name is not null then
    if not exists (
      select 1 from public.team_rosters 
      where id = new.roster_id 
        and name = new.roster_name
    ) then
      raise exception 'roster_name does not match the roster_id';
    end if;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."validate_roster_name_match"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wallet_credit"("p_wallet" "uuid", "p_amount" bigint, "p_ref_type" "text", "p_ref_id" "uuid", "p_memo" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'amount must be > 0'; END IF;
  UPDATE wallets SET balance_cents = balance_cents + p_amount WHERE id=p_wallet;
  INSERT INTO ledger_entries(wallet_id, amount_cents, entry_type, reference_type, reference_id, memo)
  VALUES (p_wallet, p_amount, 'credit', p_ref_type, p_ref_id, p_memo);
  RETURN TRUE;
END; $$;


ALTER FUNCTION "public"."wallet_credit"("p_wallet" "uuid", "p_amount" bigint, "p_ref_type" "text", "p_ref_id" "uuid", "p_memo" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wallet_debit"("p_wallet" "uuid", "p_amount" bigint, "p_ref_type" "text", "p_ref_id" "uuid", "p_memo" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE bal BIGINT; BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'amount must be > 0'; END IF;
  SELECT balance_cents INTO bal FROM wallets WHERE id=p_wallet;
  IF bal IS NULL THEN RAISE EXCEPTION 'wallet not found'; END IF;
  IF bal < p_amount THEN RAISE EXCEPTION 'insufficient funds'; END IF;
  UPDATE wallets SET balance_cents = balance_cents - p_amount WHERE id=p_wallet;
  INSERT INTO ledger_entries(wallet_id, amount_cents, entry_type, reference_type, reference_id, memo)
  VALUES (p_wallet, p_amount, 'debit', p_ref_type, p_ref_id, p_memo);
  RETURN TRUE;
END; $$;


ALTER FUNCTION "public"."wallet_debit"("p_wallet" "uuid", "p_amount" bigint, "p_ref_type" "text", "p_ref_id" "uuid", "p_memo" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_permissions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "resource" "text" NOT NULL,
    "action" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_role_permissions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "role_id" "uuid" NOT NULL,
    "permission_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_roles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_user_roles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "assigned_by" "uuid",
    "assigned_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid",
    "admin_name" "text" DEFAULT ''::"text" NOT NULL,
    "action_type" "text" NOT NULL,
    "target_type" "text" NOT NULL,
    "target_id" "text" DEFAULT ''::"text" NOT NULL,
    "target_name" "text" DEFAULT ''::"text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "text",
    "user_agent" "text",
    "severity" "text" DEFAULT 'low'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brkt_advancements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "version_id" "uuid" NOT NULL,
    "source_match_id" "uuid" NOT NULL,
    "target_match_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "target_slot" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "brkt_advancements_target_slot_check" CHECK (("target_slot" = ANY (ARRAY[1, 2]))),
    CONSTRAINT "brkt_advancements_type_check" CHECK (("type" = ANY (ARRAY['winner'::"text", 'loser'::"text"])))
);


ALTER TABLE "public"."brkt_advancements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brkt_layout" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "version_id" "uuid" NOT NULL,
    "match_id" "uuid" NOT NULL,
    "x" integer NOT NULL,
    "y" integer NOT NULL
);


ALTER TABLE "public"."brkt_layout" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brkt_match_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "brkt_match_events_type_check" CHECK (("type" = ANY (ARRAY['participant_ready'::"text", 'score_reported'::"text", 'dispute_opened'::"text", 'match_finalized'::"text", 'match_reset'::"text", 'advancement_completed'::"text", 'walkover_awarded'::"text", 'manual_adjustment'::"text"])))
);


ALTER TABLE "public"."brkt_match_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brkt_match_games" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "game_number" integer NOT NULL,
    "map_id" "uuid",
    "riot_match_id" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "winner_id" "uuid",
    "loser_id" "uuid",
    "team1_score" integer DEFAULT 0,
    "team2_score" integer DEFAULT 0,
    "match_details" "jsonb",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "reported_by_team_id" "uuid",
    "verification_status" "text" DEFAULT 'pending'::"text",
    "dispute_reason" "text",
    "proposal_data" "jsonb",
    "mvp_id" "uuid",
    "map_name" "text",
    CONSTRAINT "brkt_match_games_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'completed'::"text"]))),
    CONSTRAINT "brkt_match_games_verification_status_check" CHECK (("verification_status" = ANY (ARRAY['pending'::"text", 'proposed'::"text", 'verified'::"text", 'disputed'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."brkt_match_games" OWNER TO "postgres";


COMMENT ON COLUMN "public"."brkt_match_games"."status" IS 'Status of the game: pending, completed, disputed, waiting_verification';



CREATE TABLE IF NOT EXISTS "public"."brkt_matches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "version_id" "uuid" NOT NULL,
    "round_index" integer NOT NULL,
    "match_number" integer NOT NULL,
    "bracket_type" "text" NOT NULL,
    "team1_id" "uuid",
    "team2_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "winner_id" "uuid",
    "loser_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "party_code" "text",
    "team1_score" integer DEFAULT 0,
    "team2_score" integer DEFAULT 0,
    "scheduled_time" timestamp with time zone,
    "best_of" integer DEFAULT 3,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "group_id" "text",
    "round_number" integer,
    "result_notes" "text",
    "check_in_reminder_sent" boolean DEFAULT false,
    "automated_report_status" "text" DEFAULT 'idle'::"text",
    "version" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "brkt_matches_automated_report_status_check" CHECK (("automated_report_status" = ANY (ARRAY['idle'::"text", 'processing'::"text", 'verified'::"text", 'failed'::"text", 'partial'::"text"]))),
    CONSTRAINT "brkt_matches_bracket_type_check" CHECK (("bracket_type" = ANY (ARRAY['winners'::"text", 'losers'::"text", 'final'::"text", 'group'::"text", 'swiss_round'::"text", 'battle_royale_round'::"text"]))),
    CONSTRAINT "brkt_matches_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'scheduled'::"text", 'in_progress'::"text", 'completed'::"text", 'disputed'::"text"])))
);


ALTER TABLE "public"."brkt_matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brkt_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "version_number" integer NOT NULL,
    "status" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "activated_at" timestamp with time zone,
    "stage_id" "uuid",
    "cached_ui_state" "jsonb",
    CONSTRAINT "brkt_versions_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'active'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."brkt_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_sponsor_stats" (
    "sponsor_id" "uuid",
    "stat_date" "date",
    "impressions" bigint,
    "clicks" bigint,
    "unique_impressions" bigint
);


ALTER TABLE "public"."daily_sponsor_stats" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."dispute_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "dispute_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "comment" "text" NOT NULL,
    "is_internal" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "attachment_url" "text"
);


ALTER TABLE "public"."dispute_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."game_maps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "game" "text" NOT NULL,
    "map_name" "text" NOT NULL,
    "map_image_url" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."game_maps" OWNER TO "postgres";


COMMENT ON TABLE "public"."game_maps" IS 'Available maps for each game';



CREATE TABLE IF NOT EXISTS "public"."match_checkins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "checked_in_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."match_checkins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."match_completed_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "winner_id" "uuid",
    "loser_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "processed_at" timestamp with time zone,
    "error_message" "text"
);


ALTER TABLE "public"."match_completed_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."match_map_veto_actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "veto_id" "uuid" NOT NULL,
    "match_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "action_type" "text" NOT NULL,
    "map_id" "uuid",
    "action_number" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "side" "text"
);


ALTER TABLE "public"."match_map_veto_actions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."match_map_vetos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "team1_id" "uuid",
    "team2_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text",
    "current_team_id" "uuid",
    "current_action" "text",
    "current_action_number" integer DEFAULT 0,
    "turn_started_at" timestamp with time zone,
    "turn_duration_seconds" integer DEFAULT 60,
    "team1_banned_maps" "text"[] DEFAULT '{}'::"text"[],
    "team2_banned_maps" "text"[] DEFAULT '{}'::"text"[],
    "selected_map_id" "uuid",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "team1_picked_maps" "jsonb" DEFAULT '[]'::"jsonb",
    "team2_picked_maps" "jsonb" DEFAULT '[]'::"jsonb",
    "team1_link_token" "text",
    "team2_link_token" "text",
    "selected_map_pool" "text"[],
    "best_of" integer DEFAULT 1,
    "stage_id" "uuid"
);


ALTER TABLE "public"."match_map_vetos" OWNER TO "postgres";


COMMENT ON COLUMN "public"."match_map_vetos"."stage_id" IS 'Reference to tournament_stages for best_of sync';



CREATE TABLE IF NOT EXISTS "public"."match_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "sender_name" "text",
    "team_id" "uuid",
    "content" "text" NOT NULL,
    "message_type" "text" DEFAULT 'text'::"text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."match_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."match_result_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "game_number" integer DEFAULT 1 NOT NULL,
    "reported_by" "uuid" NOT NULL,
    "reported_by_team_id" "uuid" NOT NULL,
    "riot_match_id" "text" NOT NULL,
    "map_id" "uuid",
    "map_name" "text",
    "team1_score" integer DEFAULT 0 NOT NULL,
    "team2_score" integer DEFAULT 0 NOT NULL,
    "winner_team_id" "uuid",
    "match_data" "jsonb",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "responded_by" "uuid",
    "responded_at" timestamp with time zone,
    "dispute_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "match_result_reports_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'disputed'::"text"])))
);


ALTER TABLE "public"."match_result_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."match_time_proposals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "proposed_by" "uuid" NOT NULL,
    "proposed_time" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "responded_at" timestamp with time zone
);


ALTER TABLE "public"."match_time_proposals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" "public"."notification_type" DEFAULT 'info'::"public"."notification_type",
    "is_read" boolean DEFAULT false,
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_albums" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."organization_albums" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_media" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "url" "text" NOT NULL,
    "type" "text" DEFAULT 'image'::"text" NOT NULL,
    "caption" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "album_id" "uuid"
);


ALTER TABLE "public"."organization_media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_staff" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'mod'::"text" NOT NULL,
    "permissions" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "assigned_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "accepted_at" timestamp with time zone,
    "responded_at" timestamp with time zone
);


ALTER TABLE "public"."organization_staff" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "logo_url" "text",
    "banner_url" "text",
    "description" "text",
    "social_links" "jsonb" DEFAULT '{}'::"jsonb",
    "is_verified" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."partner_applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_name" "text" NOT NULL,
    "company_website" "text" NOT NULL,
    "company_size" "text" NOT NULL,
    "industry" "text" NOT NULL,
    "contact_name" "text" NOT NULL,
    "contact_email" "text" NOT NULL,
    "contact_phone" "text",
    "contact_title" "text",
    "partnership_tier" "text" DEFAULT 'standard'::"text" NOT NULL,
    "partnership_goals" "text"[] DEFAULT '{}'::"text"[],
    "budget_range" "text",
    "message" "text",
    "how_heard" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "admin_notes" "text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "partner_applications_budget_range_check" CHECK (("budget_range" = ANY (ARRAY['under_1k'::"text", '1k_5k'::"text", '5k_15k'::"text", '15k_50k'::"text", '50k_plus'::"text", 'undecided'::"text"]))),
    CONSTRAINT "partner_applications_company_size_check" CHECK (("company_size" = ANY (ARRAY['startup'::"text", 'small'::"text", 'medium'::"text", 'large'::"text", 'enterprise'::"text"]))),
    CONSTRAINT "partner_applications_partnership_tier_check" CHECK (("partnership_tier" = ANY (ARRAY['radiant'::"text", 'ascendant'::"text", 'diamond'::"text", 'standard'::"text"]))),
    CONSTRAINT "partner_applications_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'reviewing'::"text", 'approved'::"text", 'rejected'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."partner_applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "avatar_url" "text",
    "bio" "text",
    "email" "text" NOT NULL,
    "role" "public"."app_role" DEFAULT 'casual'::"public"."app_role",
    "is_admin" boolean DEFAULT false,
    "admin_roles" "text"[] DEFAULT '{}'::"text"[],
    "admin_permissions" "text"[] DEFAULT '{}'::"text"[],
    "is_suspended" boolean DEFAULT false,
    "suspension_reason" "text",
    "suspension_until" timestamp with time zone,
    "is_verified" boolean DEFAULT false,
    "verification_status" "public"."verification_status" DEFAULT 'unverified'::"public"."verification_status",
    "social_links" "jsonb" DEFAULT '{}'::"jsonb",
    "last_login" timestamp with time zone,
    "email_verified" boolean DEFAULT false,
    "email_verification_token" "text",
    "password_reset_token" "text",
    "password_reset_expires" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "base_role" character varying(20) DEFAULT 'casual'::character varying,
    "card_image_url" "text",
    "slug" "text",
    "banner_url" "text",
    "date_of_birth" "date",
    "riot_tag" "text",
    "steam_tag" "text",
    "country_code" "text",
    "license_id" "uuid",
    "suspension_type" "text",
    CONSTRAINT "profiles_country_code_check" CHECK ((("country_code" IS NULL) OR (("length"("country_code") = 2) AND ("country_code" = "upper"("country_code")))))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reviewer_id" "uuid" NOT NULL,
    "reviewee_id" "uuid",
    "venue_id" "uuid",
    "tournament_id" "uuid",
    "rating" integer NOT NULL,
    "title" character varying(200),
    "comment" "text",
    "review_type" character varying(20) NOT NULL,
    "is_verified" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5))),
    CONSTRAINT "reviews_review_type_check" CHECK ((("review_type")::"text" = ANY (ARRAY[('user'::character varying)::"text", ('venue'::character varying)::"text", ('tournament'::character varying)::"text"])))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."riot_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "puuid" "text" NOT NULL,
    "game_name" "text" NOT NULL,
    "tag_line" "text" NOT NULL,
    "region" "text" DEFAULT 'asia'::"text",
    "access_token" "text",
    "refresh_token" "text",
    "token_expires_at" timestamp with time zone,
    "linked_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."riot_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sponsor_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "sponsor_id" "uuid",
    "role" "text" DEFAULT 'owner'::"text" NOT NULL,
    "invited_by" "uuid",
    "invited_at" timestamp with time zone DEFAULT "now"(),
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "onboarding_meta" "jsonb" DEFAULT '{"completed": false, "current_step": 0}'::"jsonb",
    CONSTRAINT "sponsor_accounts_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."sponsor_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sponsor_impressions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sponsor_id" "uuid",
    "event_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "page_url" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "visitor_id" "text",
    CONSTRAINT "sponsor_impressions_event_type_check" CHECK (("event_type" = ANY (ARRAY['impression'::"text", 'click'::"text"])))
);


ALTER TABLE "public"."sponsor_impressions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sponsors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "tagline" "text",
    "description" "text",
    "website_url" "text" NOT NULL,
    "logo_url" "text",
    "banner_image_url" "text",
    "accent_color" "text" DEFAULT '#8b5cf6'::"text",
    "tier" "text" DEFAULT 'standard'::"text",
    "placement" "text"[] DEFAULT '{banner}'::"text"[],
    "cta_text" "text" DEFAULT 'Learn More'::"text",
    "discount_text" "text",
    "is_active" boolean DEFAULT true,
    "priority" integer DEFAULT 0,
    "start_date" timestamp with time zone,
    "end_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "gallery_images" "text"[] DEFAULT '{}'::"text"[],
    "tier_features" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "sponsors_tier_check" CHECK (("tier" = ANY (ARRAY['radiant'::"text", 'ascendant'::"text", 'diamond'::"text", 'standard'::"text"])))
);


ALTER TABLE "public"."sponsors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "actor_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "target_type" "text",
    "target_id" "text",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."staff_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_tournament_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_staff_id" "uuid" NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "assigned_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."staff_tournament_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stage_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stage_id" "uuid" NOT NULL,
    "seed" integer,
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "team_id" "uuid" NOT NULL
);


ALTER TABLE "public"."stage_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_settings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "description" "text",
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."system_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "roster_id" "uuid",
    "invited_user_id" "uuid" NOT NULL,
    "invited_email" "text",
    "invited_by_user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "responded_at" timestamp with time zone,
    "invited_by" "uuid",
    "message" "text",
    CONSTRAINT "team_invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'declined'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."team_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_members" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."team_member_role" DEFAULT 'member'::"public"."team_member_role",
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."team_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_roster_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "roster_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_starter" boolean DEFAULT true
);


ALTER TABLE "public"."team_roster_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_rosters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "game" "text" NOT NULL,
    "format" "text",
    "team_size" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "team_rosters_team_size_check" CHECK ((("team_size" >= 1) AND ("team_size" <= 10)))
);


ALTER TABLE "public"."team_rosters" OWNER TO "postgres";


COMMENT ON TABLE "public"."team_rosters" IS 'Game-specific rosters: Each row represents one roster for a specific game within an organization. One roster per game per organization. These are the entities that compete in tournaments.';



CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "tag" "text" NOT NULL,
    "description" "text",
    "game" "text" NOT NULL,
    "games" "text"[] DEFAULT '{}'::"text"[],
    "game_format" "text" DEFAULT 'squad'::"text",
    "logo_url" "text",
    "banner_url" "text",
    "website_url" "text",
    "social_media" "jsonb" DEFAULT '{}'::"jsonb",
    "achievements" "jsonb" DEFAULT '{}'::"jsonb",
    "is_public" boolean DEFAULT true,
    "is_active" boolean DEFAULT true,
    "max_members" integer DEFAULT 5,
    "owner_id" "uuid" NOT NULL,
    "stats" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "country_code" "text",
    CONSTRAINT "teams_country_code_check" CHECK ((("country_code" IS NULL) OR (("length"("country_code") = 2) AND ("country_code" = "upper"("country_code")))))
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


COMMENT ON TABLE "public"."teams" IS 'Organizations/Teams: Each row represents one organization that can have multiple game-specific rosters.';



COMMENT ON COLUMN "public"."teams"."deleted_at" IS 'Timestamp when team was soft deleted. NULL means not deleted. Items can be restored within 7 days.';



CREATE TABLE IF NOT EXISTS "public"."tournament_announcements" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tournament_announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournament_bans" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "ban_reason" "text",
    "banned_by" "uuid",
    "banned_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "team_id" "uuid",
    "participant_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "tournament_bans_user_or_team" CHECK ((((("user_id" IS NOT NULL))::integer + (("team_id" IS NOT NULL))::integer) = 1))
);


ALTER TABLE "public"."tournament_bans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournament_disputes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_id" "uuid",
    "match_id" "uuid",
    "raised_by_user_id" "uuid" NOT NULL,
    "team_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "evidence_url" "text",
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "assigned_to_user_id" "uuid",
    "resolution_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "dispute_reason" "text"
);


ALTER TABLE "public"."tournament_disputes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournament_map_pools" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "map_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "game" "text",
    "map_name" "text"
);


ALTER TABLE "public"."tournament_map_pools" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournament_match_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "match_id" "uuid",
    "team_id" "uuid",
    "reporter_user_id" "uuid" NOT NULL,
    "image_url" "text",
    "comment" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tournament_match_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournament_participants" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "participant_type" "public"."registration_type" NOT NULL,
    "user_id" "uuid",
    "team_id" "uuid",
    "solo_contact_email" "text",
    "solo_contact_phone" "text",
    "team_name" "text",
    "team_captain_id" "uuid",
    "team_members" "jsonb" DEFAULT '[]'::"jsonb",
    "team_logo_url" "text",
    "team_contact_email" "text",
    "team_contact_phone" "text",
    "status" "public"."registration_status" DEFAULT 'pending'::"public"."registration_status",
    "entry_fee_paid" boolean DEFAULT false,
    "entry_fee_amount" numeric(10,2) DEFAULT 0,
    "payment_reference" "text",
    "verified_by" "uuid",
    "verified_at" timestamp with time zone,
    "verification_notes" "text",
    "rejection_reason" "text",
    "registration_date" timestamp with time zone DEFAULT "now"(),
    "check_in_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "roster_id" "uuid",
    "roster_name" "text",
    "checked_in_at" timestamp with time zone,
    "qualified_to_playoff" boolean DEFAULT false NOT NULL,
    "riot_tag" "text",
    "steam_tag" "text",
    CONSTRAINT "check_participant_type" CHECK (("participant_type" = ANY (ARRAY['solo'::"public"."registration_type", 'team'::"public"."registration_type"])))
);


ALTER TABLE "public"."tournament_participants" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tournament_participants"."team_id" IS 'The organization (team) that owns the roster. Kept for reference and organization-level queries.';



COMMENT ON COLUMN "public"."tournament_participants"."roster_id" IS 'The roster (game-specific team) that is registered for this tournament. This is the competing entity, not the organization (team_id).';



CREATE TABLE IF NOT EXISTS "public"."tournament_staff" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'mod'::"text" NOT NULL,
    "permissions" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "assigned_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "accepted_at" timestamp with time zone,
    "responded_at" timestamp with time zone,
    CONSTRAINT "tournament_staff_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'revoked'::"text", 'pending'::"text"])))
);


ALTER TABLE "public"."tournament_staff" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournament_stages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_id" "uuid",
    "name" "text" NOT NULL,
    "sequence_order" integer DEFAULT 1,
    "advancement_count" integer,
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "format" "text" DEFAULT 'single_elimination'::"text",
    "stage_order" integer DEFAULT 1,
    "capacity" integer,
    "is_locked" boolean DEFAULT false,
    "best_of" integer DEFAULT 1,
    "map_pool" "uuid"[] DEFAULT '{}'::"uuid"[],
    "veto_enabled" boolean DEFAULT true,
    "config" "jsonb",
    "scheduling_config" "jsonb" DEFAULT '{"round_deadline": null, "checkin_enabled": true, "self_play_enabled": false, "schedule_start_time": null, "checkin_window_minutes": 15, "match_interval_minutes": 75}'::"jsonb"
);


ALTER TABLE "public"."tournament_stages" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tournament_stages"."best_of" IS 'Best of format: 1, 3, or 5';



COMMENT ON COLUMN "public"."tournament_stages"."map_pool" IS 'Array of map UUIDs for this stage';



COMMENT ON COLUMN "public"."tournament_stages"."veto_enabled" IS 'Whether map veto is enabled for this stage';



CREATE TABLE IF NOT EXISTS "public"."tournaments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "slug" "text",
    "game" "text" NOT NULL,
    "max_teams" integer NOT NULL,
    "min_teams" integer DEFAULT 2,
    "entry_fee" numeric(10,2) DEFAULT 0,
    "prize_pool" numeric(10,2) DEFAULT 0,
    "prize_distribution" "jsonb" DEFAULT '[]'::"jsonb",
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone NOT NULL,
    "registration_deadline" timestamp with time zone NOT NULL,
    "check_in_time" timestamp with time zone,
    "status" "public"."tournament_status" DEFAULT 'draft'::"public"."tournament_status",
    "rules" "text",
    "requirements" "text",
    "age_restriction" "jsonb" DEFAULT '{}'::"jsonb",
    "skill_level" "text" DEFAULT 'all'::"text",
    "banner_url" "text",
    "logo_url" "text",
    "organizer_id" "uuid" NOT NULL,
    "venue_id" "uuid",
    "is_public" boolean DEFAULT true,
    "is_featured" boolean DEFAULT false,
    "allow_spectators" boolean DEFAULT true,
    "stream_url" "text",
    "stats" "jsonb" DEFAULT '{}'::"jsonb",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "rejection_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "check_in_required" boolean DEFAULT false NOT NULL,
    "check_in_deadline" timestamp with time zone,
    "auto_remove_unchecked" boolean DEFAULT true NOT NULL,
    "participant_cap" integer,
    "deleted_at" timestamp with time zone,
    "team_size" integer,
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "format" "text" DEFAULT 'Single Elimination'::"text",
    "rewards" "text",
    "winner_id" "uuid",
    "organization_id" "uuid",
    "check_in_reminder_sent" boolean DEFAULT false
);


ALTER TABLE "public"."tournaments" OWNER TO "postgres";


COMMENT ON TABLE "public"."tournaments" IS 'Tournament format is now stored per-stage in tournament_stages table';



COMMENT ON COLUMN "public"."tournaments"."deleted_at" IS 'Timestamp when tournament was soft deleted. NULL means not deleted. Items can be restored within 7 days.';



CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "is_primary" boolean DEFAULT false,
    "assigned_by" "uuid",
    "assigned_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_roles_role_check" CHECK (("role" = ANY (ARRAY['casual'::"text", 'organizer'::"text", 'venue_owner'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_role_summary" WITH ("security_invoker"='true') AS
 SELECT "p"."id" AS "user_id",
    "p"."username",
    "p"."full_name",
    "p"."email",
    "array_agg"("ur"."role" ORDER BY "ur"."is_primary" DESC, "ur"."assigned_at") AS "roles",
    "array_agg"("ur"."role" ORDER BY "ur"."is_primary" DESC, "ur"."assigned_at") FILTER (WHERE ("ur"."is_primary" = true)) AS "primary_roles",
    "count"("ur"."role") AS "total_roles"
   FROM ("public"."profiles" "p"
     LEFT JOIN "public"."user_roles" "ur" ON ((("p"."id" = "ur"."user_id") AND ("ur"."is_active" = true))))
  GROUP BY "p"."id", "p"."username", "p"."full_name", "p"."email";


ALTER TABLE "public"."user_role_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_tournament_details" AS
 SELECT "t"."id",
    "t"."name",
    "t"."description",
    "t"."slug",
    "t"."game",
    "t"."max_teams",
    "t"."min_teams",
    "t"."entry_fee",
    "t"."prize_pool",
    "t"."prize_distribution",
    "t"."start_date",
    "t"."end_date",
    "t"."registration_deadline",
    "t"."check_in_time",
    "t"."status",
    "t"."rules",
    "t"."requirements",
    "t"."age_restriction",
    "t"."skill_level",
    "t"."banner_url",
    "t"."logo_url",
    "t"."organizer_id",
    "t"."venue_id",
    "t"."is_public",
    "t"."is_featured",
    "t"."allow_spectators",
    "t"."stream_url",
    "t"."stats",
    "t"."approved_by",
    "t"."approved_at",
    "t"."rejection_reason",
    "t"."created_at",
    "t"."updated_at",
    "t"."check_in_required",
    "t"."check_in_deadline",
    "t"."auto_remove_unchecked",
    "t"."participant_cap",
    "t"."deleted_at",
    "t"."team_size",
    "t"."settings",
    "t"."format",
    "t"."rewards",
    "t"."winner_id",
    "t"."organization_id",
    "t"."check_in_reminder_sent",
    ("t"."venue_id" IS NULL) AS "is_online",
    "o"."name" AS "organization_name",
    "o"."slug" AS "organization_slug",
    "o"."logo_url" AS "organization_logo",
    "o"."owner_id" AS "organizer_owner_id",
    "p"."username" AS "organizer_username",
    "p"."avatar_url" AS "organizer_avatar",
    "tm"."name" AS "winner_team_name",
    ( SELECT "count"(*) AS "count"
           FROM "public"."tournament_participants" "tp"
          WHERE ("tp"."tournament_id" = "t"."id")) AS "participant_count"
   FROM ((("public"."tournaments" "t"
     LEFT JOIN "public"."organizations" "o" ON (("t"."organization_id" = "o"."id")))
     LEFT JOIN "public"."profiles" "p" ON (("o"."owner_id" = "p"."id")))
     LEFT JOIN "public"."teams" "tm" ON (("t"."winner_id" = "tm"."id")));


ALTER TABLE "public"."v_tournament_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."valorant_player_stats" (
    "user_id" "uuid" NOT NULL,
    "puuid" "text",
    "kd" "text",
    "win_rate" "text",
    "hs_percent" "text",
    "last_updated" timestamp with time zone DEFAULT "now"(),
    "latest_match_id" "text"
);


ALTER TABLE "public"."valorant_player_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."venue_availability" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "venue_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "available_stations" integer NOT NULL,
    "price_per_hour" numeric(8,2) NOT NULL,
    "is_available" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."venue_availability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."venue_bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "venue_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "booking_date" "date" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "duration_hours" numeric(3,1) NOT NULL,
    "stations_booked" integer DEFAULT 1 NOT NULL,
    "total_amount" numeric(10,2) NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "payment_id" "uuid",
    "special_requests" "text",
    "contact_phone" character varying(20),
    "contact_email" character varying(255),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "venue_bookings_status_check" CHECK ((("status")::"text" = ANY (ARRAY[('pending'::character varying)::"text", ('confirmed'::character varying)::"text", ('cancelled'::character varying)::"text", ('completed'::character varying)::"text", ('no_show'::character varying)::"text"])))
);


ALTER TABLE "public"."venue_bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."venue_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "venue_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "venue_reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."venue_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."venues" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "address" "text" NOT NULL,
    "city" "text" NOT NULL,
    "state" "text",
    "country" "text" NOT NULL,
    "postal_code" "text",
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "capacity" integer,
    "amenities" "text"[] DEFAULT '{}'::"text"[],
    "equipment" "text"[] DEFAULT '{}'::"text"[],
    "operating_hours" "jsonb" DEFAULT '{}'::"jsonb",
    "contact_phone" "text",
    "contact_email" "text",
    "website_url" "text",
    "social_media" "jsonb" DEFAULT '{}'::"jsonb",
    "images" "text"[] DEFAULT '{}'::"text"[],
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "owner_id" "uuid",
    "deleted_at" timestamp with time zone,
    "games" "text",
    "stations" integer,
    "hours" "text",
    "pc_specs" "jsonb" DEFAULT '{}'::"jsonb",
    "slug" "text",
    "card_image" "text"
);


ALTER TABLE "public"."venues" OWNER TO "postgres";


COMMENT ON COLUMN "public"."venues"."deleted_at" IS 'Timestamp when venue was soft deleted. NULL means not deleted. Items can be restored within 7 days.';



CREATE TABLE IF NOT EXISTS "public"."verification_requests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "requested_role" "public"."app_role" NOT NULL,
    "business_name" "text" NOT NULL,
    "business_type" "text" NOT NULL,
    "business_description" "text" NOT NULL,
    "experience_description" "text" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "date_of_birth" "date" NOT NULL,
    "website_url" "text",
    "social_media_links" "jsonb" DEFAULT '{}'::"jsonb",
    "cnic_front_url" "text" NOT NULL,
    "cnic_back_url" "text" NOT NULL,
    "additional_documents" "jsonb" DEFAULT '[]'::"jsonb",
    "status" "text" DEFAULT 'pending'::"text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "rejection_reason" "text",
    "verification_notes" "text",
    "admin_comments" "jsonb" DEFAULT '[]'::"jsonb",
    "submitted_at" timestamp with time zone DEFAULT "now"(),
    "last_updated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "organizer_data" "jsonb",
    "venue_data" "jsonb",
    "venue_images" "jsonb",
    "contact_email" character varying(255),
    CONSTRAINT "verification_requests_requested_role_check" CHECK (("requested_role" = ANY (ARRAY['organizer'::"public"."app_role", 'venue_owner'::"public"."app_role"]))),
    CONSTRAINT "verification_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'under_review'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."verification_requests" OWNER TO "postgres";


COMMENT ON COLUMN "public"."verification_requests"."organizer_data" IS 'JSONB field containing organizer-specific data like organization_type, years_experience, etc.';



COMMENT ON COLUMN "public"."verification_requests"."venue_data" IS 'JSONB field containing venue-specific data like total_pcs, amenities, games_available, etc.';



COMMENT ON COLUMN "public"."verification_requests"."venue_images" IS 'JSONB field containing paths to venue images like exterior, interior, gaming_area, additional photos';



CREATE TABLE IF NOT EXISTS "public"."verified_roles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "verified_at" timestamp with time zone DEFAULT "now"(),
    "verified_by" "uuid",
    "verification_request_id" "uuid",
    "expires_at" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "status" character varying(20) DEFAULT 'approved'::character varying,
    "reviewed_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "verified_roles_role_check" CHECK (("role" = ANY (ARRAY['organizer'::"public"."app_role", 'venue_owner'::"public"."app_role"]))),
    CONSTRAINT "verified_roles_status_check" CHECK ((("status")::"text" = ANY (ARRAY[('pending'::character varying)::"text", ('approved'::character varying)::"text", ('rejected'::character varying)::"text"])))
);


ALTER TABLE "public"."verified_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_permissions"
    ADD CONSTRAINT "admin_permissions_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."admin_permissions"
    ADD CONSTRAINT "admin_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_role_permissions"
    ADD CONSTRAINT "admin_role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_role_permissions"
    ADD CONSTRAINT "admin_role_permissions_role_id_permission_id_key" UNIQUE ("role_id", "permission_id");



ALTER TABLE ONLY "public"."admin_roles"
    ADD CONSTRAINT "admin_roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."admin_roles"
    ADD CONSTRAINT "admin_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_user_roles"
    ADD CONSTRAINT "admin_user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_user_roles"
    ADD CONSTRAINT "admin_user_roles_user_id_role_id_key" UNIQUE ("user_id", "role_id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brkt_advancements"
    ADD CONSTRAINT "brkt_advancements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brkt_advancements"
    ADD CONSTRAINT "brkt_advancements_source_match_id_type_key" UNIQUE ("source_match_id", "type");



ALTER TABLE ONLY "public"."brkt_advancements"
    ADD CONSTRAINT "brkt_advancements_target_match_id_target_slot_key" UNIQUE ("target_match_id", "target_slot");



ALTER TABLE ONLY "public"."brkt_layout"
    ADD CONSTRAINT "brkt_layout_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brkt_layout"
    ADD CONSTRAINT "brkt_layout_version_id_match_id_key" UNIQUE ("version_id", "match_id");



ALTER TABLE ONLY "public"."brkt_match_events"
    ADD CONSTRAINT "brkt_match_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brkt_match_games"
    ADD CONSTRAINT "brkt_match_games_match_id_game_number_key" UNIQUE ("match_id", "game_number");



ALTER TABLE ONLY "public"."brkt_match_games"
    ADD CONSTRAINT "brkt_match_games_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brkt_match_games"
    ADD CONSTRAINT "brkt_match_games_riot_match_id_key" UNIQUE ("riot_match_id");



ALTER TABLE ONLY "public"."brkt_matches"
    ADD CONSTRAINT "brkt_matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brkt_matches"
    ADD CONSTRAINT "brkt_matches_version_id_bracket_type_round_index_match_numb_key" UNIQUE ("version_id", "bracket_type", "round_index", "match_number");



ALTER TABLE ONLY "public"."brkt_versions"
    ADD CONSTRAINT "brkt_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brkt_versions"
    ADD CONSTRAINT "brkt_versions_tournament_id_version_number_key" UNIQUE ("tournament_id", "version_number");



ALTER TABLE ONLY "public"."dispute_comments"
    ADD CONSTRAINT "dispute_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."game_maps"
    ADD CONSTRAINT "game_maps_game_map_name_key" UNIQUE ("game", "map_name");



ALTER TABLE ONLY "public"."game_maps"
    ADD CONSTRAINT "game_maps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_checkins"
    ADD CONSTRAINT "match_checkins_match_id_team_id_key" UNIQUE ("match_id", "team_id");



ALTER TABLE ONLY "public"."match_checkins"
    ADD CONSTRAINT "match_checkins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_completed_events"
    ADD CONSTRAINT "match_completed_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_map_veto_actions"
    ADD CONSTRAINT "match_map_veto_actions_pkey1" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_map_vetos"
    ADD CONSTRAINT "match_map_vetos_match_id_unique" UNIQUE ("match_id");



ALTER TABLE ONLY "public"."match_map_vetos"
    ADD CONSTRAINT "match_map_vetos_pkey1" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_messages"
    ADD CONSTRAINT "match_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_result_reports"
    ADD CONSTRAINT "match_result_reports_match_id_game_number_riot_match_id_key" UNIQUE ("match_id", "game_number", "riot_match_id");



ALTER TABLE ONLY "public"."match_result_reports"
    ADD CONSTRAINT "match_result_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_time_proposals"
    ADD CONSTRAINT "match_time_proposals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_albums"
    ADD CONSTRAINT "organization_albums_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_media"
    ADD CONSTRAINT "organization_media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_staff"
    ADD CONSTRAINT "organization_staff_organization_id_user_id_key" UNIQUE ("organization_id", "user_id");



ALTER TABLE ONLY "public"."organization_staff"
    ADD CONSTRAINT "organization_staff_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_owner_id_key" UNIQUE ("owner_id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."partner_applications"
    ADD CONSTRAINT "partner_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_license_id_key" UNIQUE ("license_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."riot_accounts"
    ADD CONSTRAINT "riot_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."riot_accounts"
    ADD CONSTRAINT "riot_accounts_puuid_key" UNIQUE ("puuid");



ALTER TABLE ONLY "public"."sponsor_accounts"
    ADD CONSTRAINT "sponsor_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sponsor_accounts"
    ADD CONSTRAINT "sponsor_accounts_user_id_sponsor_id_key" UNIQUE ("user_id", "sponsor_id");



ALTER TABLE ONLY "public"."sponsor_impressions"
    ADD CONSTRAINT "sponsor_impressions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sponsors"
    ADD CONSTRAINT "sponsors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_audit_log"
    ADD CONSTRAINT "staff_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_tournament_assignments"
    ADD CONSTRAINT "staff_tournament_assignments_organization_staff_id_tourname_key" UNIQUE ("organization_staff_id", "tournament_id");



ALTER TABLE ONLY "public"."staff_tournament_assignments"
    ADD CONSTRAINT "staff_tournament_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stage_participants"
    ADD CONSTRAINT "stage_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_invitations"
    ADD CONSTRAINT "team_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_user_id_key" UNIQUE ("team_id", "user_id");



ALTER TABLE ONLY "public"."team_roster_members"
    ADD CONSTRAINT "team_roster_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_roster_members"
    ADD CONSTRAINT "team_roster_members_roster_id_user_id_key" UNIQUE ("roster_id", "user_id");



ALTER TABLE ONLY "public"."team_rosters"
    ADD CONSTRAINT "team_rosters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_tag_key" UNIQUE ("tag");



ALTER TABLE ONLY "public"."tournament_announcements"
    ADD CONSTRAINT "tournament_announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_bans"
    ADD CONSTRAINT "tournament_bans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_bans"
    ADD CONSTRAINT "tournament_bans_tournament_id_user_id_key" UNIQUE ("tournament_id", "user_id");



ALTER TABLE ONLY "public"."tournament_disputes"
    ADD CONSTRAINT "tournament_disputes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_map_pools"
    ADD CONSTRAINT "tournament_map_pools_pkey1" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_map_pools"
    ADD CONSTRAINT "tournament_map_pools_tournament_id_map_id_key1" UNIQUE ("tournament_id", "map_id");



ALTER TABLE ONLY "public"."tournament_match_results"
    ADD CONSTRAINT "tournament_match_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_participants"
    ADD CONSTRAINT "tournament_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_staff"
    ADD CONSTRAINT "tournament_staff_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_stages"
    ADD CONSTRAINT "tournament_stages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."riot_accounts"
    ADD CONSTRAINT "unique_user_riot" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_role_key" UNIQUE ("user_id", "role");



ALTER TABLE ONLY "public"."valorant_player_stats"
    ADD CONSTRAINT "valorant_player_stats_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."venue_availability"
    ADD CONSTRAINT "venue_availability_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."venue_availability"
    ADD CONSTRAINT "venue_availability_venue_id_date_start_time_end_time_key" UNIQUE ("venue_id", "date", "start_time", "end_time");



ALTER TABLE ONLY "public"."venue_bookings"
    ADD CONSTRAINT "venue_bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."venue_reviews"
    ADD CONSTRAINT "venue_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."venues"
    ADD CONSTRAINT "venues_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."venues"
    ADD CONSTRAINT "venues_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."verification_requests"
    ADD CONSTRAINT "verification_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."verified_roles"
    ADD CONSTRAINT "verified_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."verified_roles"
    ADD CONSTRAINT "verified_roles_user_role_key" UNIQUE ("user_id", "role");



CREATE INDEX "idx_audit_action" ON "public"."staff_audit_log" USING "btree" ("action");



CREATE INDEX "idx_audit_actor_id" ON "public"."staff_audit_log" USING "btree" ("actor_id");



CREATE INDEX "idx_audit_created" ON "public"."staff_audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_logs_action_type" ON "public"."audit_logs" USING "btree" ("action_type");



CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_logs_severity" ON "public"."audit_logs" USING "btree" ("severity");



CREATE INDEX "idx_audit_logs_target_type" ON "public"."audit_logs" USING "btree" ("target_type");



CREATE INDEX "idx_audit_org_id" ON "public"."staff_audit_log" USING "btree" ("organization_id");



CREATE INDEX "idx_brkt_advancements_source" ON "public"."brkt_advancements" USING "btree" ("source_match_id");



CREATE INDEX "idx_brkt_advancements_target" ON "public"."brkt_advancements" USING "btree" ("target_match_id");



CREATE INDEX "idx_brkt_advancements_version" ON "public"."brkt_advancements" USING "btree" ("version_id");



CREATE INDEX "idx_brkt_events_match" ON "public"."brkt_match_events" USING "btree" ("match_id");



CREATE INDEX "idx_brkt_match_games_match" ON "public"."brkt_match_games" USING "btree" ("match_id");



CREATE INDEX "idx_brkt_match_games_riot_id" ON "public"."brkt_match_games" USING "btree" ("riot_match_id");



CREATE INDEX "idx_brkt_match_games_status" ON "public"."brkt_match_games" USING "btree" ("verification_status");



CREATE INDEX "idx_brkt_matches_checkin_reminder" ON "public"."brkt_matches" USING "btree" ("check_in_reminder_sent", "status", "scheduled_time") WHERE (("check_in_reminder_sent" = false) AND ("status" = 'scheduled'::"text"));



CREATE INDEX "idx_brkt_matches_party_code" ON "public"."brkt_matches" USING "btree" ("party_code") WHERE ("party_code" IS NOT NULL);



CREATE INDEX "idx_brkt_matches_version" ON "public"."brkt_matches" USING "btree" ("version_id");



CREATE INDEX "idx_dc_attachment_url" ON "public"."dispute_comments" USING "btree" ("attachment_url") WHERE ("attachment_url" IS NOT NULL);



CREATE INDEX "idx_dc_created" ON "public"."dispute_comments" USING "btree" ("created_at");



CREATE INDEX "idx_dc_dispute" ON "public"."dispute_comments" USING "btree" ("dispute_id");



CREATE INDEX "idx_dc_user" ON "public"."dispute_comments" USING "btree" ("user_id");



CREATE INDEX "idx_game_maps_game" ON "public"."game_maps" USING "btree" ("game") WHERE ("is_active" = true);



CREATE INDEX "idx_match_result_reports_match" ON "public"."match_result_reports" USING "btree" ("match_id");



CREATE INDEX "idx_match_result_reports_status" ON "public"."match_result_reports" USING "btree" ("match_id", "status");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at");



CREATE INDEX "idx_notifications_is_read" ON "public"."notifications" USING "btree" ("is_read");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_org_staff_org_id" ON "public"."organization_staff" USING "btree" ("organization_id");



CREATE INDEX "idx_org_staff_status" ON "public"."organization_staff" USING "btree" ("status");



CREATE INDEX "idx_org_staff_user_id" ON "public"."organization_staff" USING "btree" ("user_id");



CREATE INDEX "idx_organizations_owner" ON "public"."organizations" USING "btree" ("owner_id");



CREATE INDEX "idx_organizations_slug" ON "public"."organizations" USING "btree" ("slug");



CREATE INDEX "idx_partner_applications_created" ON "public"."partner_applications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_partner_applications_status" ON "public"."partner_applications" USING "btree" ("status");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_profiles_is_admin" ON "public"."profiles" USING "btree" ("is_admin");



CREATE INDEX "idx_profiles_is_verified" ON "public"."profiles" USING "btree" ("is_verified");



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "idx_profiles_slug" ON "public"."profiles" USING "btree" ("slug");



CREATE INDEX "idx_profiles_username" ON "public"."profiles" USING "btree" ("username");



CREATE INDEX "idx_profiles_verification_status" ON "public"."profiles" USING "btree" ("verification_status");



CREATE INDEX "idx_riot_accounts_puuid" ON "public"."riot_accounts" USING "btree" ("puuid");



CREATE INDEX "idx_riot_accounts_user_id" ON "public"."riot_accounts" USING "btree" ("user_id");



CREATE INDEX "idx_sponsor_impressions_event_type" ON "public"."sponsor_impressions" USING "btree" ("event_type");



CREATE INDEX "idx_sponsor_impressions_lookup" ON "public"."sponsor_impressions" USING "btree" ("sponsor_id", "event_type", "created_at");



CREATE INDEX "idx_sponsor_impressions_sponsor_id" ON "public"."sponsor_impressions" USING "btree" ("sponsor_id");



CREATE INDEX "idx_sponsor_impressions_visitor_id" ON "public"."sponsor_impressions" USING "btree" ("visitor_id", "created_at");



CREATE INDEX "idx_sponsors_active" ON "public"."sponsors" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_sta_staff_id" ON "public"."staff_tournament_assignments" USING "btree" ("organization_staff_id");



CREATE INDEX "idx_sta_tourn_id" ON "public"."staff_tournament_assignments" USING "btree" ("tournament_id");



CREATE INDEX "idx_td_dispute_reason" ON "public"."tournament_disputes" USING "btree" ("dispute_reason") WHERE ("dispute_reason" IS NOT NULL);



CREATE INDEX "idx_td_raised_by" ON "public"."tournament_disputes" USING "btree" ("raised_by_user_id");



CREATE INDEX "idx_td_tournament" ON "public"."tournament_disputes" USING "btree" ("tournament_id");



CREATE INDEX "idx_team_members_active" ON "public"."team_members" USING "btree" ("team_id", "is_active");



CREATE INDEX "idx_team_members_team_id" ON "public"."team_members" USING "btree" ("team_id");



CREATE UNIQUE INDEX "idx_team_members_unique_active" ON "public"."team_members" USING "btree" ("team_id", "user_id") WHERE ("is_active" = true);



CREATE INDEX "idx_team_members_user_id" ON "public"."team_members" USING "btree" ("user_id");



CREATE INDEX "idx_team_rosters_game" ON "public"."team_rosters" USING "btree" ("game");



CREATE UNIQUE INDEX "idx_team_rosters_team_game_unique" ON "public"."team_rosters" USING "btree" ("team_id", "game");



CREATE INDEX "idx_team_rosters_team_id" ON "public"."team_rosters" USING "btree" ("team_id");



CREATE INDEX "idx_teams_deleted_at" ON "public"."teams" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NOT NULL);



CREATE INDEX "idx_teams_game" ON "public"."teams" USING "btree" ("game");



CREATE INDEX "idx_teams_is_active" ON "public"."teams" USING "btree" ("is_active");



CREATE INDEX "idx_teams_owner_id" ON "public"."teams" USING "btree" ("owner_id");



CREATE INDEX "idx_teams_tag" ON "public"."teams" USING "btree" ("tag");



CREATE INDEX "idx_tmr_reporter" ON "public"."tournament_match_results" USING "btree" ("reporter_user_id");



CREATE INDEX "idx_tmr_tournament" ON "public"."tournament_match_results" USING "btree" ("tournament_id");



CREATE INDEX "idx_tournament_announcements_created_at" ON "public"."tournament_announcements" USING "btree" ("created_at");



CREATE INDEX "idx_tournament_announcements_tournament_id" ON "public"."tournament_announcements" USING "btree" ("tournament_id");



CREATE INDEX "idx_tournament_bans_active" ON "public"."tournament_bans" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_tournament_bans_team" ON "public"."tournament_bans" USING "btree" ("team_id") WHERE ("team_id" IS NOT NULL);



CREATE INDEX "idx_tournament_bans_tournament_id" ON "public"."tournament_bans" USING "btree" ("tournament_id");



CREATE INDEX "idx_tournament_bans_user" ON "public"."tournament_bans" USING "btree" ("user_id") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_tournament_bans_user_id" ON "public"."tournament_bans" USING "btree" ("user_id");



CREATE INDEX "idx_tournament_participants_checkin" ON "public"."tournament_participants" USING "btree" ("tournament_id", "status", "checked_in_at");



CREATE INDEX "idx_tournament_participants_qualified" ON "public"."tournament_participants" USING "btree" ("tournament_id", "qualified_to_playoff");



CREATE INDEX "idx_tournament_participants_registration_date" ON "public"."tournament_participants" USING "btree" ("registration_date");



CREATE INDEX "idx_tournament_participants_roster_id" ON "public"."tournament_participants" USING "btree" ("roster_id") WHERE ("roster_id" IS NOT NULL);



CREATE INDEX "idx_tournament_participants_status" ON "public"."tournament_participants" USING "btree" ("status");



CREATE INDEX "idx_tournament_participants_team_captain_id" ON "public"."tournament_participants" USING "btree" ("team_captain_id");



CREATE INDEX "idx_tournament_participants_team_id" ON "public"."tournament_participants" USING "btree" ("team_id");



CREATE INDEX "idx_tournament_participants_tournament_id" ON "public"."tournament_participants" USING "btree" ("tournament_id");



CREATE INDEX "idx_tournament_participants_type" ON "public"."tournament_participants" USING "btree" ("participant_type");



CREATE INDEX "idx_tournament_participants_user_id" ON "public"."tournament_participants" USING "btree" ("user_id");



CREATE INDEX "idx_tournament_stages_tournament_id" ON "public"."tournament_stages" USING "btree" ("tournament_id");



CREATE INDEX "idx_tournaments_checkin_reminder" ON "public"."tournaments" USING "btree" ("check_in_reminder_sent", "check_in_required", "start_date") WHERE (("check_in_reminder_sent" = false) AND ("check_in_required" = true));



CREATE INDEX "idx_tournaments_deleted_at" ON "public"."tournaments" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NOT NULL);



CREATE INDEX "idx_tournaments_game" ON "public"."tournaments" USING "btree" ("game");



CREATE INDEX "idx_tournaments_is_public" ON "public"."tournaments" USING "btree" ("is_public");



CREATE INDEX "idx_tournaments_organization" ON "public"."tournaments" USING "btree" ("organization_id");



CREATE INDEX "idx_tournaments_organizer_id" ON "public"."tournaments" USING "btree" ("organizer_id");



CREATE INDEX "idx_tournaments_slug" ON "public"."tournaments" USING "btree" ("slug");



CREATE INDEX "idx_tournaments_start_date" ON "public"."tournaments" USING "btree" ("start_date");



CREATE INDEX "idx_tournaments_status" ON "public"."tournaments" USING "btree" ("status");



CREATE INDEX "idx_tournaments_venue_id" ON "public"."tournaments" USING "btree" ("venue_id");



CREATE INDEX "idx_user_roles_active" ON "public"."user_roles" USING "btree" ("user_id", "is_active");



CREATE INDEX "idx_user_roles_primary" ON "public"."user_roles" USING "btree" ("user_id", "is_primary") WHERE ("is_primary" = true);



CREATE INDEX "idx_user_roles_role" ON "public"."user_roles" USING "btree" ("role");



CREATE INDEX "idx_user_roles_user_id" ON "public"."user_roles" USING "btree" ("user_id");



CREATE INDEX "idx_user_roles_user_role" ON "public"."user_roles" USING "btree" ("user_id", "role");



CREATE INDEX "idx_venue_availability_venue_date" ON "public"."venue_availability" USING "btree" ("venue_id", "date");



CREATE INDEX "idx_venue_bookings_date" ON "public"."venue_bookings" USING "btree" ("booking_date");



CREATE INDEX "idx_venue_bookings_user_id" ON "public"."venue_bookings" USING "btree" ("user_id");



CREATE INDEX "idx_venue_bookings_venue_id" ON "public"."venue_bookings" USING "btree" ("venue_id");



CREATE INDEX "idx_venues_city" ON "public"."venues" USING "btree" ("city");



CREATE INDEX "idx_venues_deleted_at" ON "public"."venues" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NOT NULL);



CREATE INDEX "idx_venues_is_active" ON "public"."venues" USING "btree" ("is_active");



CREATE INDEX "idx_venues_location" ON "public"."venues" USING "btree" ("latitude", "longitude");



CREATE INDEX "idx_verification_requests_organizer_data" ON "public"."verification_requests" USING "gin" ("organizer_data");



CREATE INDEX "idx_verification_requests_requested_role" ON "public"."verification_requests" USING "btree" ("requested_role");



CREATE INDEX "idx_verification_requests_status" ON "public"."verification_requests" USING "btree" ("status");



CREATE INDEX "idx_verification_requests_submitted_at" ON "public"."verification_requests" USING "btree" ("submitted_at");



CREATE UNIQUE INDEX "idx_verification_requests_unique_pending" ON "public"."verification_requests" USING "btree" ("user_id", "requested_role") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_verification_requests_user_id" ON "public"."verification_requests" USING "btree" ("user_id");



CREATE INDEX "idx_verification_requests_venue_data" ON "public"."verification_requests" USING "gin" ("venue_data");



CREATE INDEX "idx_verified_roles_active" ON "public"."verified_roles" USING "btree" ("user_id", "role") WHERE ("is_active" = true);



CREATE INDEX "idx_verified_roles_role" ON "public"."verified_roles" USING "btree" ("role");



CREATE INDEX "idx_verified_roles_status" ON "public"."verified_roles" USING "btree" ("user_id", "status");



CREATE UNIQUE INDEX "idx_verified_roles_unique_active" ON "public"."verified_roles" USING "btree" ("user_id", "role") WHERE ("is_active" = true);



CREATE INDEX "idx_verified_roles_user_id" ON "public"."verified_roles" USING "btree" ("user_id");



CREATE INDEX "idx_verified_roles_user_role" ON "public"."verified_roles" USING "btree" ("user_id", "role");



CREATE INDEX "tournament_staff_tournament_idx" ON "public"."tournament_staff" USING "btree" ("tournament_id");



CREATE UNIQUE INDEX "tournament_staff_unique_member" ON "public"."tournament_staff" USING "btree" ("tournament_id", "user_id");



CREATE INDEX "tournament_staff_user_idx" ON "public"."tournament_staff" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "on_business_role_approved" AFTER INSERT OR UPDATE ON "public"."verified_roles" FOR EACH ROW EXECUTE FUNCTION "public"."generate_profile_license_id"();



CREATE OR REPLACE TRIGGER "on_sponsor_interaction" AFTER INSERT ON "public"."sponsor_impressions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_sponsor_interaction"();



CREATE OR REPLACE TRIGGER "organizations_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."update_organizations_updated_at"();



CREATE OR REPLACE TRIGGER "set_tournament_stages_updated_at" BEFORE UPDATE ON "public"."tournament_stages" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "tr_sync_tournament_organizer" BEFORE INSERT OR UPDATE OF "organization_id" ON "public"."tournaments" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sync_tournament_organizer"();



CREATE OR REPLACE TRIGGER "trg_block_organizer_tournament_updates" BEFORE UPDATE ON "public"."tournaments" FOR EACH ROW EXECUTE FUNCTION "public"."block_organizer_sensitive_tournament_updates"();



CREATE OR REPLACE TRIGGER "trg_block_team_stats_update" BEFORE UPDATE ON "public"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."block_team_stats_update"();



CREATE OR REPLACE TRIGGER "trg_block_venue_booking_payment_spoofing" BEFORE UPDATE ON "public"."venue_bookings" FOR EACH ROW EXECUTE FUNCTION "public"."block_venue_booking_payment_spoofing"();



CREATE OR REPLACE TRIGGER "trg_cascade_stage_bestof" AFTER UPDATE ON "public"."tournament_stages" FOR EACH ROW EXECUTE FUNCTION "public"."cascade_stage_bestof_to_vetos"();



CREATE OR REPLACE TRIGGER "trg_enforce_roster_member_limits" BEFORE INSERT ON "public"."team_roster_members" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_roster_member_limits"();



CREATE OR REPLACE TRIGGER "trg_sync_veto_bestof" BEFORE INSERT OR UPDATE OF "stage_id" ON "public"."match_map_vetos" FOR EACH ROW EXECUTE FUNCTION "public"."sync_veto_bestof_from_stage"();



CREATE OR REPLACE TRIGGER "trg_tournament_staff_updated_at" BEFORE UPDATE ON "public"."tournament_staff" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_advance_bracket_db" BEFORE INSERT ON "public"."match_completed_events" FOR EACH ROW EXECUTE FUNCTION "public"."proc_advance_bracket_match"();



CREATE OR REPLACE TRIGGER "trigger_match_completed_events" AFTER INSERT ON "public"."match_completed_events" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_match_completed_webhook"();



CREATE OR REPLACE TRIGGER "trigger_set_stage1_capacity" BEFORE INSERT ON "public"."tournament_stages" FOR EACH ROW EXECUTE FUNCTION "public"."set_stage1_initial_capacity"();



CREATE OR REPLACE TRIGGER "trigger_sync_stage1_capacity" AFTER UPDATE ON "public"."tournaments" FOR EACH ROW EXECUTE FUNCTION "public"."sync_stage1_capacity"();



CREATE OR REPLACE TRIGGER "trigger_validate_roster_name" BEFORE INSERT OR UPDATE ON "public"."tournament_participants" FOR EACH ROW EXECUTE FUNCTION "public"."validate_roster_name_match"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_teams_updated_at" BEFORE UPDATE ON "public"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tournament_bans_updated_at" BEFORE UPDATE ON "public"."tournament_bans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tournament_participants_updated_at" BEFORE UPDATE ON "public"."tournament_participants" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tournaments_updated_at" BEFORE UPDATE ON "public"."tournaments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_venue_bookings_updated_at" BEFORE UPDATE ON "public"."venue_bookings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_venues_updated_at" BEFORE UPDATE ON "public"."venues" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_verification_requests_updated_at" BEFORE UPDATE ON "public"."verification_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."admin_role_permissions"
    ADD CONSTRAINT "admin_role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."admin_permissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_role_permissions"
    ADD CONSTRAINT "admin_role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."admin_roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_user_roles"
    ADD CONSTRAINT "admin_user_roles_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."admin_user_roles"
    ADD CONSTRAINT "admin_user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."admin_roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_user_roles"
    ADD CONSTRAINT "admin_user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."brkt_advancements"
    ADD CONSTRAINT "brkt_advancements_source_match_id_fkey" FOREIGN KEY ("source_match_id") REFERENCES "public"."brkt_matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brkt_advancements"
    ADD CONSTRAINT "brkt_advancements_target_match_id_fkey" FOREIGN KEY ("target_match_id") REFERENCES "public"."brkt_matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brkt_advancements"
    ADD CONSTRAINT "brkt_advancements_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "public"."brkt_versions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brkt_layout"
    ADD CONSTRAINT "brkt_layout_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."brkt_matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brkt_layout"
    ADD CONSTRAINT "brkt_layout_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "public"."brkt_versions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brkt_match_events"
    ADD CONSTRAINT "brkt_match_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."brkt_match_events"
    ADD CONSTRAINT "brkt_match_events_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."brkt_matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brkt_match_games"
    ADD CONSTRAINT "brkt_match_games_loser_id_fkey" FOREIGN KEY ("loser_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."brkt_match_games"
    ADD CONSTRAINT "brkt_match_games_map_id_fkey" FOREIGN KEY ("map_id") REFERENCES "public"."game_maps"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."brkt_match_games"
    ADD CONSTRAINT "brkt_match_games_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."brkt_matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brkt_match_games"
    ADD CONSTRAINT "brkt_match_games_mvp_id_fkey" FOREIGN KEY ("mvp_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."brkt_match_games"
    ADD CONSTRAINT "brkt_match_games_reported_by_team_id_fkey" FOREIGN KEY ("reported_by_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."brkt_match_games"
    ADD CONSTRAINT "brkt_match_games_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."brkt_matches"
    ADD CONSTRAINT "brkt_matches_loser_id_fkey" FOREIGN KEY ("loser_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."brkt_matches"
    ADD CONSTRAINT "brkt_matches_team1_id_fkey" FOREIGN KEY ("team1_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."brkt_matches"
    ADD CONSTRAINT "brkt_matches_team2_id_fkey" FOREIGN KEY ("team2_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."brkt_matches"
    ADD CONSTRAINT "brkt_matches_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "public"."brkt_versions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brkt_matches"
    ADD CONSTRAINT "brkt_matches_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."brkt_versions"
    ADD CONSTRAINT "brkt_versions_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "public"."tournament_stages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brkt_versions"
    ADD CONSTRAINT "brkt_versions_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dispute_comments"
    ADD CONSTRAINT "dispute_comments_dispute_id_fkey" FOREIGN KEY ("dispute_id") REFERENCES "public"."tournament_disputes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dispute_comments"
    ADD CONSTRAINT "dispute_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_checkins"
    ADD CONSTRAINT "match_checkins_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."brkt_matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_checkins"
    ADD CONSTRAINT "match_checkins_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_checkins"
    ADD CONSTRAINT "match_checkins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."match_completed_events"
    ADD CONSTRAINT "match_completed_events_loser_id_fkey" FOREIGN KEY ("loser_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."match_completed_events"
    ADD CONSTRAINT "match_completed_events_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."brkt_matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_completed_events"
    ADD CONSTRAINT "match_completed_events_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."match_map_veto_actions"
    ADD CONSTRAINT "match_map_veto_actions_map_id_fkey1" FOREIGN KEY ("map_id") REFERENCES "public"."game_maps"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."match_map_veto_actions"
    ADD CONSTRAINT "match_map_veto_actions_match_id_fkey1" FOREIGN KEY ("match_id") REFERENCES "public"."brkt_matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_map_veto_actions"
    ADD CONSTRAINT "match_map_veto_actions_team_id_fkey1" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_map_veto_actions"
    ADD CONSTRAINT "match_map_veto_actions_veto_id_fkey" FOREIGN KEY ("veto_id") REFERENCES "public"."match_map_vetos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_map_vetos"
    ADD CONSTRAINT "match_map_vetos_current_team_id_fkey1" FOREIGN KEY ("current_team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."match_map_vetos"
    ADD CONSTRAINT "match_map_vetos_match_id_fkey_new" FOREIGN KEY ("match_id") REFERENCES "public"."brkt_matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_map_vetos"
    ADD CONSTRAINT "match_map_vetos_selected_map_id_fkey1" FOREIGN KEY ("selected_map_id") REFERENCES "public"."game_maps"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."match_map_vetos"
    ADD CONSTRAINT "match_map_vetos_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "public"."tournament_stages"("id");



ALTER TABLE ONLY "public"."match_map_vetos"
    ADD CONSTRAINT "match_map_vetos_team1_id_fkey1" FOREIGN KEY ("team1_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."match_map_vetos"
    ADD CONSTRAINT "match_map_vetos_team2_id_fkey1" FOREIGN KEY ("team2_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."match_map_vetos"
    ADD CONSTRAINT "match_map_vetos_tournament_id_fkey1" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_messages"
    ADD CONSTRAINT "match_messages_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."brkt_matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_messages"
    ADD CONSTRAINT "match_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."match_messages"
    ADD CONSTRAINT "match_messages_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."match_result_reports"
    ADD CONSTRAINT "match_result_reports_map_id_fkey" FOREIGN KEY ("map_id") REFERENCES "public"."game_maps"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."match_result_reports"
    ADD CONSTRAINT "match_result_reports_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."brkt_matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_result_reports"
    ADD CONSTRAINT "match_result_reports_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."match_result_reports"
    ADD CONSTRAINT "match_result_reports_reported_by_team_id_fkey" FOREIGN KEY ("reported_by_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."match_result_reports"
    ADD CONSTRAINT "match_result_reports_responded_by_fkey" FOREIGN KEY ("responded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."match_result_reports"
    ADD CONSTRAINT "match_result_reports_winner_team_id_fkey" FOREIGN KEY ("winner_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."match_time_proposals"
    ADD CONSTRAINT "match_time_proposals_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."brkt_matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_time_proposals"
    ADD CONSTRAINT "match_time_proposals_proposed_by_fkey" FOREIGN KEY ("proposed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_albums"
    ADD CONSTRAINT "organization_albums_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_media"
    ADD CONSTRAINT "organization_media_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "public"."organization_albums"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_media"
    ADD CONSTRAINT "organization_media_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_staff"
    ADD CONSTRAINT "organization_staff_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organization_staff"
    ADD CONSTRAINT "organization_staff_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_staff"
    ADD CONSTRAINT "organization_staff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."partner_applications"
    ADD CONSTRAINT "partner_applications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_reviewee_id_fkey" FOREIGN KEY ("reviewee_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."riot_accounts"
    ADD CONSTRAINT "riot_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sponsor_accounts"
    ADD CONSTRAINT "sponsor_accounts_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sponsor_accounts"
    ADD CONSTRAINT "sponsor_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sponsor_impressions"
    ADD CONSTRAINT "sponsor_impressions_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_audit_log"
    ADD CONSTRAINT "staff_audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_audit_log"
    ADD CONSTRAINT "staff_audit_log_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_tournament_assignments"
    ADD CONSTRAINT "staff_tournament_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_tournament_assignments"
    ADD CONSTRAINT "staff_tournament_assignments_organization_staff_id_fkey" FOREIGN KEY ("organization_staff_id") REFERENCES "public"."organization_staff"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_tournament_assignments"
    ADD CONSTRAINT "staff_tournament_assignments_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stage_participants"
    ADD CONSTRAINT "stage_participants_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."team_invitations"
    ADD CONSTRAINT "team_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."team_invitations"
    ADD CONSTRAINT "team_invitations_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_invitations"
    ADD CONSTRAINT "team_invitations_invited_user_id_fkey" FOREIGN KEY ("invited_user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_invitations"
    ADD CONSTRAINT "team_invitations_roster_id_fkey" FOREIGN KEY ("roster_id") REFERENCES "public"."team_rosters"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."team_invitations"
    ADD CONSTRAINT "team_invitations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_roster_members"
    ADD CONSTRAINT "team_roster_members_roster_id_fkey" FOREIGN KEY ("roster_id") REFERENCES "public"."team_rosters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_roster_members"
    ADD CONSTRAINT "team_roster_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_rosters"
    ADD CONSTRAINT "team_rosters_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_announcements"
    ADD CONSTRAINT "tournament_announcements_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."tournament_announcements"
    ADD CONSTRAINT "tournament_announcements_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_bans"
    ADD CONSTRAINT "tournament_bans_banned_by_fkey" FOREIGN KEY ("banned_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tournament_bans"
    ADD CONSTRAINT "tournament_bans_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "public"."tournament_participants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tournament_bans"
    ADD CONSTRAINT "tournament_bans_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tournament_bans"
    ADD CONSTRAINT "tournament_bans_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_bans"
    ADD CONSTRAINT "tournament_bans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_disputes"
    ADD CONSTRAINT "tournament_disputes_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tournament_disputes"
    ADD CONSTRAINT "tournament_disputes_raised_by_user_id_fkey" FOREIGN KEY ("raised_by_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_disputes"
    ADD CONSTRAINT "tournament_disputes_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tournament_disputes"
    ADD CONSTRAINT "tournament_disputes_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_map_pools"
    ADD CONSTRAINT "tournament_map_pools_map_id_fkey1" FOREIGN KEY ("map_id") REFERENCES "public"."game_maps"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_map_pools"
    ADD CONSTRAINT "tournament_map_pools_tournament_id_fkey1" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_match_results"
    ADD CONSTRAINT "tournament_match_results_reporter_user_id_fkey" FOREIGN KEY ("reporter_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_match_results"
    ADD CONSTRAINT "tournament_match_results_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tournament_match_results"
    ADD CONSTRAINT "tournament_match_results_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_participants"
    ADD CONSTRAINT "tournament_participants_roster_id_fkey" FOREIGN KEY ("roster_id") REFERENCES "public"."team_rosters"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tournament_participants"
    ADD CONSTRAINT "tournament_participants_team_captain_id_fkey" FOREIGN KEY ("team_captain_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tournament_participants"
    ADD CONSTRAINT "tournament_participants_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_participants"
    ADD CONSTRAINT "tournament_participants_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_participants"
    ADD CONSTRAINT "tournament_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_participants"
    ADD CONSTRAINT "tournament_participants_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tournament_staff"
    ADD CONSTRAINT "tournament_staff_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tournament_staff"
    ADD CONSTRAINT "tournament_staff_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_staff"
    ADD CONSTRAINT "tournament_staff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_stages"
    ADD CONSTRAINT "tournament_stages_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."valorant_player_stats"
    ADD CONSTRAINT "valorant_player_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."venue_availability"
    ADD CONSTRAINT "venue_availability_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."venue_bookings"
    ADD CONSTRAINT "venue_bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."venue_bookings"
    ADD CONSTRAINT "venue_bookings_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."venue_reviews"
    ADD CONSTRAINT "venue_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."venue_reviews"
    ADD CONSTRAINT "venue_reviews_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."venues"
    ADD CONSTRAINT "venues_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."verification_requests"
    ADD CONSTRAINT "verification_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."verification_requests"
    ADD CONSTRAINT "verification_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."verified_roles"
    ADD CONSTRAINT "verified_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."verified_roles"
    ADD CONSTRAINT "verified_roles_verification_request_id_fkey" FOREIGN KEY ("verification_request_id") REFERENCES "public"."verification_requests"("id");



ALTER TABLE ONLY "public"."verified_roles"
    ADD CONSTRAINT "verified_roles_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "public"."profiles"("id");



CREATE POLICY "Admins bypass assignment RLS" ON "public"."staff_tournament_assignments" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins bypass audit log RLS" ON "public"."staff_audit_log" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins bypass org staff RLS" ON "public"."organization_staff" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can delete partner applications" ON "public"."partner_applications" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can manage admin permissions" ON "public"."admin_permissions" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."is_admin" = true)))));



CREATE POLICY "Admins can manage admin role permissions" ON "public"."admin_role_permissions" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."is_admin" = true)))));



CREATE POLICY "Admins can manage admin roles" ON "public"."admin_roles" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."is_admin" = true)))));



CREATE POLICY "Admins can manage admin user roles" ON "public"."admin_user_roles" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."is_admin" = true)))));



CREATE POLICY "Admins can update partner applications" ON "public"."partner_applications" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can update system settings" ON "public"."system_settings" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."is_admin" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."is_admin" = true)))));



CREATE POLICY "Admins can view audit logs" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can view partner applications" ON "public"."partner_applications" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can view system settings" ON "public"."system_settings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."is_admin" = true)))));



CREATE POLICY "Allow partners to view their own analytics" ON "public"."sponsor_impressions" FOR SELECT TO "authenticated" USING ((("sponsor_id" IN ( SELECT "sponsor_accounts"."sponsor_id"
   FROM "public"."sponsor_accounts"
  WHERE ("sponsor_accounts"."user_id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true))))));



CREATE POLICY "Allow staff invite notifications" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (("type" = 'staff_invite'::"public"."notification_type"));



CREATE POLICY "Authenticated users can create reviews" ON "public"."venue_reviews" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Authenticated users can insert audit logs" ON "public"."audit_logs" FOR INSERT TO "authenticated" WITH CHECK (("admin_id" = "auth"."uid"()));



CREATE POLICY "Authenticated users can insert audit logs" ON "public"."staff_audit_log" FOR INSERT TO "authenticated" WITH CHECK (("actor_id" = "auth"."uid"()));



CREATE POLICY "Authorized staff can create announcements" ON "public"."tournament_announcements" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."organization_staff" "os"
     JOIN "public"."tournaments" "t" ON (("t"."organization_id" = "os"."organization_id")))
  WHERE (("t"."id" = "tournament_announcements"."tournament_id") AND ("os"."user_id" = "auth"."uid"()) AND ("os"."status" = 'active'::"text") AND (("os"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) OR (EXISTS ( SELECT 1
           FROM "public"."staff_tournament_assignments" "sta"
          WHERE (("sta"."organization_staff_id" = "os"."id") AND ("sta"."tournament_id" = "t"."id")))))))));



CREATE POLICY "Authorized staff can delete announcements" ON "public"."tournament_announcements" FOR DELETE USING ((("auth"."uid"() = "sender_id") OR (EXISTS ( SELECT 1
   FROM ("public"."organization_staff" "os"
     JOIN "public"."tournaments" "t" ON (("t"."organization_id" = "os"."organization_id")))
  WHERE (("t"."id" = "tournament_announcements"."tournament_id") AND ("os"."user_id" = "auth"."uid"()) AND ("os"."status" = 'active'::"text") AND ("os"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))));



CREATE POLICY "Org admins can manage staff" ON "public"."organization_staff" TO "authenticated" USING ("public"."is_org_admin"("organization_id")) WITH CHECK ("public"."is_org_admin"("organization_id"));



CREATE POLICY "Org admins can view audit logs" ON "public"."staff_audit_log" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_staff"
  WHERE (("organization_staff"."organization_id" = "staff_audit_log"."organization_id") AND ("organization_staff"."user_id" = "auth"."uid"()) AND ("organization_staff"."role" = 'admin'::"text") AND ("organization_staff"."status" = 'active'::"text")))));



CREATE POLICY "Org owners can manage staff" ON "public"."organization_staff" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organizations"
  WHERE (("organizations"."id" = "organization_staff"."organization_id") AND ("organizations"."owner_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organizations"
  WHERE (("organizations"."id" = "organization_staff"."organization_id") AND ("organizations"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Org owners can view audit logs" ON "public"."staff_audit_log" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organizations"
  WHERE (("organizations"."id" = "staff_audit_log"."organization_id") AND ("organizations"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Org owners manage tournament assignments" ON "public"."staff_tournament_assignments" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."organization_staff" "os"
     JOIN "public"."organizations" "o" ON (("o"."id" = "os"."organization_id")))
  WHERE (("os"."id" = "staff_tournament_assignments"."organization_staff_id") AND ("o"."owner_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."organization_staff" "os"
     JOIN "public"."organizations" "o" ON (("o"."id" = "os"."organization_id")))
  WHERE (("os"."id" = "staff_tournament_assignments"."organization_staff_id") AND ("o"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Organization owners can delete media" ON "public"."organization_media" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") IN ( SELECT "organizations"."owner_id"
   FROM "public"."organizations"
  WHERE ("organizations"."id" = "organization_media"."organization_id"))));



CREATE POLICY "Organization owners can insert media" ON "public"."organization_media" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IN ( SELECT "organizations"."owner_id"
   FROM "public"."organizations"
  WHERE ("organizations"."id" = "organization_media"."organization_id"))));



CREATE POLICY "Organizers can delete reports" ON "public"."match_result_reports" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (("public"."brkt_matches" "m"
     JOIN "public"."brkt_versions" "v" ON (("m"."version_id" = "v"."id")))
     JOIN "public"."tournaments" "t" ON (("v"."tournament_id" = "t"."id")))
  WHERE (("m"."id" = "match_result_reports"."match_id") AND (("t"."organizer_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("t"."id" IN ( SELECT "tournament_staff"."tournament_id"
           FROM "public"."tournament_staff"
          WHERE ("tournament_staff"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))))));



CREATE POLICY "Participants can view announcements" ON "public"."tournament_announcements" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."tournament_participants"
  WHERE (("tournament_participants"."tournament_id" = "tournament_announcements"."tournament_id") AND ("tournament_participants"."user_id" = "auth"."uid"())))));



CREATE POLICY "Public media are viewable by everyone" ON "public"."organization_media" FOR SELECT USING (true);



CREATE POLICY "Public read branding settings" ON "public"."system_settings" FOR SELECT USING (("key" = ANY (ARRAY['platform_logo_url'::"text", 'platform_icon_url'::"text"])));



CREATE POLICY "Reviews are viewable by everyone" ON "public"."venue_reviews" FOR SELECT USING (true);



CREATE POLICY "Staff can view announcements" ON "public"."tournament_announcements" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."organization_staff" "os"
     JOIN "public"."tournaments" "t" ON (("t"."organization_id" = "os"."organization_id")))
  WHERE (("t"."id" = "tournament_announcements"."tournament_id") AND ("os"."user_id" = "auth"."uid"()) AND ("os"."status" = 'active'::"text")))));



CREATE POLICY "Staff can view other staff in same org" ON "public"."organization_staff" FOR SELECT USING ("public"."is_org_active_staff"("organization_id"));



CREATE POLICY "Staff can view own assignments" ON "public"."staff_tournament_assignments" FOR SELECT USING ("public"."is_org_staff_user"("organization_staff_id"));



CREATE POLICY "Users can create bookings" ON "public"."venue_bookings" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete own reviews" ON "public"."venue_reviews" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can respond to invites" ON "public"."organization_staff" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own reviews" ON "public"."venue_reviews" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update their own bookings" ON "public"."venue_bookings" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update their own sponsor account" ON "public"."sponsor_accounts" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own staff records" ON "public"."organization_staff" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own bookings" ON "public"."venue_bookings" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."admin_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_role_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brkt_advancements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "brkt_advancements_delete_policy" ON "public"."brkt_advancements" FOR DELETE USING (((( SELECT "auth"."role"() AS "role") = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



CREATE POLICY "brkt_advancements_enterprise_select" ON "public"."brkt_advancements" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "brkt_advancements_insert_policy" ON "public"."brkt_advancements" FOR INSERT WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM ("public"."brkt_versions" "bv"
     JOIN "public"."tournaments" "t" ON (("t"."id" = "bv"."tournament_id")))
  WHERE (("bv"."id" = "brkt_advancements"."version_id") AND (("t"."organizer_id" = "auth"."uid"()) OR ("t"."organization_id" IN ( SELECT "organizations"."id"
           FROM "public"."organizations"
          WHERE ("organizations"."owner_id" = "auth"."uid"())))))))));



CREATE POLICY "brkt_advancements_update_policy" ON "public"."brkt_advancements" FOR UPDATE USING (((( SELECT "auth"."role"() AS "role") = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



ALTER TABLE "public"."brkt_layout" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "brkt_layout_delete_policy" ON "public"."brkt_layout" FOR DELETE USING (((( SELECT "auth"."role"() AS "role") = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



CREATE POLICY "brkt_layout_insert_policy" ON "public"."brkt_layout" FOR INSERT WITH CHECK (((( SELECT "auth"."role"() AS "role") = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM (("public"."brkt_versions" "bv"
     JOIN "public"."tournament_stages" "ts" ON (("ts"."id" = "bv"."stage_id")))
     JOIN "public"."tournaments" "t" ON (("t"."id" = "ts"."tournament_id")))
  WHERE (("bv"."id" = "brkt_layout"."version_id") AND ("t"."organizer_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "brkt_layout_select_policy" ON "public"."brkt_layout" FOR SELECT USING (true);



CREATE POLICY "brkt_layout_update_policy" ON "public"."brkt_layout" FOR UPDATE USING (((( SELECT "auth"."role"() AS "role") = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



ALTER TABLE "public"."brkt_match_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "brkt_match_events_delete_policy" ON "public"."brkt_match_events" FOR DELETE USING (((( SELECT "auth"."role"() AS "role") = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



CREATE POLICY "brkt_match_events_insert_policy" ON "public"."brkt_match_events" FOR INSERT WITH CHECK (((( SELECT "auth"."role"() AS "role") = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM ((("public"."brkt_matches" "bm"
     JOIN "public"."brkt_versions" "bv" ON (("bv"."id" = "bm"."version_id")))
     JOIN "public"."tournament_stages" "ts" ON (("ts"."id" = "bv"."stage_id")))
     JOIN "public"."tournaments" "t" ON (("t"."id" = "ts"."tournament_id")))
  WHERE (("bm"."id" = "brkt_match_events"."match_id") AND ("t"."organizer_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "brkt_match_events_select_policy" ON "public"."brkt_match_events" FOR SELECT USING (true);



CREATE POLICY "brkt_match_events_update_policy" ON "public"."brkt_match_events" FOR UPDATE USING (((( SELECT "auth"."role"() AS "role") = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



ALTER TABLE "public"."brkt_match_games" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "brkt_match_games_all_policy" ON "public"."brkt_match_games" USING ((("auth"."role"() = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM (("public"."brkt_matches" "bm"
     JOIN "public"."brkt_versions" "bv" ON (("bv"."id" = "bm"."version_id")))
     JOIN "public"."tournaments" "t" ON (("t"."id" = "bv"."tournament_id")))
  WHERE (("bm"."id" = "brkt_match_games"."match_id") AND (("t"."organizer_id" = "auth"."uid"()) OR ("t"."organization_id" IN ( SELECT "organizations"."id"
           FROM "public"."organizations"
          WHERE ("organizations"."owner_id" = "auth"."uid"())))))))));



CREATE POLICY "brkt_match_games_select_policy" ON "public"."brkt_match_games" FOR SELECT USING (true);



ALTER TABLE "public"."brkt_matches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "brkt_matches_delete_policy" ON "public"."brkt_matches" FOR DELETE USING ((("auth"."role"() = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))) OR (EXISTS ( SELECT 1
   FROM ("public"."brkt_versions" "bv"
     JOIN "public"."tournaments" "t" ON (("t"."id" = "bv"."tournament_id")))
  WHERE (("bv"."id" = "brkt_matches"."version_id") AND (("t"."organizer_id" = "auth"."uid"()) OR ("t"."organization_id" IN ( SELECT "organizations"."id"
           FROM "public"."organizations"
          WHERE ("organizations"."owner_id" = "auth"."uid"())))))))));



CREATE POLICY "brkt_matches_enterprise_select" ON "public"."brkt_matches" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "brkt_matches_insert_policy" ON "public"."brkt_matches" FOR INSERT WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))) OR (EXISTS ( SELECT 1
   FROM ("public"."brkt_versions" "bv"
     JOIN "public"."tournaments" "t" ON (("t"."id" = "bv"."tournament_id")))
  WHERE (("bv"."id" = "brkt_matches"."version_id") AND (("t"."organizer_id" = "auth"."uid"()) OR ("t"."organization_id" IN ( SELECT "organizations"."id"
           FROM "public"."organizations"
          WHERE ("organizations"."owner_id" = "auth"."uid"())))))))));



CREATE POLICY "brkt_matches_public_select" ON "public"."brkt_matches" FOR SELECT USING (true);



CREATE POLICY "brkt_matches_update_policy" ON "public"."brkt_matches" FOR UPDATE USING ((("auth"."role"() = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))) OR (EXISTS ( SELECT 1
   FROM ("public"."brkt_versions" "bv"
     JOIN "public"."tournaments" "t" ON (("t"."id" = "bv"."tournament_id")))
  WHERE (("bv"."id" = "brkt_matches"."version_id") AND (("t"."organizer_id" = "auth"."uid"()) OR ("t"."organization_id" IN ( SELECT "organizations"."id"
           FROM "public"."organizations"
          WHERE ("organizations"."owner_id" = "auth"."uid"())))))))));



ALTER TABLE "public"."brkt_versions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "brkt_versions_authenticated_select" ON "public"."brkt_versions" FOR SELECT TO "authenticated" USING ((("status" <> 'archived'::"text") OR "public"."is_admin"()));



CREATE POLICY "brkt_versions_delete_policy" ON "public"."brkt_versions" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."tournaments" "t"
  WHERE (("t"."id" = "brkt_versions"."tournament_id") AND (("t"."organizer_id" = "auth"."uid"()) OR ("t"."organization_id" IN ( SELECT "organizations"."id"
           FROM "public"."organizations"
          WHERE ("organizations"."owner_id" = "auth"."uid"()))))))));



CREATE POLICY "brkt_versions_enterprise_insert" ON "public"."brkt_versions" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."tournaments" "t"
  WHERE (("t"."id" = "brkt_versions"."tournament_id") AND (("t"."organizer_id" = "auth"."uid"()) OR ("t"."organization_id" IN ( SELECT "organizations"."id"
           FROM "public"."organizations"
          WHERE ("organizations"."owner_id" = "auth"."uid"())))))))));



CREATE POLICY "brkt_versions_enterprise_update" ON "public"."brkt_versions" FOR UPDATE TO "authenticated" USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."tournaments" "t"
  WHERE (("t"."id" = "brkt_versions"."tournament_id") AND (("t"."organizer_id" = "auth"."uid"()) OR ("t"."organization_id" IN ( SELECT "organizations"."id"
           FROM "public"."organizations"
          WHERE ("organizations"."owner_id" = "auth"."uid"())))))))));



CREATE POLICY "checkins_captain_insert" ON "public"."match_checkins" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."team_id" = "match_checkins"."team_id") AND ("tm"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tm"."role" = 'captain'::"public"."team_member_role")))));



CREATE POLICY "checkins_public_select" ON "public"."match_checkins" FOR SELECT USING (true);



CREATE POLICY "dc_insert_own_or_organizer" ON "public"."dispute_comments" FOR INSERT WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ((EXISTS ( SELECT 1
   FROM "public"."tournament_disputes" "td"
  WHERE (("td"."id" = "dispute_comments"."dispute_id") AND ("td"."raised_by_user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM ("public"."tournament_disputes" "td"
     JOIN "public"."tournaments" "t" ON (("t"."id" = "td"."tournament_id")))
  WHERE (("td"."id" = "dispute_comments"."dispute_id") AND (("t"."organizer_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("td"."assigned_to_user_id" = ( SELECT "auth"."uid"() AS "uid")))))) OR (EXISTS ( SELECT 1
   FROM ("public"."tournament_disputes" "td"
     JOIN "public"."tournament_staff" "ts" ON (("ts"."tournament_id" = "td"."tournament_id")))
  WHERE (("td"."id" = "dispute_comments"."dispute_id") AND ("ts"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ts"."status" = 'active'::"text") AND ('disputes:assist'::"text" = ANY ("ts"."permissions"))))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (('moderator'::"text" = ANY ("p"."admin_roles")) OR ('ops_admin'::"text" = ANY ("p"."admin_roles")))))) OR (EXISTS ( SELECT 1
   FROM ("public"."admin_user_roles" "aur"
     JOIN "public"."admin_roles" "ar" ON (("ar"."id" = "aur"."role_id")))
  WHERE (("aur"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("lower"("ar"."name") = ANY (ARRAY['moderator'::"text", 'ops_admin'::"text"]))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text"))));



CREATE POLICY "dc_select_own_or_dispute" ON "public"."dispute_comments" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ((NOT "is_internal") AND (EXISTS ( SELECT 1
   FROM "public"."tournament_disputes" "td"
  WHERE (("td"."id" = "dispute_comments"."dispute_id") AND ("td"."raised_by_user_id" = ( SELECT "auth"."uid"() AS "uid")))))) OR (EXISTS ( SELECT 1
   FROM ("public"."tournament_disputes" "td"
     JOIN "public"."tournaments" "t" ON (("t"."id" = "td"."tournament_id")))
  WHERE (("td"."id" = "dispute_comments"."dispute_id") AND (("t"."organizer_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("td"."assigned_to_user_id" = ( SELECT "auth"."uid"() AS "uid")))))) OR (EXISTS ( SELECT 1
   FROM ("public"."tournament_disputes" "td"
     JOIN "public"."tournament_staff" "ts" ON (("ts"."tournament_id" = "td"."tournament_id")))
  WHERE (("td"."id" = "dispute_comments"."dispute_id") AND ("ts"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ts"."status" = 'active'::"text") AND ('disputes:assist'::"text" = ANY ("ts"."permissions"))))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("p"."is_admin" = true) OR ('super_admin'::"text" = ANY ("p"."admin_roles")) OR ('moderator'::"text" = ANY ("p"."admin_roles")) OR ('ops_admin'::"text" = ANY ("p"."admin_roles")))))) OR (EXISTS ( SELECT 1
   FROM ("public"."admin_user_roles" "aur"
     JOIN "public"."admin_roles" "ar" ON (("ar"."id" = "aur"."role_id")))
  WHERE (("aur"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("lower"("ar"."name") = ANY (ARRAY['super_admin'::"text", 'moderator'::"text", 'ops_admin'::"text"]))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



ALTER TABLE "public"."dispute_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."game_maps" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "game_maps_delete_policy" ON "public"."game_maps" FOR DELETE USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "game_maps_insert_policy" ON "public"."game_maps" FOR INSERT WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "game_maps_select_policy" ON "public"."game_maps" FOR SELECT USING (true);



CREATE POLICY "game_maps_update_policy" ON "public"."game_maps" FOR UPDATE USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



ALTER TABLE "public"."match_checkins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."match_completed_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "match_completed_events_enterprise" ON "public"."match_completed_events" TO "authenticated" USING ((("auth"."role"() = 'service_role'::"text") OR (CURRENT_USER = 'postgres'::"name") OR "public"."is_admin"()));



ALTER TABLE "public"."match_map_veto_actions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "match_map_veto_actions_delete_policy" ON "public"."match_map_veto_actions" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM (("public"."brkt_matches" "m"
     JOIN "public"."brkt_versions" "v" ON (("m"."version_id" = "v"."id")))
     JOIN "public"."tournaments" "t" ON (("v"."tournament_id" = "t"."id")))
  WHERE (("m"."id" = "match_map_veto_actions"."match_id") AND (("t"."organizer_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("t"."id" IN ( SELECT "tournament_staff"."tournament_id"
           FROM "public"."tournament_staff"
          WHERE ("tournament_staff"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "match_map_veto_actions_insert_policy" ON "public"."match_map_veto_actions" FOR INSERT WITH CHECK (((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text") OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "match_map_veto_actions_select_policy" ON "public"."match_map_veto_actions" FOR SELECT USING (true);



ALTER TABLE "public"."match_map_vetos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "match_map_vetos_delete_policy" ON "public"."match_map_vetos" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."tournaments" "t"
  WHERE (("t"."id" = "match_map_vetos"."tournament_id") AND (("t"."organizer_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("t"."id" IN ( SELECT "tournament_staff"."tournament_id"
           FROM "public"."tournament_staff"
          WHERE ("tournament_staff"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "match_map_vetos_insert_policy" ON "public"."match_map_vetos" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."tournaments" "t"
  WHERE (("t"."id" = "match_map_vetos"."tournament_id") AND ("t"."organizer_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."tournament_staff" "ts"
  WHERE (("ts"."tournament_id" = "ts"."tournament_id") AND ("ts"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ts"."role" = ANY (ARRAY['organizer'::"text", 'admin'::"text"]))))) OR ("team1_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("team_members"."role" = ANY (ARRAY['captain'::"public"."team_member_role", 'owner'::"public"."team_member_role"])) AND ("team_members"."is_active" = true)))) OR ("team1_id" IN ( SELECT "teams"."id"
   FROM "public"."teams"
  WHERE ("teams"."owner_id" = ( SELECT "auth"."uid"() AS "uid")))) OR ("team2_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("team_members"."role" = ANY (ARRAY['captain'::"public"."team_member_role", 'owner'::"public"."team_member_role"])) AND ("team_members"."is_active" = true)))) OR ("team2_id" IN ( SELECT "teams"."id"
   FROM "public"."teams"
  WHERE ("teams"."owner_id" = ( SELECT "auth"."uid"() AS "uid")))) OR (EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = 'admin'::"text")))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "match_map_vetos_select_policy" ON "public"."match_map_vetos" FOR SELECT USING (true);



CREATE POLICY "match_map_vetos_update_policy" ON "public"."match_map_vetos" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."tournaments" "t"
  WHERE (("t"."id" = "match_map_vetos"."tournament_id") AND ("t"."organizer_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."tournament_staff" "ts"
  WHERE (("ts"."tournament_id" = "ts"."tournament_id") AND ("ts"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ts"."role" = ANY (ARRAY['organizer'::"text", 'admin'::"text"]))))) OR ("team1_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("team_members"."role" = ANY (ARRAY['captain'::"public"."team_member_role", 'owner'::"public"."team_member_role"])) AND ("team_members"."is_active" = true)))) OR ("team1_id" IN ( SELECT "teams"."id"
   FROM "public"."teams"
  WHERE ("teams"."owner_id" = ( SELECT "auth"."uid"() AS "uid")))) OR ("team2_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("team_members"."role" = ANY (ARRAY['captain'::"public"."team_member_role", 'owner'::"public"."team_member_role"])) AND ("team_members"."is_active" = true)))) OR ("team2_id" IN ( SELECT "teams"."id"
   FROM "public"."teams"
  WHERE ("teams"."owner_id" = ( SELECT "auth"."uid"() AS "uid")))) OR (EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = 'admin'::"text")))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



ALTER TABLE "public"."match_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."match_result_reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "match_result_reports_insert" ON "public"."match_result_reports" FOR INSERT WITH CHECK (((("auth"."uid"() = "reported_by") AND (EXISTS ( SELECT 1
   FROM ("public"."brkt_matches" "m"
     JOIN "public"."team_members" "tm" ON ((("tm"."team_id" = "m"."team1_id") OR ("tm"."team_id" = "m"."team2_id"))))
  WHERE (("m"."id" = "match_result_reports"."match_id") AND ("tm"."user_id" = "auth"."uid"()) AND ("tm"."is_active" = true))))) OR ("current_setting"('request.jwt.claim.role'::"text", true) = 'service_role'::"text")));



CREATE POLICY "match_result_reports_select" ON "public"."match_result_reports" FOR SELECT USING (true);



CREATE POLICY "match_result_reports_update" ON "public"."match_result_reports" FOR UPDATE USING (((( SELECT "auth"."role"() AS "role") = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM (("public"."brkt_matches" "m"
     JOIN "public"."brkt_versions" "v" ON (("m"."version_id" = "v"."id")))
     JOIN "public"."tournaments" "t" ON (("v"."tournament_id" = "t"."id")))
  WHERE (("m"."id" = "match_result_reports"."match_id") AND ("t"."organizer_id" = "auth"."uid"()))))));



ALTER TABLE "public"."match_time_proposals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "messages_participants" ON "public"."match_messages" USING ((EXISTS ( SELECT 1
   FROM ((("public"."brkt_matches" "m"
     JOIN "public"."brkt_versions" "v" ON (("m"."version_id" = "v"."id")))
     JOIN "public"."tournaments" "t" ON (("v"."tournament_id" = "t"."id")))
     LEFT JOIN "public"."team_members" "tm" ON ((("tm"."team_id" = "m"."team1_id") OR ("tm"."team_id" = "m"."team2_id"))))
  WHERE (("m"."id" = "match_messages"."match_id") AND ((("tm"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tm"."role" = 'captain'::"public"."team_member_role")) OR ("t"."organizer_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_delete_policy" ON "public"."notifications" FOR DELETE USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "notifications_insert_policy" ON "public"."notifications" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."team_invitations" "ti"
  WHERE (("ti"."invited_user_id" = "notifications"."user_id") AND ("ti"."invited_by_user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."team_invitations" "ti"
  WHERE (("ti"."invited_by_user_id" = "notifications"."user_id") AND ("ti"."invited_user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "notifications_select_policy" ON "public"."notifications" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "notifications_update_policy" ON "public"."notifications" FOR UPDATE USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



ALTER TABLE "public"."organization_albums" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_albums_delete_policy" ON "public"."organization_albums" FOR DELETE USING ((("organization_id" IN ( SELECT "organizations"."id"
   FROM "public"."organizations"
  WHERE ("organizations"."owner_id" = ( SELECT "auth"."uid"() AS "uid")))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "organization_albums_insert_policy" ON "public"."organization_albums" FOR INSERT WITH CHECK ((("organization_id" IN ( SELECT "organizations"."id"
   FROM "public"."organizations"
  WHERE ("organizations"."owner_id" = ( SELECT "auth"."uid"() AS "uid")))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "organization_albums_select_policy" ON "public"."organization_albums" FOR SELECT USING (true);



CREATE POLICY "organization_albums_update_policy" ON "public"."organization_albums" FOR UPDATE USING ((("organization_id" IN ( SELECT "organizations"."id"
   FROM "public"."organizations"
  WHERE ("organizations"."owner_id" = ( SELECT "auth"."uid"() AS "uid")))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



ALTER TABLE "public"."organization_media" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_staff" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organizations_delete_policy" ON "public"."organizations" FOR DELETE USING ((("owner_id" = ( SELECT "auth"."uid"() AS "uid")) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



CREATE POLICY "organizations_insert_policy" ON "public"."organizations" FOR INSERT WITH CHECK ((("owner_id" = ( SELECT "auth"."uid"() AS "uid")) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



CREATE POLICY "organizations_select_policy" ON "public"."organizations" FOR SELECT USING (true);



CREATE POLICY "organizations_update_policy" ON "public"."organizations" FOR UPDATE USING ((("owner_id" = "auth"."uid"()) OR ("auth"."role"() = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."organization_staff"
  WHERE (("organization_staff"."organization_id" = "organizations"."id") AND ("organization_staff"."user_id" = "auth"."uid"()) AND ("organization_staff"."role" = 'admin'::"text") AND ("organization_staff"."status" = 'active'::"text"))))));



ALTER TABLE "public"."partner_applications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "partner_applications_insert_policy" ON "public"."partner_applications" FOR INSERT WITH CHECK ((( SELECT "auth"."role"() AS "role") = ANY (ARRAY['anon'::"text", 'authenticated'::"text", 'service_role'::"text"])));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_self" ON "public"."profiles" FOR INSERT TO "authenticated", "service_role" WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "profiles_read_all" ON "public"."profiles" FOR SELECT TO "authenticated", "anon", "service_role" USING (true);



CREATE POLICY "profiles_update_policy" ON "public"."profiles" FOR UPDATE USING ((("id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."has_super_admin_role"() OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "proposals_match_participants" ON "public"."match_time_proposals" USING ((EXISTS ( SELECT 1
   FROM ("public"."brkt_matches" "m"
     JOIN "public"."team_members" "tm" ON ((("tm"."team_id" = "m"."team1_id") OR ("tm"."team_id" = "m"."team2_id"))))
  WHERE (("m"."id" = "match_time_proposals"."match_id") AND ("tm"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tm"."role" = 'captain'::"public"."team_member_role")))));



ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."riot_accounts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "riot_accounts_delete_policy" ON "public"."riot_accounts" FOR DELETE USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "riot_accounts_insert_policy" ON "public"."riot_accounts" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "riot_accounts_select_policy" ON "public"."riot_accounts" FOR SELECT USING (((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text") OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "riot_accounts_update_policy" ON "public"."riot_accounts" FOR UPDATE USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



ALTER TABLE "public"."sponsor_accounts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sponsor_accounts_delete_policy" ON "public"."sponsor_accounts" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "sponsor_accounts_insert_policy" ON "public"."sponsor_accounts" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "sponsor_accounts_select_policy" ON "public"."sponsor_accounts" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "sponsor_accounts_update_policy" ON "public"."sponsor_accounts" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



ALTER TABLE "public"."sponsor_impressions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sponsors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sponsors_delete_policy" ON "public"."sponsors" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "sponsors_insert_policy" ON "public"."sponsors" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "sponsors_select_policy" ON "public"."sponsors" FOR SELECT USING (true);



CREATE POLICY "sponsors_update_policy" ON "public"."sponsors" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))) OR ("id" IN ( SELECT "sponsor_accounts"."sponsor_id"
   FROM "public"."sponsor_accounts"
  WHERE (("sponsor_accounts"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("sponsor_accounts"."role" = 'owner'::"text")))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



ALTER TABLE "public"."staff_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_tournament_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stage_participants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stage_participants_delete_policy" ON "public"."stage_participants" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM ("public"."tournament_stages" "s"
     JOIN "public"."tournaments" "t" ON (("t"."id" = "s"."tournament_id")))
  WHERE (("s"."id" = "stage_participants"."stage_id") AND ("t"."organizer_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "stage_participants_insert_policy" ON "public"."stage_participants" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM ("public"."tournament_stages" "s"
     JOIN "public"."tournaments" "t" ON (("t"."id" = "s"."tournament_id")))
  WHERE (("s"."id" = "stage_participants"."stage_id") AND ("t"."organizer_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "stage_participants_select_policy" ON "public"."stage_participants" FOR SELECT USING (true);



CREATE POLICY "stage_participants_update_policy" ON "public"."stage_participants" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM ("public"."tournament_stages" "s"
     JOIN "public"."tournaments" "t" ON (("t"."id" = "s"."tournament_id")))
  WHERE (("s"."id" = "stage_participants"."stage_id") AND ("t"."organizer_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



ALTER TABLE "public"."system_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_invitations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "team_invitations_delete_policy" ON "public"."team_invitations" FOR DELETE USING ((("invited_by_user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "team_invitations"."team_id") AND ("t"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."team_id" = "team_invitations"."team_id") AND ("tm"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("tm"."role" = 'captain'::"public"."team_member_role") OR ("tm"."role" = 'owner'::"public"."team_member_role"))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "team_invitations_insert_policy" ON "public"."team_invitations" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "team_invitations"."team_id") AND ("t"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "team_invitations_select_policy" ON "public"."team_invitations" FOR SELECT USING ((("invited_user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "team_invitations"."team_id") AND ("t"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "team_invitations_update_policy" ON "public"."team_invitations" FOR UPDATE USING ((("invited_user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "team_invitations"."team_id") AND ("t"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "team_members_delete_policy" ON "public"."team_members" FOR DELETE USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "team_members"."team_id") AND ("t"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "team_members_insert_policy" ON "public"."team_members" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "team_members"."team_id") AND ("t"."owner_id" = "auth"."uid"())))) OR (("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."team_invitations" "ti"
  WHERE (("ti"."team_id" = "team_members"."team_id") AND (("ti"."invited_user_id" = "auth"."uid"()) OR ("ti"."invited_email" = ( SELECT "profiles"."email"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"())))) AND ("ti"."status" = 'accepted'::"text"))))) OR ("current_setting"('request.jwt.claim.role'::"text", true) = 'service_role'::"text")));



CREATE POLICY "team_members_select_policy" ON "public"."team_members" FOR SELECT USING ((("is_active" = true) OR ("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_team_owner"("team_id") OR (EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "team_members"."team_id") AND ("t"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "team_members_update_policy" ON "public"."team_members" FOR UPDATE USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "team_members"."team_id") AND ("t"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



ALTER TABLE "public"."team_roster_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "team_roster_members_delete_policy" ON "public"."team_roster_members" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM ("public"."team_rosters" "r"
     JOIN "public"."teams" "t" ON (("t"."id" = "r"."team_id")))
  WHERE (("r"."id" = "team_roster_members"."roster_id") AND ("t"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "team_roster_members_insert_policy" ON "public"."team_roster_members" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM ("public"."team_rosters" "r"
     JOIN "public"."teams" "t" ON (("t"."id" = "r"."team_id")))
  WHERE (("r"."id" = "team_roster_members"."roster_id") AND ("t"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "team_roster_members_select_policy" ON "public"."team_roster_members" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM ("public"."team_rosters" "r"
     JOIN "public"."team_members" "tm" ON (("tm"."team_id" = "r"."team_id")))
  WHERE (("r"."id" = "team_roster_members"."roster_id") AND ("tm"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tm"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM ("public"."team_rosters" "r"
     JOIN "public"."teams" "t" ON (("t"."id" = "r"."team_id")))
  WHERE (("r"."id" = "team_roster_members"."roster_id") AND ("t"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "team_roster_members_update_policy" ON "public"."team_roster_members" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM ("public"."team_rosters" "r"
     JOIN "public"."teams" "t" ON (("t"."id" = "r"."team_id")))
  WHERE (("r"."id" = "team_roster_members"."roster_id") AND ("t"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



ALTER TABLE "public"."team_rosters" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "team_rosters_delete_policy" ON "public"."team_rosters" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "team_rosters"."team_id") AND ("t"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "team_rosters_insert_policy" ON "public"."team_rosters" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "team_rosters"."team_id") AND ("t"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "team_rosters_select_policy" ON "public"."team_rosters" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."team_id" = "team_rosters"."team_id") AND ("tm"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tm"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "team_rosters"."team_id") AND ("t"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."team_invitations" "ti"
  WHERE (("ti"."roster_id" = "team_rosters"."id") AND ("ti"."status" = 'pending'::"text") AND (("ti"."invited_user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("ti"."invited_email" = ( SELECT "profiles"."email"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")))))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "team_rosters_update_policy" ON "public"."team_rosters" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "team_rosters"."team_id") AND ("t"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "teams_delete_policy" ON "public"."teams" FOR DELETE USING ((("owner_id" = ( SELECT "auth"."uid"() AS "uid")) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



CREATE POLICY "teams_insert_policy" ON "public"."teams" FOR INSERT WITH CHECK ((("owner_id" = ( SELECT "auth"."uid"() AS "uid")) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



CREATE POLICY "teams_select_policy" ON "public"."teams" FOR SELECT USING ((("deleted_at" IS NULL) OR ("owner_id" = ( SELECT "auth"."uid"() AS "uid")) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



CREATE POLICY "teams_update_policy" ON "public"."teams" FOR UPDATE USING ((("owner_id" = ( SELECT "auth"."uid"() AS "uid")) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



ALTER TABLE "public"."tournament_announcements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tournament_bans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tournament_bans_delete_policy" ON "public"."tournament_bans" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."tournaments" "t"
  WHERE (("t"."id" = "tournament_bans"."tournament_id") AND ("t"."organizer_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "tournament_bans_insert_policy" ON "public"."tournament_bans" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."tournaments" "t"
  WHERE (("t"."id" = "tournament_bans"."tournament_id") AND ("t"."organizer_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "tournament_bans_select_policy" ON "public"."tournament_bans" FOR SELECT USING (true);



CREATE POLICY "tournament_bans_update_policy" ON "public"."tournament_bans" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."tournaments" "t"
  WHERE (("t"."id" = "tournament_bans"."tournament_id") AND ("t"."organizer_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



ALTER TABLE "public"."tournament_disputes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tournament_disputes_delete_policy" ON "public"."tournament_disputes" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."tournaments" "t"
  WHERE (("t"."id" = "tournament_disputes"."tournament_id") AND ("t"."organizer_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "tournament_disputes_insert_policy" ON "public"."tournament_disputes" FOR INSERT WITH CHECK ((("raised_by_user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "tournament_disputes_select_policy" ON "public"."tournament_disputes" FOR SELECT USING ((("raised_by_user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."tournaments" "t"
  WHERE (("t"."id" = "tournament_disputes"."tournament_id") AND ("t"."organizer_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."tournament_staff" "ts"
  WHERE (("ts"."tournament_id" = "tournament_disputes"."tournament_id") AND ("ts"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ts"."status" = 'active'::"text") AND ('disputes:assist'::"text" = ANY ("ts"."permissions"))))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."is_admin" = true)))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "tournament_disputes_update_policy" ON "public"."tournament_disputes" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."tournaments" "t"
  WHERE (("t"."id" = "tournament_disputes"."tournament_id") AND ("t"."organizer_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."tournament_staff" "ts"
  WHERE (("ts"."tournament_id" = "tournament_disputes"."tournament_id") AND ("ts"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ts"."status" = 'active'::"text") AND ('disputes:assist'::"text" = ANY ("ts"."permissions"))))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."is_admin" = true)))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



ALTER TABLE "public"."tournament_map_pools" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tournament_map_pools_delete_policy" ON "public"."tournament_map_pools" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."tournaments" "t"
  WHERE (("t"."id" = "tournament_map_pools"."tournament_id") AND ("t"."organizer_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "tournament_map_pools_insert_policy" ON "public"."tournament_map_pools" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."tournaments" "t"
  WHERE (("t"."id" = "tournament_map_pools"."tournament_id") AND ("t"."organizer_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "tournament_map_pools_select_policy" ON "public"."tournament_map_pools" FOR SELECT USING (true);



CREATE POLICY "tournament_map_pools_update_policy" ON "public"."tournament_map_pools" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."tournaments" "t"
  WHERE (("t"."id" = "tournament_map_pools"."tournament_id") AND ("t"."organizer_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



ALTER TABLE "public"."tournament_match_results" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tournament_match_results_insert_policy" ON "public"."tournament_match_results" FOR INSERT WITH CHECK ((("reporter_user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "tournament_match_results_select_policy" ON "public"."tournament_match_results" FOR SELECT USING ((("reporter_user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."tournaments" "t"
  WHERE (("t"."id" = "tournament_match_results"."tournament_id") AND ("t"."organizer_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



ALTER TABLE "public"."tournament_participants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tournament_participants_delete_policy" ON "public"."tournament_participants" FOR DELETE USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("team_captain_id" = ( SELECT "auth"."uid"() AS "uid")) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "tournament_participants_insert_policy" ON "public"."tournament_participants" FOR INSERT WITH CHECK ((((("user_id" = "auth"."uid"()) OR ("team_captain_id" = "auth"."uid"())) AND (EXISTS ( SELECT 1
   FROM "public"."tournaments" "t"
  WHERE (("t"."id" = "tournament_participants"."tournament_id") AND (("t"."entry_fee" IS NULL) OR ("t"."entry_fee" = (0)::numeric)) AND ("t"."status" = 'open'::"public"."tournament_status"))))) OR ("current_setting"('request.jwt.claim.role'::"text", true) = 'service_role'::"text")));



CREATE POLICY "tournament_participants_select_policy" ON "public"."tournament_participants" FOR SELECT USING (true);



CREATE POLICY "tournament_participants_update_policy" ON "public"."tournament_participants" FOR UPDATE USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("team_captain_id" = ( SELECT "auth"."uid"() AS "uid")) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



ALTER TABLE "public"."tournament_staff" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tournament_staff_delete_policy" ON "public"."tournament_staff" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."tournaments" "t"
  WHERE (("t"."id" = "tournament_staff"."tournament_id") AND ("t"."organizer_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "tournament_staff_insert_policy" ON "public"."tournament_staff" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."tournaments" "t"
  WHERE (("t"."id" = "tournament_staff"."tournament_id") AND ("t"."organizer_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "tournament_staff_select_policy" ON "public"."tournament_staff" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."tournaments" "t"
  WHERE (("t"."id" = "tournament_staff"."tournament_id") AND ("t"."organizer_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR ("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("assigned_by" = ( SELECT "auth"."uid"() AS "uid")) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "tournament_staff_update_policy" ON "public"."tournament_staff" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."tournaments" "t"
  WHERE (("t"."id" = "tournament_staff"."tournament_id") AND ("t"."organizer_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("status" = 'pending'::"text")) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



ALTER TABLE "public"."tournament_stages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tournament_stages_delete_policy" ON "public"."tournament_stages" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."tournaments" "t"
  WHERE (("t"."id" = "tournament_stages"."tournament_id") AND ("t"."organizer_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "tournament_stages_insert_policy" ON "public"."tournament_stages" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."tournaments" "t"
  WHERE (("t"."id" = "tournament_stages"."tournament_id") AND ("t"."organizer_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "tournament_stages_select_policy" ON "public"."tournament_stages" FOR SELECT USING (true);



CREATE POLICY "tournament_stages_update_policy" ON "public"."tournament_stages" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."tournaments" "t"
  WHERE (("t"."id" = "tournament_stages"."tournament_id") AND ("t"."organizer_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



ALTER TABLE "public"."tournaments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tournaments_enterprise_delete" ON "public"."tournaments" FOR DELETE TO "authenticated" USING (("public"."is_admin"() OR ("organizer_id" = "auth"."uid"())));



CREATE POLICY "tournaments_enterprise_select" ON "public"."tournaments" FOR SELECT TO "authenticated" USING (((("is_public" = true) AND ("status" <> 'draft'::"public"."tournament_status")) OR "public"."is_admin"() OR ("organizer_id" = "auth"."uid"()) OR ("organization_id" IN ( SELECT "organizations"."id"
   FROM "public"."organizations"
  WHERE ("organizations"."owner_id" = "auth"."uid"()))) OR ("id" IN ( SELECT "tournament_participants"."tournament_id"
   FROM "public"."tournament_participants"
  WHERE ("tournament_participants"."user_id" = "auth"."uid"())))));



CREATE POLICY "tournaments_enterprise_update" ON "public"."tournaments" FOR UPDATE TO "authenticated" USING (("public"."is_admin"() OR ("organizer_id" = "auth"."uid"()) OR ("organization_id" IN ( SELECT "organizations"."id"
   FROM "public"."organizations"
  WHERE ("organizations"."owner_id" = "auth"."uid"())))));



CREATE POLICY "tournaments_insert_policy" ON "public"."tournaments" FOR INSERT WITH CHECK ((((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text") AND ("organizer_id" = ( SELECT "auth"."uid"() AS "uid"))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_roles_delete_policy" ON "public"."user_roles" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "user_roles_insert_policy" ON "public"."user_roles" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "user_roles_select_policy" ON "public"."user_roles" FOR SELECT USING (true);



CREATE POLICY "user_roles_update_policy" ON "public"."user_roles" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



ALTER TABLE "public"."valorant_player_stats" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "valorant_player_stats_select_policy" ON "public"."valorant_player_stats" FOR SELECT USING (true);



CREATE POLICY "valorant_player_stats_write" ON "public"."valorant_player_stats" USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



ALTER TABLE "public"."venue_availability" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."venue_bookings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."venue_reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."venues" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "venues_delete_policy" ON "public"."venues" FOR DELETE USING ((("owner_id" = ( SELECT "auth"."uid"() AS "uid")) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



CREATE POLICY "venues_insert_policy" ON "public"."venues" FOR INSERT WITH CHECK ((("owner_id" = ( SELECT "auth"."uid"() AS "uid")) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



CREATE POLICY "venues_select_policy" ON "public"."venues" FOR SELECT USING ((("deleted_at" IS NULL) OR ("owner_id" = ( SELECT "auth"."uid"() AS "uid")) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



CREATE POLICY "venues_update_policy" ON "public"."venues" FOR UPDATE USING ((("owner_id" = ( SELECT "auth"."uid"() AS "uid")) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true))))));



ALTER TABLE "public"."verification_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "verification_requests_delete_policy" ON "public"."verification_requests" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "verification_requests_insert_policy" ON "public"."verification_requests" FOR INSERT WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "verification_requests_select_policy" ON "public"."verification_requests" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "verification_requests_update_policy" ON "public"."verification_requests" FOR UPDATE USING (((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("status" = 'pending'::"text")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



ALTER TABLE "public"."verified_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "verified_roles_delete_policy" ON "public"."verified_roles" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "verified_roles_insert_policy" ON "public"."verified_roles" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "verified_roles_select_policy" ON "public"."verified_roles" FOR SELECT USING (true);



CREATE POLICY "verified_roles_update_policy" ON "public"."verified_roles" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."is_admin" = true)))) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."brkt_advancements";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."brkt_layout";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."brkt_match_events";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."brkt_matches";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."brkt_versions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."match_checkins";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."match_map_veto_actions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."match_map_vetos";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."match_messages";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."match_result_reports";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."match_time_proposals";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notifications";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."profiles";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."stage_participants";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."teams";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."tournament_bans";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."tournament_disputes";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."tournament_participants";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."tournament_staff";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."tournament_stages";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."tournaments";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;






SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;















SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;


















GRANT ALL ON FUNCTION "public"."accept_team_invite"("invite_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_team_invite"("invite_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_team_invite"("invite_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_suspend_user"("target_user_id" "uuid", "reason" "text", "duration" "text", "type" "text", "until_time" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."admin_suspend_user"("target_user_id" "uuid", "reason" "text", "duration" "text", "type" "text", "until_time" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_suspend_user"("target_user_id" "uuid", "reason" "text", "duration" "text", "type" "text", "until_time" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_unsuspend_user"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_unsuspend_user"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_unsuspend_user"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."advance_match_v2"("p_match_id" "uuid", "p_winner_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."advance_match_v2"("p_match_id" "uuid", "p_winner_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."advance_match_v2"("p_match_id" "uuid", "p_winner_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."advance_match_v2"("p_match_id" "uuid", "p_winner_id" "uuid", "p_team1_score" integer, "p_team2_score" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."advance_match_v2"("p_match_id" "uuid", "p_winner_id" "uuid", "p_team1_score" integer, "p_team2_score" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."advance_match_v2"("p_match_id" "uuid", "p_winner_id" "uuid", "p_team1_score" integer, "p_team2_score" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."advance_teams_to_next_stage"("p_current_stage_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."advance_teams_to_next_stage"("p_current_stage_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."advance_teams_to_next_stage"("p_current_stage_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."approve_verification_request"("request_id" "uuid", "admin_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_verification_request"("request_id" "uuid", "admin_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_verification_request"("request_id" "uuid", "admin_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."assign_teams_to_bracket"("p_stage_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."assign_teams_to_bracket"("p_stage_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_teams_to_bracket"("p_stage_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."assign_user_role"("p_user_id" "uuid", "p_role" "text", "p_assigned_by" "uuid", "p_is_primary" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."assign_user_role"("p_user_id" "uuid", "p_role" "text", "p_assigned_by" "uuid", "p_is_primary" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_user_role"("p_user_id" "uuid", "p_role" "text", "p_assigned_by" "uuid", "p_is_primary" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."block_organizer_sensitive_tournament_updates"() TO "anon";
GRANT ALL ON FUNCTION "public"."block_organizer_sensitive_tournament_updates"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."block_organizer_sensitive_tournament_updates"() TO "service_role";



GRANT ALL ON FUNCTION "public"."block_team_stats_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."block_team_stats_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."block_team_stats_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."block_venue_booking_payment_spoofing"() TO "anon";
GRANT ALL ON FUNCTION "public"."block_venue_booking_payment_spoofing"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."block_venue_booking_payment_spoofing"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cascade_stage_bestof_to_vetos"() TO "anon";
GRANT ALL ON FUNCTION "public"."cascade_stage_bestof_to_vetos"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cascade_stage_bestof_to_vetos"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_soft_deletes"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_soft_deletes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_soft_deletes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."copy_storage_object"("src_bucket" "text", "src_name" "text", "dest_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."copy_storage_object"("src_bucket" "text", "src_name" "text", "dest_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."copy_storage_object"("src_bucket" "text", "src_name" "text", "dest_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_notification"("user_id" "uuid", "title" "text", "message" "text", "type" "public"."notification_type", "data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_notification"("user_id" "uuid", "title" "text", "message" "text", "type" "public"."notification_type", "data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_notification"("user_id" "uuid", "title" "text", "message" "text", "type" "public"."notification_type", "data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_user_team_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_team_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_team_ids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."decline_team_invite"("invite_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."decline_team_invite"("invite_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decline_team_invite"("invite_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_organization_safely"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_organization_safely"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_organization_safely"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_roster_member_limits"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_roster_member_limits"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_roster_member_limits"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enroll_team_in_stage"("p_stage_id" "uuid", "p_team_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."enroll_team_in_stage"("p_stage_id" "uuid", "p_team_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."enroll_team_in_stage"("p_stage_id" "uuid", "p_team_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_wallet"("p_owner" "public"."wallet_owner", "p_owner_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_wallet"("p_owner" "public"."wallet_owner", "p_owner_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_wallet"("p_owner" "public"."wallet_owner", "p_owner_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."finalize_match_locked"("p_match_id" "uuid", "p_expected_version" integer, "p_winner_id" "uuid", "p_loser_id" "uuid", "p_team1_score" integer, "p_team2_score" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."finalize_match_locked"("p_match_id" "uuid", "p_expected_version" integer, "p_winner_id" "uuid", "p_loser_id" "uuid", "p_team1_score" integer, "p_team2_score" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."finalize_match_locked"("p_match_id" "uuid", "p_expected_version" integer, "p_winner_id" "uuid", "p_loser_id" "uuid", "p_team1_score" integer, "p_team2_score" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fix_match_veto_state"("p_veto_id" "uuid", "p_team1_id" "uuid", "p_team2_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fix_match_veto_state"("p_veto_id" "uuid", "p_team1_id" "uuid", "p_team2_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fix_match_veto_state"("p_veto_id" "uuid", "p_team1_id" "uuid", "p_team2_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sync_tournament_organizer"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sync_tournament_organizer"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sync_tournament_organizer"() TO "service_role";



GRANT ALL ON FUNCTION "public"."forfeit_match"("p_match_id" "uuid", "p_forfeiting_team_id" "uuid", "p_winning_team_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."forfeit_match"("p_match_id" "uuid", "p_forfeiting_team_id" "uuid", "p_winning_team_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."forfeit_match"("p_match_id" "uuid", "p_forfeiting_team_id" "uuid", "p_winning_team_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."forfeit_match"("p_match_id" "uuid", "p_forfeiting_team_id" "uuid", "p_winning_team_id" "uuid", "p_reason" "text", "p_winner_score" integer, "p_loser_score" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."forfeit_match"("p_match_id" "uuid", "p_forfeiting_team_id" "uuid", "p_winning_team_id" "uuid", "p_reason" "text", "p_winner_score" integer, "p_loser_score" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."forfeit_match"("p_match_id" "uuid", "p_forfeiting_team_id" "uuid", "p_winning_team_id" "uuid", "p_reason" "text", "p_winner_score" integer, "p_loser_score" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_dummy_teams"("target_tournament_id" "uuid", "count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_dummy_teams"("target_tournament_id" "uuid", "count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_dummy_teams"("target_tournament_id" "uuid", "count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_profile_license_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_profile_license_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_profile_license_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_stage_bracket"("p_stage_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_stage_bracket"("p_stage_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_stage_bracket"("p_stage_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_dashboard_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_dashboard_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_dashboard_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_organizer_tournaments_with_counts"("p_organizer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_organizer_tournaments_with_counts"("p_organizer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_organizer_tournaments_with_counts"("p_organizer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_roster_members"("r_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_roster_members"("r_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_roster_members"("r_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_stage_best_of"("p_stage_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_stage_best_of"("p_stage_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_stage_best_of"("p_stage_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_stage_teams"("p_stage_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_stage_teams"("p_stage_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_stage_teams"("p_stage_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_team_members"("t_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_team_members"("t_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_team_members"("t_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_team_roster"("t_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_team_roster"("t_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_team_roster"("t_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_team_roster"("t_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_tournament_participant_count"("t_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_tournament_participant_count"("t_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tournament_participant_count"("t_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_tournament_registration_count"("tournament_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_tournament_registration_count"("tournament_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tournament_registration_count"("tournament_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_permissions"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_permissions"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_permissions"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_roles"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_roles"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_roles"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_tournament_registrations"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_tournament_registrations"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_tournament_registrations"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_verification_request_basic"("request_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_verification_request_basic"("request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_verification_request_basic"("request_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_verification_request_with_data"("request_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_verification_request_with_data"("request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_verification_request_with_data"("request_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_verified_roles"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_verified_roles"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_verified_roles"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_sponsor_interaction"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_sponsor_interaction"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_sponsor_interaction"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_admin_permission"("permission_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_admin_permission"("permission_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_admin_permission"("permission_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_super_admin_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."has_super_admin_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_super_admin_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_verified_role"("role_name" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_verified_role"("role_name" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_verified_role"("role_name" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."initialize_match_veto"("p_match_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."initialize_match_veto"("p_match_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."initialize_match_veto"("p_match_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."initialize_match_veto"("p_match_id" "uuid", "p_veto_format" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."initialize_match_veto"("p_match_id" "uuid", "p_veto_format" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."initialize_match_veto"("p_match_id" "uuid", "p_veto_format" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin_user"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_user"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_user"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_org_active_staff"("_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_org_active_staff"("_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_org_active_staff"("_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_org_admin"("_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_org_admin"("_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_org_admin"("_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_org_staff_user"("_org_staff_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_org_staff_user"("_org_staff_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_org_staff_user"("_org_staff_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_team_owner"("tid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_team_owner"("tid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_team_owner"("tid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_user_registered_for_tournament"("tournament_uuid" "uuid", "user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_user_registered_for_tournament"("tournament_uuid" "uuid", "user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_user_registered_for_tournament"("tournament_uuid" "uuid", "user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."proc_advance_bracket_match"() TO "anon";
GRANT ALL ON FUNCTION "public"."proc_advance_bracket_match"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."proc_advance_bracket_match"() TO "service_role";



GRANT ALL ON FUNCTION "public"."proc_internal_advance_match"("p_source_match_id" "uuid", "p_winner_id" "uuid", "p_loser_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."proc_internal_advance_match"("p_source_match_id" "uuid", "p_winner_id" "uuid", "p_loser_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."proc_internal_advance_match"("p_source_match_id" "uuid", "p_winner_id" "uuid", "p_loser_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_daily_sponsor_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_daily_sponsor_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_daily_sponsor_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reject_verification_request"("request_id" "uuid", "rejection_reason" "text", "admin_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."reject_verification_request"("request_id" "uuid", "rejection_reason" "text", "admin_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_verification_request"("request_id" "uuid", "rejection_reason" "text", "admin_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_user_role"("p_user_id" "uuid", "p_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_user_role"("p_user_id" "uuid", "p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_user_role"("p_user_id" "uuid", "p_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."reorder_tournament_stages"("p_stage_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."reorder_tournament_stages"("p_stage_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."reorder_tournament_stages"("p_stage_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_match_veto"("p_match_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reset_match_veto"("p_match_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_match_veto"("p_match_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_tournament_bracket"("p_tournament_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reset_tournament_bracket"("p_tournament_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_tournament_bracket"("p_tournament_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_tournament_vetos"("p_tournament_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reset_tournament_vetos"("p_tournament_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_tournament_vetos"("p_tournament_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rollup_daily_sponsor_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."rollup_daily_sponsor_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rollup_daily_sponsor_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_stage_from_registrations"("p_stage_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."seed_stage_from_registrations"("p_stage_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_stage_from_registrations"("p_stage_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_stage1_initial_capacity"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_stage1_initial_capacity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_stage1_initial_capacity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."suspend_user"("p_user_id" "uuid", "p_reason" "text", "p_duration_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."suspend_user"("p_user_id" "uuid", "p_reason" "text", "p_duration_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."suspend_user"("p_user_id" "uuid", "p_reason" "text", "p_duration_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_stage1_capacity"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_stage1_capacity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_stage1_capacity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_veto_bestof_from_stage"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_veto_bestof_from_stage"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_veto_bestof_from_stage"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_match_completed_webhook"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_match_completed_webhook"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_match_completed_webhook"() TO "service_role";



GRANT ALL ON FUNCTION "public"."undo_match_advancement"("p_match_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."undo_match_advancement"("p_match_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."undo_match_advancement"("p_match_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_cs2_map_scores_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_cs2_map_scores_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_cs2_map_scores_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_match_draft_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_match_draft_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_match_draft_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_organizations_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_organizations_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_organizations_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_tournament_registrations_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_tournament_registrations_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_tournament_registrations_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_permission"("p_user_id" "uuid", "p_permission" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_permission"("p_user_id" "uuid", "p_permission" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_permission"("p_user_id" "uuid", "p_permission" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_role"("p_user_id" "uuid", "p_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_role"("p_user_id" "uuid", "p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_role"("p_user_id" "uuid", "p_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_roster_name_match"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_roster_name_match"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_roster_name_match"() TO "service_role";



GRANT ALL ON FUNCTION "public"."wallet_credit"("p_wallet" "uuid", "p_amount" bigint, "p_ref_type" "text", "p_ref_id" "uuid", "p_memo" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."wallet_credit"("p_wallet" "uuid", "p_amount" bigint, "p_ref_type" "text", "p_ref_id" "uuid", "p_memo" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."wallet_credit"("p_wallet" "uuid", "p_amount" bigint, "p_ref_type" "text", "p_ref_id" "uuid", "p_memo" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."wallet_debit"("p_wallet" "uuid", "p_amount" bigint, "p_ref_type" "text", "p_ref_id" "uuid", "p_memo" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."wallet_debit"("p_wallet" "uuid", "p_amount" bigint, "p_ref_type" "text", "p_ref_id" "uuid", "p_memo" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."wallet_debit"("p_wallet" "uuid", "p_amount" bigint, "p_ref_type" "text", "p_ref_id" "uuid", "p_memo" "text") TO "service_role";



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;












GRANT ALL ON TABLE "public"."admin_permissions" TO "anon";
GRANT ALL ON TABLE "public"."admin_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."admin_role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."admin_role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."admin_roles" TO "anon";
GRANT ALL ON TABLE "public"."admin_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_roles" TO "service_role";



GRANT ALL ON TABLE "public"."admin_user_roles" TO "anon";
GRANT ALL ON TABLE "public"."admin_user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."brkt_advancements" TO "anon";
GRANT ALL ON TABLE "public"."brkt_advancements" TO "authenticated";
GRANT ALL ON TABLE "public"."brkt_advancements" TO "service_role";



GRANT ALL ON TABLE "public"."brkt_layout" TO "anon";
GRANT ALL ON TABLE "public"."brkt_layout" TO "authenticated";
GRANT ALL ON TABLE "public"."brkt_layout" TO "service_role";



GRANT ALL ON TABLE "public"."brkt_match_events" TO "anon";
GRANT ALL ON TABLE "public"."brkt_match_events" TO "authenticated";
GRANT ALL ON TABLE "public"."brkt_match_events" TO "service_role";



GRANT ALL ON TABLE "public"."brkt_match_games" TO "anon";
GRANT ALL ON TABLE "public"."brkt_match_games" TO "authenticated";
GRANT ALL ON TABLE "public"."brkt_match_games" TO "service_role";



GRANT ALL ON TABLE "public"."brkt_matches" TO "anon";
GRANT ALL ON TABLE "public"."brkt_matches" TO "authenticated";
GRANT ALL ON TABLE "public"."brkt_matches" TO "service_role";



GRANT ALL ON TABLE "public"."brkt_versions" TO "anon";
GRANT ALL ON TABLE "public"."brkt_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."brkt_versions" TO "service_role";



GRANT ALL ON TABLE "public"."daily_sponsor_stats" TO "postgres";
GRANT ALL ON TABLE "public"."daily_sponsor_stats" TO "anon";
GRANT ALL ON TABLE "public"."daily_sponsor_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_sponsor_stats" TO "service_role";



GRANT ALL ON TABLE "public"."dispute_comments" TO "anon";
GRANT ALL ON TABLE "public"."dispute_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."dispute_comments" TO "service_role";



GRANT ALL ON TABLE "public"."game_maps" TO "anon";
GRANT ALL ON TABLE "public"."game_maps" TO "authenticated";
GRANT ALL ON TABLE "public"."game_maps" TO "service_role";



GRANT ALL ON TABLE "public"."match_checkins" TO "anon";
GRANT ALL ON TABLE "public"."match_checkins" TO "authenticated";
GRANT ALL ON TABLE "public"."match_checkins" TO "service_role";



GRANT ALL ON TABLE "public"."match_completed_events" TO "anon";
GRANT ALL ON TABLE "public"."match_completed_events" TO "authenticated";
GRANT ALL ON TABLE "public"."match_completed_events" TO "service_role";



GRANT ALL ON TABLE "public"."match_map_veto_actions" TO "anon";
GRANT ALL ON TABLE "public"."match_map_veto_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."match_map_veto_actions" TO "service_role";



GRANT ALL ON TABLE "public"."match_map_vetos" TO "anon";
GRANT ALL ON TABLE "public"."match_map_vetos" TO "authenticated";
GRANT ALL ON TABLE "public"."match_map_vetos" TO "service_role";



GRANT ALL ON TABLE "public"."match_messages" TO "anon";
GRANT ALL ON TABLE "public"."match_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."match_messages" TO "service_role";



GRANT ALL ON TABLE "public"."match_result_reports" TO "anon";
GRANT ALL ON TABLE "public"."match_result_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."match_result_reports" TO "service_role";



GRANT ALL ON TABLE "public"."match_time_proposals" TO "anon";
GRANT ALL ON TABLE "public"."match_time_proposals" TO "authenticated";
GRANT ALL ON TABLE "public"."match_time_proposals" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."organization_albums" TO "anon";
GRANT ALL ON TABLE "public"."organization_albums" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_albums" TO "service_role";



GRANT ALL ON TABLE "public"."organization_media" TO "anon";
GRANT ALL ON TABLE "public"."organization_media" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_media" TO "service_role";



GRANT ALL ON TABLE "public"."organization_staff" TO "anon";
GRANT ALL ON TABLE "public"."organization_staff" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_staff" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."partner_applications" TO "anon";
GRANT ALL ON TABLE "public"."partner_applications" TO "authenticated";
GRANT ALL ON TABLE "public"."partner_applications" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "public"."riot_accounts" TO "anon";
GRANT ALL ON TABLE "public"."riot_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."riot_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."sponsor_accounts" TO "anon";
GRANT ALL ON TABLE "public"."sponsor_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."sponsor_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."sponsor_impressions" TO "anon";
GRANT ALL ON TABLE "public"."sponsor_impressions" TO "authenticated";
GRANT ALL ON TABLE "public"."sponsor_impressions" TO "service_role";



GRANT ALL ON TABLE "public"."sponsors" TO "anon";
GRANT ALL ON TABLE "public"."sponsors" TO "authenticated";
GRANT ALL ON TABLE "public"."sponsors" TO "service_role";



GRANT ALL ON TABLE "public"."staff_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."staff_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."staff_tournament_assignments" TO "anon";
GRANT ALL ON TABLE "public"."staff_tournament_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_tournament_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."stage_participants" TO "anon";
GRANT ALL ON TABLE "public"."stage_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."stage_participants" TO "service_role";



GRANT ALL ON TABLE "public"."system_settings" TO "anon";
GRANT ALL ON TABLE "public"."system_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."system_settings" TO "service_role";



GRANT ALL ON TABLE "public"."team_invitations" TO "anon";
GRANT ALL ON TABLE "public"."team_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."team_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."team_members" TO "anon";
GRANT ALL ON TABLE "public"."team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members" TO "service_role";



GRANT ALL ON TABLE "public"."team_roster_members" TO "anon";
GRANT ALL ON TABLE "public"."team_roster_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_roster_members" TO "service_role";



GRANT ALL ON TABLE "public"."team_rosters" TO "anon";
GRANT ALL ON TABLE "public"."team_rosters" TO "authenticated";
GRANT ALL ON TABLE "public"."team_rosters" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_announcements" TO "anon";
GRANT ALL ON TABLE "public"."tournament_announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_announcements" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_bans" TO "anon";
GRANT ALL ON TABLE "public"."tournament_bans" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_bans" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_disputes" TO "anon";
GRANT ALL ON TABLE "public"."tournament_disputes" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_disputes" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_map_pools" TO "anon";
GRANT ALL ON TABLE "public"."tournament_map_pools" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_map_pools" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_match_results" TO "anon";
GRANT ALL ON TABLE "public"."tournament_match_results" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_match_results" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_participants" TO "anon";
GRANT ALL ON TABLE "public"."tournament_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_participants" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_staff" TO "anon";
GRANT ALL ON TABLE "public"."tournament_staff" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_staff" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_stages" TO "anon";
GRANT ALL ON TABLE "public"."tournament_stages" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_stages" TO "service_role";



GRANT ALL ON TABLE "public"."tournaments" TO "anon";
GRANT ALL ON TABLE "public"."tournaments" TO "authenticated";
GRANT ALL ON TABLE "public"."tournaments" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."user_role_summary" TO "anon";
GRANT ALL ON TABLE "public"."user_role_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."user_role_summary" TO "service_role";



GRANT ALL ON TABLE "public"."v_tournament_details" TO "anon";
GRANT ALL ON TABLE "public"."v_tournament_details" TO "authenticated";
GRANT ALL ON TABLE "public"."v_tournament_details" TO "service_role";



GRANT ALL ON TABLE "public"."valorant_player_stats" TO "anon";
GRANT ALL ON TABLE "public"."valorant_player_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."valorant_player_stats" TO "service_role";



GRANT ALL ON TABLE "public"."venue_availability" TO "anon";
GRANT ALL ON TABLE "public"."venue_availability" TO "authenticated";
GRANT ALL ON TABLE "public"."venue_availability" TO "service_role";



GRANT ALL ON TABLE "public"."venue_bookings" TO "anon";
GRANT ALL ON TABLE "public"."venue_bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."venue_bookings" TO "service_role";



GRANT ALL ON TABLE "public"."venue_reviews" TO "anon";
GRANT ALL ON TABLE "public"."venue_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."venue_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."venues" TO "anon";
GRANT ALL ON TABLE "public"."venues" TO "authenticated";
GRANT ALL ON TABLE "public"."venues" TO "service_role";



GRANT ALL ON TABLE "public"."verification_requests" TO "anon";
GRANT ALL ON TABLE "public"."verification_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."verification_requests" TO "service_role";



GRANT ALL ON TABLE "public"."verified_roles" TO "anon";
GRANT ALL ON TABLE "public"."verified_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."verified_roles" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";


























RESET ALL;
