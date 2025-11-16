-- Fix verification_requests table to match form requirements
-- Run this in your Supabase SQL editor

-- Add missing columns to verification_requests table
DO $$
BEGIN
  -- Add business_address column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'verification_requests' AND column_name = 'business_address'
  ) THEN
    ALTER TABLE verification_requests ADD COLUMN business_address TEXT;
  END IF;

  -- Add contact_email column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'verification_requests' AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE verification_requests ADD COLUMN contact_email VARCHAR(255);
  END IF;

  -- Add contact_phone column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'verification_requests' AND column_name = 'contact_phone'
  ) THEN
    ALTER TABLE verification_requests ADD COLUMN contact_phone VARCHAR(20);
  END IF;

  -- Add website column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'verification_requests' AND column_name = 'website'
  ) THEN
    ALTER TABLE verification_requests ADD COLUMN website VARCHAR(255);
  END IF;

  -- Add social_media_links column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'verification_requests' AND column_name = 'social_media_links'
  ) THEN
    ALTER TABLE verification_requests ADD COLUMN social_media_links JSONB DEFAULT '{}';
  END IF;

  -- Add previous_experience column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'verification_requests' AND column_name = 'previous_experience'
  ) THEN
    ALTER TABLE verification_requests ADD COLUMN previous_experience TEXT;
  END IF;

  -- Add expected_tournaments_per_month column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'verification_requests' AND column_name = 'expected_tournaments_per_month'
  ) THEN
    ALTER TABLE verification_requests ADD COLUMN expected_tournaments_per_month INTEGER DEFAULT 0;
  END IF;

  -- Add first_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'verification_requests' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE verification_requests ADD COLUMN first_name VARCHAR(255);
  END IF;

  -- Add last_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'verification_requests' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE verification_requests ADD COLUMN last_name VARCHAR(255);
  END IF;

  -- Add dob column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'verification_requests' AND column_name = 'dob'
  ) THEN
    ALTER TABLE verification_requests ADD COLUMN dob DATE;
  END IF;

  -- Add cnic_front_path column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'verification_requests' AND column_name = 'cnic_front_path'
  ) THEN
    ALTER TABLE verification_requests ADD COLUMN cnic_front_path TEXT;
  END IF;

  -- Add cnic_back_path column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'verification_requests' AND column_name = 'cnic_back_path'
  ) THEN
    ALTER TABLE verification_requests ADD COLUMN cnic_back_path TEXT;
  END IF;

  -- Add verification_notes column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'verification_requests' AND column_name = 'verification_notes'
  ) THEN
    ALTER TABLE verification_requests ADD COLUMN verification_notes TEXT;
  END IF;

  -- Add reviewed_by column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'verification_requests' AND column_name = 'reviewed_by'
  ) THEN
    ALTER TABLE verification_requests ADD COLUMN reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  -- Add reviewed_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'verification_requests' AND column_name = 'reviewed_at'
  ) THEN
    ALTER TABLE verification_requests ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add rejection_reason column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'verification_requests' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE verification_requests ADD COLUMN rejection_reason TEXT;
  END IF;

  -- Add created_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'verification_requests' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE verification_requests ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'verification_requests' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE verification_requests ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

END $$;

-- Create updated_at trigger for verification_requests
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_verification_requests_updated_at ON verification_requests;
CREATE TRIGGER update_verification_requests_updated_at 
    BEFORE UPDATE ON verification_requests 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_verification_requests_user_id ON verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_verification_requests_requested_role ON verification_requests(requested_role);
CREATE INDEX IF NOT EXISTS idx_verification_requests_created_at ON verification_requests(created_at);

-- Create unique partial index for one pending request per user per role
CREATE UNIQUE INDEX IF NOT EXISTS idx_verification_requests_unique_pending 
ON verification_requests (user_id, requested_role) 
WHERE status = 'pending';

-- Enable RLS on verification_requests table
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for verification_requests
DROP POLICY IF EXISTS "Users can view their own verification requests" ON verification_requests;
CREATE POLICY "Users can view their own verification requests" ON verification_requests
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own verification requests" ON verification_requests;
CREATE POLICY "Users can insert their own verification requests" ON verification_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own verification requests" ON verification_requests;
CREATE POLICY "Users can update their own verification requests" ON verification_requests
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all verification requests" ON verification_requests;
CREATE POLICY "Admins can view all verification requests" ON verification_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND is_admin = true
        )
    );

DROP POLICY IF EXISTS "Admins can update verification requests" ON verification_requests;
CREATE POLICY "Admins can update verification requests" ON verification_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND is_admin = true
        )
    );
