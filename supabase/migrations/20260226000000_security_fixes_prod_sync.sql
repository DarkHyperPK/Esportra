-- ============================================================================
-- Production Security Sync Migration
-- Applies all security vulnerability fixes from local to production.
-- ============================================================================

-- ============================================================================
-- 1. DROP OLD COLUMNS (is_banned, ban_reason) from profiles
-- ============================================================================
ALTER TABLE profiles DROP COLUMN IF EXISTS is_banned;
ALTER TABLE profiles DROP COLUMN IF EXISTS ban_reason;

-- ============================================================================
-- 2. SECURITY TRIGGER: Block organizer mass assignment on tournaments
-- ============================================================================
CREATE OR REPLACE FUNCTION public.block_organizer_sensitive_tournament_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;

DROP TRIGGER IF EXISTS trg_block_organizer_tournament_updates ON tournaments;
CREATE TRIGGER trg_block_organizer_tournament_updates
  BEFORE UPDATE ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION block_organizer_sensitive_tournament_updates();

-- ============================================================================
-- 3. SECURITY TRIGGER: Block team stats falsification
-- ============================================================================
CREATE OR REPLACE FUNCTION public.block_team_stats_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;

DROP TRIGGER IF EXISTS trg_block_team_stats_update ON teams;
CREATE TRIGGER trg_block_team_stats_update
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION block_team_stats_update();

-- ============================================================================
-- 4. SECURITY TRIGGER: Block venue booking payment spoofing
-- ============================================================================
CREATE OR REPLACE FUNCTION public.block_venue_booking_payment_spoofing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;

DROP TRIGGER IF EXISTS trg_block_venue_booking_payment_spoofing ON venue_bookings;
CREATE TRIGGER trg_block_venue_booking_payment_spoofing
  BEFORE UPDATE ON venue_bookings
  FOR EACH ROW
  EXECUTE FUNCTION block_venue_booking_payment_spoofing();

-- ============================================================================
-- 5. HARDENED RLS: team_members insert policy (require accepted invitation)
-- ============================================================================
DROP POLICY IF EXISTS team_members_insert_policy ON team_members;
CREATE POLICY team_members_insert_policy ON team_members
  FOR INSERT WITH CHECK (
    -- Team owner can add members
    (EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_members.team_id AND t.owner_id = auth.uid()
    ))
    OR
    -- User can join if they have an accepted invitation
    (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM team_invitations ti
        WHERE ti.team_id = team_members.team_id
          AND (ti.invited_user_id = auth.uid() OR ti.invited_email = (SELECT email FROM profiles WHERE id = auth.uid()))
          AND ti.status = 'accepted'
      )
    )
    OR
    -- Service role bypass
    (current_setting('request.jwt.claim.role', true) = 'service_role')
  );

-- ============================================================================
-- 6. HARDENED RLS: match_result_reports insert (reporter must be in match)
-- ============================================================================
DROP POLICY IF EXISTS match_result_reports_insert ON match_result_reports;
CREATE POLICY match_result_reports_insert ON match_result_reports
  FOR INSERT WITH CHECK (
    (
      auth.uid() = reported_by
      AND EXISTS (
        SELECT 1
        FROM brkt_matches m
        JOIN team_members tm ON (tm.team_id = m.team1_id OR tm.team_id = m.team2_id)
        WHERE m.id = match_result_reports.match_id
          AND tm.user_id = auth.uid()
          AND tm.is_active = true
      )
    )
    OR
    (current_setting('request.jwt.claim.role', true) = 'service_role')
  );

-- ============================================================================
-- 7. HARDENED RLS: tournament_participants insert (free tournaments only)
-- ============================================================================
DROP POLICY IF EXISTS tournament_participants_insert_policy ON tournament_participants;
CREATE POLICY tournament_participants_insert_policy ON tournament_participants
  FOR INSERT WITH CHECK (
    (
      (user_id = auth.uid() OR team_captain_id = auth.uid())
      AND EXISTS (
        SELECT 1 FROM tournaments t
        WHERE t.id = tournament_participants.tournament_id
          AND (t.entry_fee IS NULL OR t.entry_fee = 0)
          AND t.status = 'open'
      )
    )
    OR
    (current_setting('request.jwt.claim.role', true) = 'service_role')
  );
