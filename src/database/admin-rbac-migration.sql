-- Admin RBAC Migration
-- Idempotent creation of admin roles/permissions separate from public roles

-- Admin flags on profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'admin_roles'
  ) THEN
    ALTER TABLE profiles ADD COLUMN admin_roles TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'admin_permissions'
  ) THEN
    ALTER TABLE profiles ADD COLUMN admin_permissions TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;
END $$;

-- Core RBAC tables
CREATE TABLE IF NOT EXISTS admin_roles (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL, -- e.g. super_admin, ops_admin
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_permissions (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL, -- e.g. tournament:approve
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_role_permissions (
  role_id INT REFERENCES admin_roles(id) ON DELETE CASCADE,
  permission_id INT REFERENCES admin_permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS admin_user_roles (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role_id INT REFERENCES admin_roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- Helper function: check permission for a user
CREATE OR REPLACE FUNCTION admin_user_has_permission(p_user UUID, p_permission TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- direct permission override on profile
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_user AND admin_permissions @> ARRAY[p_permission]
  ) THEN RETURN TRUE; END IF;

  -- through role mapping
  RETURN EXISTS (
    SELECT 1
    FROM admin_user_roles ur
    JOIN admin_role_permissions rp ON rp.role_id = ur.role_id
    JOIN admin_permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = p_user AND p.key = p_permission
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- helper to list effective permissions for user
CREATE OR REPLACE FUNCTION get_admin_permissions_for_user(p_user UUID)
RETURNS TEXT[] AS $$
DECLARE result TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT array_agg(key) INTO result FROM (
    SELECT DISTINCT p.key
    FROM admin_user_roles ur
    JOIN admin_role_permissions rp ON rp.role_id = ur.role_id
    JOIN admin_permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = p_user
  ) q;

  -- merge explicit overrides
  SELECT COALESCE(result, ARRAY[]::TEXT[]) || COALESCE(admin_permissions, ARRAY[]::TEXT[])
  INTO result FROM profiles WHERE id = p_user;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPCs
-- Ensure old signatures are removed to avoid overload ambiguity
DROP FUNCTION IF EXISTS admin_assign_role(uuid, text);
DROP FUNCTION IF EXISTS admin_revoke_role(uuid, text);

CREATE OR REPLACE FUNCTION admin_assign_role(p_user UUID, p_role_key TEXT, p_actor UUID DEFAULT auth.uid())
RETURNS VOID AS $$
DECLARE r_id INT;
DECLARE v_target_email TEXT;
DECLARE v_actor_email TEXT;
BEGIN
  SELECT id INTO r_id FROM admin_roles WHERE key = p_role_key;
  IF r_id IS NULL THEN RAISE EXCEPTION 'Role % not found', p_role_key; END IF;
  INSERT INTO admin_user_roles(user_id, role_id)
  VALUES (p_user, r_id)
  ON CONFLICT DO NOTHING;
  UPDATE profiles SET is_admin = TRUE WHERE id = p_user;

  -- audit log
  SELECT email INTO v_target_email FROM auth.users WHERE id = p_user;
  SELECT email INTO v_actor_email FROM auth.users WHERE id = p_actor;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    INSERT INTO audit_logs (admin_id, admin_name, action_type, target_type, target_id, target_name, details, severity)
    VALUES (p_actor, COALESCE(v_actor_email,'system'), 'admin_role_assign', 'user', p_user, COALESCE(v_target_email,'unknown'), jsonb_build_object('role', p_role_key), 'medium');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_revoke_role(p_user UUID, p_role_key TEXT, p_actor UUID DEFAULT auth.uid())
RETURNS VOID AS $$
DECLARE r_id INT;
DECLARE v_target_email TEXT;
DECLARE v_actor_email TEXT;
DECLARE v_count INT;
BEGIN
  SELECT id INTO r_id FROM admin_roles WHERE key = p_role_key;
  IF r_id IS NULL THEN RAISE EXCEPTION 'Role % not found', p_role_key; END IF;

  -- Protection: cannot revoke your own super_admin and cannot revoke the last super_admin
  IF p_role_key = 'super_admin' THEN
    IF p_user = p_actor THEN
      RAISE EXCEPTION 'You cannot revoke your own super_admin role';
    END IF;
    SELECT COUNT(*) INTO v_count
    FROM admin_user_roles ur
    WHERE ur.role_id = r_id;
    IF v_count <= 1 THEN
      RAISE EXCEPTION 'Cannot revoke the last super_admin';
    END IF;
  END IF;

  DELETE FROM admin_user_roles WHERE user_id = p_user AND role_id = r_id;
  -- if no roles left, drop admin flag
  UPDATE profiles SET is_admin = EXISTS (SELECT 1 FROM admin_user_roles WHERE user_id = p_user) WHERE id = p_user;

  -- audit log
  SELECT email INTO v_target_email FROM auth.users WHERE id = p_user;
  SELECT email INTO v_actor_email FROM auth.users WHERE id = p_actor;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    INSERT INTO audit_logs (admin_id, admin_name, action_type, target_type, target_id, target_name, details, severity)
    VALUES (p_actor, COALESCE(v_actor_email,'system'), 'admin_role_revoke', 'user', p_user, COALESCE(v_target_email,'unknown'), jsonb_build_object('role', p_role_key), 'medium');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seeds (idempotent)
INSERT INTO admin_roles(key, name, description) VALUES
  ('super_admin','Super Admin','Root control'),
  ('ops_admin','Ops Admin','Tournaments, venues, disputes'),
  ('finance_admin','Finance Admin','Payouts, transactions, invoices'),
  ('moderator','Moderator','Reports and community safety'),
  ('support_admin','Support Admin','User queries and verifications')
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO admin_permissions(key, description) VALUES
  ('tournament:approve','Approve tournaments'),
  ('tournament:reject','Reject tournaments'),
  ('venue:verify','Verify venues'),
  ('payment:process','Process payments/payouts'),
  ('user:ban','Ban users'),
  ('user:suspend','Suspend users'),
  ('dispute:resolve','Resolve disputes'),
  ('verification:review','Review verification requests'),
  ('settings:update','Update system settings'),
  ('audit:view','View audit logs'),
  ('admin:assign_roles','Assign admin roles')
ON CONFLICT (key) DO NOTHING;

-- map defaults
-- super_admin gets all permissions
INSERT INTO admin_role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM admin_roles r CROSS JOIN admin_permissions p WHERE r.key = 'super_admin'
ON CONFLICT DO NOTHING;

-- ops_admin
INSERT INTO admin_role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM admin_roles r JOIN admin_permissions p ON p.key IN ('tournament:approve','tournament:reject','venue:verify','verification:review','audit:view','dispute:resolve')
WHERE r.key = 'ops_admin' ON CONFLICT DO NOTHING;

-- finance_admin
INSERT INTO admin_role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM admin_roles r JOIN admin_permissions p ON p.key IN ('payment:process','audit:view')
WHERE r.key = 'finance_admin' ON CONFLICT DO NOTHING;

-- moderator
INSERT INTO admin_role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM admin_roles r JOIN admin_permissions p ON p.key IN ('user:ban','user:suspend','audit:view')
WHERE r.key = 'moderator' ON CONFLICT DO NOTHING;

-- support_admin
INSERT INTO admin_role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM admin_roles r JOIN admin_permissions p ON p.key IN ('verification:review','audit:view')
WHERE r.key = 'support_admin' ON CONFLICT DO NOTHING;

-- Grants
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON admin_roles, admin_permissions, admin_role_permissions, admin_user_roles TO authenticated;
GRANT EXECUTE ON FUNCTION admin_assign_role TO authenticated;
GRANT EXECUTE ON FUNCTION admin_revoke_role TO authenticated;
GRANT EXECUTE ON FUNCTION admin_user_has_permission TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_permissions_for_user TO authenticated;

-- system settings table for admin settings module
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Convenience: quick grant of super admin by uuid or email
DROP FUNCTION IF EXISTS admin_grant_super_admin(uuid, uuid);
DROP FUNCTION IF EXISTS admin_grant_super_admin_by_email(text, uuid);

CREATE OR REPLACE FUNCTION admin_grant_super_admin(p_user UUID, p_actor UUID DEFAULT auth.uid())
RETURNS VOID AS $$
DECLARE r_id INT; v_target_email TEXT; v_actor_email TEXT;
BEGIN
  INSERT INTO admin_roles(key,name,description) VALUES ('super_admin','Super Admin','Root control') ON CONFLICT (key) DO NOTHING;
  SELECT id INTO r_id FROM admin_roles WHERE key='super_admin';
  INSERT INTO admin_user_roles(user_id, role_id) VALUES (p_user, r_id) ON CONFLICT DO NOTHING;
  UPDATE profiles SET is_admin = TRUE WHERE id = p_user;

  SELECT email INTO v_target_email FROM auth.users WHERE id = p_user;
  SELECT email INTO v_actor_email FROM auth.users WHERE id = p_actor;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='audit_logs') THEN
    INSERT INTO audit_logs (admin_id, admin_name, action_type, target_type, target_id, target_name, details, severity)
    VALUES (p_actor, COALESCE(v_actor_email,'system'), 'admin_grant_super_admin', 'user', p_user, COALESCE(v_target_email,'unknown'), '{}', 'high');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS for verification_requests: allow users to insert their own request, admins can read all
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='verification_requests') THEN
    EXECUTE 'ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY';

    -- user can insert/select their own
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='verification_requests' AND policyname='vr_user_own') THEN
      CREATE POLICY vr_user_own ON verification_requests
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
    END IF;

    -- admins can select all
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='verification_requests' AND policyname='vr_admin_read') THEN
      CREATE POLICY vr_admin_read ON verification_requests
      FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin)
      );
    END IF;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION admin_grant_super_admin_by_email(p_email TEXT, p_actor UUID DEFAULT auth.uid())
RETURNS VOID AS $$
DECLARE u UUID;
BEGIN
  SELECT id INTO u FROM auth.users WHERE email = p_email;
  IF u IS NULL THEN RAISE EXCEPTION 'User with email % not found', p_email; END IF;
  PERFORM admin_grant_super_admin(u, p_actor);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS for audit_logs: admins can insert/select
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='audit_logs') THEN
    EXECUTE 'ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audit_logs' AND policyname='audit_admin_select') THEN
      CREATE POLICY audit_admin_select ON audit_logs FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin)
      );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audit_logs' AND policyname='audit_admin_insert') THEN
      CREATE POLICY audit_admin_insert ON audit_logs FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin)
      );
    END IF;
  END IF;
END $$;

-- Grants for runtime (RLS will still enforce row access)
GRANT SELECT, INSERT, UPDATE ON verification_requests TO authenticated;
GRANT SELECT, INSERT ON audit_logs TO authenticated;

