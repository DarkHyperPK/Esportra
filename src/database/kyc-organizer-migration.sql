-- KYC (Organizer) minimal fields on verification_requests
-- Idempotent alterations

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='verification_requests') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name='verification_requests' AND column_name='first_name'
    ) THEN
      ALTER TABLE verification_requests ADD COLUMN first_name TEXT;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name='verification_requests' AND column_name='last_name'
    ) THEN
      ALTER TABLE verification_requests ADD COLUMN last_name TEXT;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name='verification_requests' AND column_name='dob'
    ) THEN
      ALTER TABLE verification_requests ADD COLUMN dob DATE;
    END IF;
    -- new columns for front/back CNIC images
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name='verification_requests' AND column_name='cnic_front_path'
    ) THEN
      ALTER TABLE verification_requests ADD COLUMN cnic_front_path TEXT;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name='verification_requests' AND column_name='cnic_back_path'
    ) THEN
      ALTER TABLE verification_requests ADD COLUMN cnic_back_path TEXT;
    END IF;
  END IF;
END $$;

-- Helpful index when filtering by role
CREATE INDEX IF NOT EXISTS idx_verification_requests_role ON verification_requests(requested_role);


