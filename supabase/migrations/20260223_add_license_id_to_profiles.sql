-- Add license_id to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS license_id UUID UNIQUE;

-- Create function to generate and assign license ID
CREATE OR REPLACE FUNCTION public.generate_profile_license_id()
RETURNS TRIGGER AS $$
BEGIN
  -- We only care about approved and active business roles (organizer or venue_owner)
  IF NEW.status = 'approved' AND NEW.is_active = true AND NEW.role IN ('organizer', 'venue_owner') THEN
    -- Check if the user already has a license_id
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.user_id AND license_id IS NOT NULL) THEN
      -- Automatically assign a new license ID
      UPDATE public.profiles
      SET license_id = gen_random_uuid()
      WHERE id = NEW.user_id AND license_id IS NULL;
      
      -- Add an audit log entry explicitly stating the license was granted
      INSERT INTO public.audit_logs (action, resource_type, resource_id, details, created_by)
      VALUES (
        'license_granted', 
        'user', 
        NEW.user_id, 
        jsonb_build_object('role', NEW.role, 'verified_role_id', NEW.id),
        NEW.verified_by
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to verified_roles
DROP TRIGGER IF EXISTS on_business_role_approved ON public.verified_roles;
CREATE TRIGGER on_business_role_approved
AFTER INSERT OR UPDATE ON public.verified_roles
FOR EACH ROW
EXECUTE FUNCTION public.generate_profile_license_id();

-- Backfill existing approved and active business roles
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT DISTINCT user_id 
    FROM public.verified_roles 
    WHERE status = 'approved' 
      AND is_active = true 
      AND role IN ('organizer', 'venue_owner')
  LOOP
    -- Only assign if they don't already have one
    UPDATE public.profiles
    SET license_id = gen_random_uuid()
    WHERE id = r.user_id AND license_id IS NULL;
  END LOOP;
END;
$$;
