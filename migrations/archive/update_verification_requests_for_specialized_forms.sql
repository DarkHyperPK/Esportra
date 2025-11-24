-- Update verification_requests table to support specialized organizer and venue owner data
-- This script adds new columns to store role-specific information

-- First, ensure all basic columns exist (run the fix_verification_requests_table.sql first)
-- Add new columns for specialized data
ALTER TABLE public.verification_requests 
ADD COLUMN IF NOT EXISTS organizer_data JSONB,
ADD COLUMN IF NOT EXISTS venue_data JSONB,
ADD COLUMN IF NOT EXISTS venue_images JSONB;

-- Ensure contact_email column exists (in case it wasn't added by the previous script)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'verification_requests' AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE verification_requests ADD COLUMN contact_email VARCHAR(255);
  END IF;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_verification_requests_organizer_data 
ON public.verification_requests USING GIN (organizer_data);

CREATE INDEX IF NOT EXISTS idx_verification_requests_venue_data 
ON public.verification_requests USING GIN (venue_data);

-- Update RLS policies to include new columns
DROP POLICY IF EXISTS "Users can view their own verification requests" ON public.verification_requests;
CREATE POLICY "Users can view their own verification requests" ON public.verification_requests
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own verification requests" ON public.verification_requests;
CREATE POLICY "Users can create their own verification requests" ON public.verification_requests
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON COLUMN public.verification_requests.organizer_data IS 'JSONB field containing organizer-specific data like organization_type, years_experience, etc.';
COMMENT ON COLUMN public.verification_requests.venue_data IS 'JSONB field containing venue-specific data like total_pcs, amenities, games_available, etc.';
COMMENT ON COLUMN public.verification_requests.venue_images IS 'JSONB field containing paths to venue images like exterior, interior, gaming_area, additional photos';

-- Create a function to get verification request with role-specific data
-- This function handles missing columns gracefully
CREATE OR REPLACE FUNCTION get_verification_request_with_data(request_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  requested_role TEXT,
  status TEXT,
  first_name TEXT,
  last_name TEXT,
  business_name TEXT,
  business_type TEXT,
  contact_email TEXT,
  created_at TIMESTAMPTZ,
  organizer_data JSONB,
  venue_data JSONB,
  venue_images JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_verification_request_with_data(UUID) TO authenticated;
