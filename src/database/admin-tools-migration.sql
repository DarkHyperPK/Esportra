-- Admin Tools Migration
-- This creates the database structure for comprehensive admin management tools

-- Add missing columns to profiles table for user management
DO $$ 
BEGIN
    -- Add is_suspended column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'is_suspended') THEN
        ALTER TABLE profiles ADD COLUMN is_suspended BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add is_banned column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'is_banned') THEN
        ALTER TABLE profiles ADD COLUMN is_banned BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add suspension_reason column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'suspension_reason') THEN
        ALTER TABLE profiles ADD COLUMN suspension_reason TEXT;
    END IF;
    
    -- Add suspension_until column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'suspension_until') THEN
        ALTER TABLE profiles ADD COLUMN suspension_until TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add ban_reason column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'ban_reason') THEN
        ALTER TABLE profiles ADD COLUMN ban_reason TEXT;
    END IF;
END $$;

-- Create audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    admin_name VARCHAR(255) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id UUID NOT NULL,
    target_name VARCHAR(255) NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    severity VARCHAR(20) DEFAULT 'medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user reports table
CREATE TABLE IF NOT EXISTS user_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL,
    evidence_urls TEXT[],
    status VARCHAR(20) DEFAULT 'pending',
    admin_notes TEXT,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create content moderation table
CREATE TABLE IF NOT EXISTS content_moderation (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content_type VARCHAR(50) NOT NULL,
    content_id UUID NOT NULL,
    content_data JSONB,
    moderation_action VARCHAR(50) NOT NULL,
    reason TEXT,
    moderated_by UUID REFERENCES auth.users(id),
    moderated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active'
);

-- Create system notifications table
CREATE TABLE IF NOT EXISTS system_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    target_audience VARCHAR(50) DEFAULT 'all',
    is_active BOOLEAN DEFAULT true,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin actions table for tracking sensitive operations
CREATE TABLE IF NOT EXISTS admin_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id UUID NOT NULL,
    action_data JSONB,
    requires_approval BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create dispute resolution table
CREATE TABLE IF NOT EXISTS disputes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dispute_type VARCHAR(50) NOT NULL,
    complainant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    respondent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    evidence_urls TEXT[],
    status VARCHAR(20) DEFAULT 'open',
    priority VARCHAR(20) DEFAULT 'medium',
    assigned_admin UUID REFERENCES auth.users(id),
    resolution TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system metrics table
CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,2) NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_type ON audit_logs(target_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);

CREATE INDEX IF NOT EXISTS idx_user_reports_reporter_id ON user_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported_user_id ON user_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_reports_created_at ON user_reports(created_at);

CREATE INDEX IF NOT EXISTS idx_content_moderation_content_type ON content_moderation(content_type);
CREATE INDEX IF NOT EXISTS idx_content_moderation_status ON content_moderation(status);
CREATE INDEX IF NOT EXISTS idx_content_moderation_moderated_at ON content_moderation(moderated_at);

CREATE INDEX IF NOT EXISTS idx_system_notifications_type ON system_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_system_notifications_target_audience ON system_notifications(target_audience);
CREATE INDEX IF NOT EXISTS idx_system_notifications_is_active ON system_notifications(is_active);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_status ON admin_actions(status);
CREATE INDEX IF NOT EXISTS idx_admin_actions_requires_approval ON admin_actions(requires_approval);

CREATE INDEX IF NOT EXISTS idx_disputes_complainant_id ON disputes(complainant_id);
CREATE INDEX IF NOT EXISTS idx_disputes_respondent_id ON disputes(respondent_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_priority ON disputes(priority);

CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_metrics_type ON system_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded_at ON system_metrics(recorded_at);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_moderation ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit_logs
CREATE POLICY "Admins can view all audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- RLS Policies for user_reports
CREATE POLICY "Users can view their own reports" ON user_reports
    FOR SELECT USING (
        reporter_id = auth.uid() OR 
        reported_user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Users can create reports" ON user_reports
    FOR INSERT WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Admins can update reports" ON user_reports
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- RLS Policies for content_moderation
CREATE POLICY "Admins can manage content moderation" ON content_moderation
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- RLS Policies for system_notifications
CREATE POLICY "Admins can manage system notifications" ON system_notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Users can view active notifications" ON system_notifications
    FOR SELECT USING (is_active = true);

-- RLS Policies for admin_actions
CREATE POLICY "Admins can manage admin actions" ON admin_actions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- RLS Policies for disputes
CREATE POLICY "Users can view their disputes" ON disputes
    FOR SELECT USING (
        complainant_id = auth.uid() OR 
        respondent_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Users can create disputes" ON disputes
    FOR INSERT WITH CHECK (complainant_id = auth.uid());

CREATE POLICY "Admins can update disputes" ON disputes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- RLS Policies for system_metrics
CREATE POLICY "Admins can manage system metrics" ON system_metrics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Create functions for admin operations

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
    p_admin_id UUID,
    p_admin_name VARCHAR,
    p_action_type VARCHAR,
    p_target_type VARCHAR,
    p_target_id UUID,
    p_target_name VARCHAR,
    p_details JSONB DEFAULT NULL,
    p_severity VARCHAR DEFAULT 'medium'
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO audit_logs (
        admin_id,
        admin_name,
        action_type,
        target_type,
        target_id,
        target_name,
        details,
        ip_address,
        user_agent,
        severity
    ) VALUES (
        p_admin_id,
        p_admin_name,
        p_action_type,
        p_target_type,
        p_target_id,
        p_target_name,
        p_details,
        inet_client_addr(),
        current_setting('request.headers', true)::json->>'user-agent',
        p_severity
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to suspend user
CREATE OR REPLACE FUNCTION suspend_user(
    p_user_id UUID,
    p_reason TEXT,
    p_duration_days INTEGER DEFAULT 7
)
RETURNS BOOLEAN AS $$
DECLARE
    suspension_until TIMESTAMP;
BEGIN
    -- Check if columns exist before updating
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'is_suspended') THEN
        RAISE EXCEPTION 'User management columns not found. Please run the admin-tools-migration.sql first.';
    END IF;
    
    suspension_until := NOW() + (p_duration_days || ' days')::INTERVAL;
    
    UPDATE profiles 
    SET 
        is_suspended = true,
        suspension_reason = p_reason,
        suspension_until = suspension_until
    WHERE id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ban user
CREATE OR REPLACE FUNCTION ban_user(
    p_user_id UUID,
    p_reason TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if columns exist before updating
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'is_banned') THEN
        RAISE EXCEPTION 'User management columns not found. Please run the admin-tools-migration.sql first.';
    END IF;
    
    UPDATE profiles 
    SET 
        is_banned = true,
        ban_reason = p_reason,
        is_suspended = false,
        suspension_reason = NULL,
        suspension_until = NULL
    WHERE id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unsuspend user
CREATE OR REPLACE FUNCTION unsuspend_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if columns exist before updating
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'is_suspended') THEN
        RAISE EXCEPTION 'User management columns not found. Please run the admin-tools-migration.sql first.';
    END IF;
    
    UPDATE profiles 
    SET 
        is_suspended = false,
        suspension_reason = NULL,
        suspension_until = NULL
    WHERE id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unban user
CREATE OR REPLACE FUNCTION unban_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if columns exist before updating
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'is_banned') THEN
        RAISE EXCEPTION 'User management columns not found. Please run the admin-tools-migration.sql first.';
    END IF;
    
    UPDATE profiles 
    SET 
        is_banned = false,
        ban_reason = NULL
    WHERE id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record system metrics
CREATE OR REPLACE FUNCTION record_system_metric(
    p_metric_name VARCHAR,
    p_metric_value DECIMAL,
    p_metric_type VARCHAR,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    metric_id UUID;
BEGIN
    INSERT INTO system_metrics (
        metric_name,
        metric_value,
        metric_type,
        metadata
    ) VALUES (
        p_metric_name,
        p_metric_value,
        p_metric_type,
        p_metadata
    ) RETURNING id INTO metric_id;
    
    RETURN metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get system statistics
CREATE OR REPLACE FUNCTION get_system_stats()
RETURNS JSON AS $$
DECLARE
    stats JSON;
    has_suspension_columns BOOLEAN;
BEGIN
    -- Check if suspension columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'is_suspended'
    ) INTO has_suspension_columns;
    
    IF has_suspension_columns THEN
        SELECT json_build_object(
            'total_users', (SELECT COUNT(*) FROM profiles),
            'active_users', (SELECT COUNT(*) FROM profiles WHERE is_suspended = false AND is_banned = false),
            'suspended_users', (SELECT COUNT(*) FROM profiles WHERE is_suspended = true),
            'banned_users', (SELECT COUNT(*) FROM profiles WHERE is_banned = true),
            'total_tournaments', (SELECT COUNT(*) FROM tournaments),
            'active_tournaments', (SELECT COUNT(*) FROM tournaments WHERE status IN ('registration_open', 'ongoing')),
            'total_venues', (SELECT COUNT(*) FROM venues),
            'pending_reports', (SELECT COUNT(*) FROM user_reports WHERE status = 'pending'),
            'open_disputes', (SELECT COUNT(*) FROM disputes WHERE status = 'open'),
            'total_prize_pool', (SELECT COALESCE(SUM(
                CASE 
                    WHEN prize_pool ~ '^[0-9]+\.?[0-9]*$' THEN prize_pool::DECIMAL
                    ELSE 0
                END
            ), 0) FROM tournaments WHERE status != 'cancelled')
        ) INTO stats;
    ELSE
        SELECT json_build_object(
            'total_users', (SELECT COUNT(*) FROM profiles),
            'active_users', (SELECT COUNT(*) FROM profiles),
            'suspended_users', 0,
            'banned_users', 0,
            'total_tournaments', (SELECT COUNT(*) FROM tournaments),
            'active_tournaments', (SELECT COUNT(*) FROM tournaments WHERE status IN ('registration_open', 'ongoing')),
            'total_venues', (SELECT COUNT(*) FROM venues),
            'pending_reports', 0,
            'open_disputes', 0,
            'total_prize_pool', (SELECT COALESCE(SUM(
                CASE 
                    WHEN prize_pool ~ '^[0-9]+\.?[0-9]*$' THEN prize_pool::DECIMAL
                    ELSE 0
                END
            ), 0) FROM tournaments WHERE status != 'cancelled')
        ) INTO stats;
    END IF;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for updating timestamps
CREATE TRIGGER update_user_reports_updated_at BEFORE UPDATE ON user_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON disputes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for admin dashboard statistics
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM profiles) as total_users,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_suspended')
        THEN (SELECT COUNT(*) FROM profiles WHERE is_suspended = false AND is_banned = false)
        ELSE (SELECT COUNT(*) FROM profiles)
    END as active_users,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_suspended')
        THEN (SELECT COUNT(*) FROM profiles WHERE is_suspended = true)
        ELSE 0
    END as suspended_users,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_banned')
        THEN (SELECT COUNT(*) FROM profiles WHERE is_banned = true)
        ELSE 0
    END as banned_users,
    (SELECT COUNT(*) FROM tournaments) as total_tournaments,
    (SELECT COUNT(*) FROM tournaments WHERE status IN ('registration_open', 'ongoing')) as active_tournaments,
    (SELECT COUNT(*) FROM venues) as total_venues,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_reports')
        THEN (SELECT COUNT(*) FROM user_reports WHERE status = 'pending')
        ELSE 0
    END as pending_reports,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'disputes')
        THEN (SELECT COUNT(*) FROM disputes WHERE status = 'open')
        ELSE 0
    END as open_disputes,
    (SELECT COALESCE(SUM(
        CASE 
            WHEN prize_pool ~ '^[0-9]+\.?[0-9]*$' THEN prize_pool::DECIMAL
            ELSE 0
        END
    ), 0) FROM tournaments WHERE status != 'cancelled') as total_prize_pool,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs')
        THEN (SELECT COUNT(*) FROM audit_logs WHERE created_at >= NOW() - INTERVAL '24 hours')
        ELSE 0
    END as admin_actions_24h,
    (SELECT COUNT(*) FROM profiles WHERE created_at >= NOW() - INTERVAL '7 days') as new_users_7d,
    (SELECT COUNT(*) FROM tournaments WHERE created_at >= NOW() - INTERVAL '7 days') as new_tournaments_7d;

-- Grant permissions
GRANT SELECT ON admin_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION log_admin_action TO authenticated;
GRANT EXECUTE ON FUNCTION suspend_user TO authenticated;
GRANT EXECUTE ON FUNCTION ban_user TO authenticated;
GRANT EXECUTE ON FUNCTION unsuspend_user TO authenticated;
GRANT EXECUTE ON FUNCTION unban_user TO authenticated;
GRANT EXECUTE ON FUNCTION record_system_metric TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_stats TO authenticated;
