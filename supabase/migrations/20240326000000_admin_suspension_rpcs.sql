-- Add secure RPC endpoints to handle administrative suspension logic safely, bypassing RLS recursion.

CREATE OR REPLACE FUNCTION admin_suspend_user(
  target_user_id UUID,
  reason TEXT,
  duration TEXT,
  type TEXT,
  until_time TIMESTAMP WITH TIME ZONE
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION admin_unsuspend_user(
  target_user_id UUID
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
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
