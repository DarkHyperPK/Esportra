-- Create storage buckets for verification system
-- Run this in your Supabase SQL editor

-- Create verification documents bucket (KYC documents)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'kyc',
    'kyc',
    false,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create verification documents bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'verification-documents',
    'verification-documents',
    false,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create user avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'user-avatars',
    'user-avatars',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create team logos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'team-logos',
    'team-logos',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create tournament images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'tournament-images',
    'tournament-images',
    true,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create venue images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'venue-images',
    'venue-images',
    true,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- RLS Policies for kyc bucket
CREATE POLICY "Users can upload their own KYC documents" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'kyc' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own KYC documents" ON storage.objects
FOR SELECT USING (
    bucket_id = 'kyc' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all KYC documents" ON storage.objects
FOR SELECT USING (
    bucket_id = 'kyc' 
    AND EXISTS (
        SELECT 1 FROM admin_user_roles 
        WHERE user_id = auth.uid() 
        AND is_active = true
    )
);

-- RLS Policies for verification-documents bucket
CREATE POLICY "Users can upload their own verification documents" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'verification-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own verification documents" ON storage.objects
FOR SELECT USING (
    bucket_id = 'verification-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all verification documents" ON storage.objects
FOR SELECT USING (
    bucket_id = 'verification-documents' 
    AND EXISTS (
        SELECT 1 FROM admin_user_roles 
        WHERE user_id = auth.uid() 
        AND is_active = true
    )
);

-- RLS Policies for user-avatars bucket
CREATE POLICY "Users can upload their own avatars" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'user-avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view user avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'user-avatars');

-- RLS Policies for team-logos bucket
CREATE POLICY "Team members can upload team logos" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'team-logos' 
    AND EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_id::text = (storage.foldername(name))[1] 
        AND user_id = auth.uid() 
        AND role = 'captain'
    )
);

CREATE POLICY "Anyone can view team logos" ON storage.objects
FOR SELECT USING (bucket_id = 'team-logos');

-- RLS Policies for tournament-images bucket
CREATE POLICY "Tournament organizers can upload tournament images" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'tournament-images' 
    AND EXISTS (
        SELECT 1 FROM tournaments 
        WHERE id::text = (storage.foldername(name))[1] 
        AND organizer_id = auth.uid()
    )
);

CREATE POLICY "Anyone can view tournament images" ON storage.objects
FOR SELECT USING (bucket_id = 'tournament-images');

-- RLS Policies for venue-images bucket
CREATE POLICY "Venue owners can upload venue images" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'venue-images' 
    AND EXISTS (
        SELECT 1 FROM venues 
        WHERE id::text = (storage.foldername(name))[1] 
        AND owner_id = auth.uid()
    )
);

CREATE POLICY "Anyone can view venue images" ON storage.objects
FOR SELECT USING (bucket_id = 'venue-images');
