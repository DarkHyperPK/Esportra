-- Role-Based System Migration
-- Run this in your Supabase SQL editor

-- Add user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if they don't exist (for existing tables)
DO $$ 
BEGIN
    -- Add is_active column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_roles' AND column_name = 'is_active') THEN
        ALTER TABLE user_roles ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    -- Add created_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_roles' AND column_name = 'created_at') THEN
        ALTER TABLE user_roles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Add updated_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_roles' AND column_name = 'updated_at') THEN
        ALTER TABLE user_roles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Add role switching history table
CREATE TABLE IF NOT EXISTS role_switch_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_role app_role NOT NULL,
  to_role app_role NOT NULL,
  switched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT DEFAULT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_role_switch_history_user_id ON role_switch_history(user_id);

-- Create unique partial index for one active role per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_active_unique 
ON user_roles (user_id) 
WHERE is_active = true;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create updated_at trigger for user_roles
CREATE TRIGGER update_user_roles_updated_at 
    BEFORE UPDATE ON user_roles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_switch_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own roles" ON user_roles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own roles" ON user_roles
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for role_switch_history
CREATE POLICY "Users can view their own role history" ON role_switch_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own role history" ON role_switch_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to switch user role
CREATE OR REPLACE FUNCTION switch_user_role(
  new_role app_role,
  reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  current_role_record RECORD;
  result JSON;
BEGIN
  -- Validate role (app_role enum should handle this automatically)
  -- No need for manual validation as enum type enforces valid values

  -- Get current active role
  SELECT * INTO current_role_record 
  FROM user_roles 
  WHERE user_id = auth.uid() AND is_active = true;

  -- If no current role, create one
  IF NOT FOUND THEN
    INSERT INTO user_roles (user_id, role, is_active)
    VALUES (auth.uid(), new_role, true);
    
    result := json_build_object(
      'success', true,
      'message', 'Role set to ' || new_role,
      'previous_role', NULL,
      'new_role', new_role
    );
  ELSE
    -- If switching to same role, do nothing
    IF current_role_record.role = new_role THEN
      result := json_build_object(
        'success', true,
        'message', 'Already in ' || new_role || ' role',
        'previous_role', current_role_record.role,
        'new_role', new_role
      );
    ELSE
      -- Deactivate current role
      UPDATE user_roles 
      SET is_active = false, updated_at = NOW()
      WHERE user_id = auth.uid() AND is_active = true;

      -- Create new role
      INSERT INTO user_roles (user_id, role, is_active)
      VALUES (auth.uid(), new_role, true);

      -- Log role switch
      INSERT INTO role_switch_history (user_id, from_role, to_role, reason)
      VALUES (auth.uid(), current_role_record.role, new_role, reason);

      result := json_build_object(
        'success', true,
        'message', 'Role switched from ' || current_role_record.role || ' to ' || new_role,
        'previous_role', current_role_record.role,
        'new_role', new_role
      );
    END IF;
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user role
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS app_role AS $$
DECLARE
  user_role app_role;
BEGIN
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_id = auth.uid() AND is_active = true;
  
  -- Default to casual if no role found
  IF user_role IS NULL THEN
    user_role := 'casual'::app_role;
  END IF;
  
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can perform organizer actions
CREATE OR REPLACE FUNCTION is_organizer()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_current_user_role() = 'organizer';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can perform player actions
CREATE OR REPLACE FUNCTION is_player()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_current_user_role() = 'casual';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION switch_user_role(app_role, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION is_organizer() TO authenticated;
GRANT EXECUTE ON FUNCTION is_player() TO authenticated;

-- Update existing tournaments to ensure organizer role
-- This will set all existing tournament creators as organizers
INSERT INTO user_roles (user_id, role, is_active)
SELECT DISTINCT user_id, 'organizer'::app_role, true
FROM tournaments
WHERE user_id NOT IN (SELECT user_id FROM user_roles WHERE is_active = true)
ON CONFLICT DO NOTHING;

-- Note: Role-based constraints will be enforced at the application level
-- This ensures compatibility with existing data and provides better error handling
