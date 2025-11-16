-- Fix the verification function to handle missing columns gracefully
-- First, let's check what columns exist and create a more robust function

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_verification_request_with_data(UUID);

-- Create a more robust function that handles missing columns
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

-- Also create a simpler function that just gets basic verification request data
CREATE OR REPLACE FUNCTION get_verification_request_basic(request_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  requested_role TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
) 
LANGUAGE SQL
SECURITY DEFINER
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_verification_request_basic(UUID) TO authenticated;
