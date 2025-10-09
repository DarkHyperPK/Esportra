-- Verification System Migration
-- Run this in your Supabase SQL editor

-- Create verification_requests table
CREATE TABLE IF NOT EXISTS verification_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_role app_role NOT NULL CHECK (requested_role IN ('organizer', 'venue_owner')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'under_review')),
  business_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(100) NOT NULL, -- 'esports_organization', 'gaming_venue', 'tournament_organizer', etc.
  business_description TEXT NOT NULL,
  website VARCHAR(255),
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(20),
  business_address TEXT,
  business_documents TEXT[], -- Array of document URLs
  social_media_links JSONB DEFAULT '{}', -- Twitter, Discord, etc.
  previous_experience TEXT,
  expected_tournaments_per_month INTEGER DEFAULT 0,
  verification_notes TEXT, -- Admin notes
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  
  -- Note: Unique constraint for pending requests will be created as an index below
);

-- Create verification_history table for tracking changes
CREATE TABLE IF NOT EXISTS verification_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  verification_request_id UUID NOT NULL REFERENCES verification_requests(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'submitted', 'approved', 'rejected', 'updated'
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create verified_roles table to track approved roles
CREATE TABLE IF NOT EXISTS verified_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL CHECK (role IN ('organizer', 'venue_owner')),
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_request_id UUID NOT NULL REFERENCES verification_requests(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
  is_active BOOLEAN DEFAULT true
  
  -- Note: Unique constraint for active verifications will be created as an index below
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_verification_requests_user_id ON verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_verification_requests_requested_role ON verification_requests(requested_role);
CREATE INDEX IF NOT EXISTS idx_verification_requests_created_at ON verification_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_verification_history_request_id ON verification_history(verification_request_id);
CREATE INDEX IF NOT EXISTS idx_verified_roles_user_id ON verified_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_verified_roles_role ON verified_roles(role);
CREATE INDEX IF NOT EXISTS idx_verified_roles_active ON verified_roles(user_id, role) WHERE is_active = true;

-- Create unique partial index for one pending request per user per role
CREATE UNIQUE INDEX IF NOT EXISTS idx_verification_requests_unique_pending 
ON verification_requests (user_id, requested_role) 
WHERE status = 'pending';

-- Create unique partial index for one active verification per user per role
CREATE UNIQUE INDEX IF NOT EXISTS idx_verified_roles_unique_active 
ON verified_roles (user_id, role) 
WHERE is_active = true;

-- Create updated_at trigger for verification_requests
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_verification_requests_updated_at 
    BEFORE UPDATE ON verification_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE verified_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for verification_requests
CREATE POLICY "Users can view their own verification requests" ON verification_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own verification requests" ON verification_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending verification requests" ON verification_requests
    FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can view all verification requests" ON verification_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'admin' 
            AND ur.is_active = true
        )
    );

CREATE POLICY "Admins can update verification requests" ON verification_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'admin' 
            AND ur.is_active = true
        )
    );

-- RLS Policies for verification_history
CREATE POLICY "Users can view history of their verification requests" ON verification_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM verification_requests vr 
            WHERE vr.id = verification_history.verification_request_id 
            AND vr.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all verification history" ON verification_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'admin' 
            AND ur.is_active = true
        )
    );

CREATE POLICY "System can insert verification history" ON verification_history
    FOR INSERT WITH CHECK (true);

-- RLS Policies for verified_roles
CREATE POLICY "Users can view their own verified roles" ON verified_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all verified roles" ON verified_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'admin' 
            AND ur.is_active = true
        )
    );

CREATE POLICY "System can manage verified roles" ON verified_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'admin' 
            AND ur.is_active = true
        )
    );

-- Function to check if user has verified role
CREATE OR REPLACE FUNCTION has_verified_role(user_uuid UUID, role_name app_role)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM verified_roles 
        WHERE user_id = user_uuid 
        AND role = role_name 
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to approve verification request
CREATE OR REPLACE FUNCTION approve_verification_request(
    request_id UUID,
    admin_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    request_record RECORD;
    result JSON;
BEGIN
    -- Get the verification request
    SELECT * INTO request_record 
    FROM verification_requests 
    WHERE id = request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Verification request not found or not pending');
    END IF;
    
    -- Update the request status
    UPDATE verification_requests 
    SET 
        status = 'approved',
        reviewed_by = auth.uid(),
        reviewed_at = NOW(),
        verification_notes = admin_notes
    WHERE id = request_id;
    
    -- Add to verified_roles
    INSERT INTO verified_roles (user_id, role, verified_by, verification_request_id)
    VALUES (request_record.user_id, request_record.requested_role, auth.uid(), request_id);
    
    -- Add to history
    INSERT INTO verification_history (verification_request_id, action, performed_by, notes)
    VALUES (request_id, 'approved', auth.uid(), admin_notes);
    
    result := json_build_object(
        'success', true,
        'message', 'Verification request approved successfully'
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject verification request
CREATE OR REPLACE FUNCTION reject_verification_request(
    request_id UUID,
    rejection_reason TEXT,
    admin_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Update the request status
    UPDATE verification_requests 
    SET 
        status = 'rejected',
        reviewed_by = auth.uid(),
        reviewed_at = NOW(),
        rejection_reason = rejection_reason,
        verification_notes = admin_notes
    WHERE id = request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Verification request not found or not pending');
    END IF;
    
    -- Add to history
    INSERT INTO verification_history (verification_request_id, action, performed_by, notes)
    VALUES (request_id, 'rejected', auth.uid(), COALESCE(admin_notes, rejection_reason));
    
    result := json_build_object(
        'success', true,
        'message', 'Verification request rejected'
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION has_verified_role(UUID, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_verification_request(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_verification_request(UUID, TEXT, TEXT) TO authenticated;

-- Grant table permissions
GRANT ALL ON verification_requests TO authenticated;
GRANT ALL ON verification_history TO authenticated;
GRANT ALL ON verified_roles TO authenticated;
