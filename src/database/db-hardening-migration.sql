-- DB hardening and alignment migration (idempotent)

-- 1) Enumerated statuses and checks
DO $$
BEGIN
  -- tournaments.status enum-like check
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='tournaments' AND column_name='status'
  ) THEN
    -- assume exists; skip
    NULL;
  END IF;
  -- ensure reasonable values (fallback CHECK)
  BEGIN
    ALTER TABLE tournaments
      ADD CONSTRAINT tournaments_status_chk CHECK (status IN (
        'draft','published','registration_open','registration_closed','ongoing','completed','cancelled'
      ));
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  -- verification_requests.status
  BEGIN
    ALTER TABLE verification_requests
      ADD CONSTRAINT verification_status_chk CHECK (status IN ('pending','approved','rejected'));
  EXCEPTION 
    WHEN undefined_table THEN NULL;
    WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 2) Foreign keys
DO $$
BEGIN
  -- verification_requests.user_id -> profiles.id
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='verification_requests' AND column_name='user_id') THEN
    BEGIN
      ALTER TABLE verification_requests
        ADD CONSTRAINT vr_user_fk FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;

  -- tournaments.user_id -> profiles.id (organizer)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tournaments' AND column_name='user_id') THEN
    BEGIN
      ALTER TABLE tournaments
        ADD CONSTRAINT tournaments_user_fk FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- 3) Uniqueness constraints
DO $$
BEGIN
  -- Only one active verification per (user, requested_role)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='verification_requests') THEN
    BEGIN
      CREATE UNIQUE INDEX IF NOT EXISTS idx_verification_active_unique
      ON verification_requests (user_id, requested_role)
      WHERE status = 'pending';
    EXCEPTION WHEN undefined_table THEN NULL; END;
  END IF;
END $$;

-- 4) Created_at defaults
DO $$
BEGIN
  -- add created_at if missing
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='verification_requests' AND column_name='submitted_at') THEN
    -- ok
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='verification_requests') THEN
    BEGIN
      ALTER TABLE verification_requests ADD COLUMN submitted_at timestamptz DEFAULT now();
    EXCEPTION WHEN duplicate_column THEN NULL; END;
  END IF;
END $$;

-- 5) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_tournaments_status_created ON tournaments(status, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_time ON audit_logs(action_type, created_at);
CREATE INDEX IF NOT EXISTS idx_verification_status_time ON verification_requests(status, submitted_at);

-- 6) Final diagnostics
SELECT 'ok' AS db_hardening_result;


