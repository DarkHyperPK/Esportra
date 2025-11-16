-- Setup RLS policies for existing storage buckets
-- Run this in your Supabase SQL editor

-- ==============================================
-- KYC DOCUMENTS BUCKET (Private)
-- ==============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all KYC documents" ON storage.objects;

-- Users can upload their own KYC documents
CREATE POLICY "Users can upload their own KYC documents" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'kyc-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own KYC documents
CREATE POLICY "Users can view their own KYC documents" ON storage.objects
FOR SELECT USING (
    bucket_id = 'kyc-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins can view all KYC documents
CREATE POLICY "Admins can view all KYC documents" ON storage.objects
FOR SELECT USING (
    bucket_id = 'kyc-documents' 
    AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND is_admin = true
    )
);

-- ==============================================
-- USER AVATARS BUCKET (Public)
-- ==============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view user avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;

-- Users can upload their own avatars
CREATE POLICY "Users can upload their own avatars" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'user-avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Anyone can view user avatars
CREATE POLICY "Anyone can view user avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'user-avatars');

-- Users can update their own avatars
CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'user-avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ==============================================
-- TEAM LOGOS BUCKET (Public)
-- ==============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Team captains can upload team logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view team logos" ON storage.objects;
DROP POLICY IF EXISTS "Team captains can update team logos" ON storage.objects;

-- Team captains can upload team logos
CREATE POLICY "Team captains can upload team logos" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'team-logos' 
    AND EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_id::text = (storage.foldername(name))[1] 
        AND user_id = auth.uid() 
        AND role = 'captain'
    )
);

-- Anyone can view team logos
CREATE POLICY "Anyone can view team logos" ON storage.objects
FOR SELECT USING (bucket_id = 'team-logos');

-- Team captains can update team logos
CREATE POLICY "Team captains can update team logos" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'team-logos' 
    AND EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_id::text = (storage.foldername(name))[1] 
        AND user_id = auth.uid() 
        AND role = 'captain'
    )
);

-- ==============================================
-- TOURNAMENT BANNERS BUCKET (Public)
-- ==============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Tournament organizers can upload banners" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view tournament banners" ON storage.objects;

-- Tournament organizers can upload banners
CREATE POLICY "Tournament organizers can upload banners" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'tournament-banners' 
    AND EXISTS (
        SELECT 1 FROM tournaments 
        WHERE id::text = (storage.foldername(name))[1] 
        AND organizer_id = auth.uid()
    )
);

-- Anyone can view tournament banners
CREATE POLICY "Anyone can view tournament banners" ON storage.objects
FOR SELECT USING (bucket_id = 'tournament-banners');

-- ==============================================
-- VENUE IMAGES BUCKET (Public)
-- ==============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Venue owners can upload venue images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view venue images" ON storage.objects;

-- Venue owners can upload venue images
CREATE POLICY "Venue owners can upload venue images" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'venue-images' 
    AND EXISTS (
        SELECT 1 FROM venues 
        WHERE id::text = (storage.foldername(name))[1] 
        AND owner_id = auth.uid()
    )
);

-- Anyone can view venue images
CREATE POLICY "Anyone can view venue images" ON storage.objects
FOR SELECT USING (bucket_id = 'venue-images');

-- ==============================================
-- USER UPLOADS BUCKET (Private)
-- ==============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;

-- Users can upload their own files
CREATE POLICY "Users can upload their own files" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'user-uploads' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own files
CREATE POLICY "Users can view their own files" ON storage.objects
FOR SELECT USING (
    bucket_id = 'user-uploads' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ==============================================
-- NOTIFICATION ATTACHMENTS BUCKET (Private)
-- ==============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload notification attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own notification attachments" ON storage.objects;

-- Users can upload notification attachments
CREATE POLICY "Users can upload notification attachments" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'notification-attachments' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own notification attachments
CREATE POLICY "Users can view their own notification attachments" ON storage.objects
FOR SELECT USING (
    bucket_id = 'notification-attachments' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ==============================================
-- TEMP UPLOADS BUCKET (Private)
-- ==============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload temporary files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own temporary files" ON storage.objects;

-- Users can upload temporary files
CREATE POLICY "Users can upload temporary files" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'temp-uploads' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own temporary files
CREATE POLICY "Users can view their own temporary files" ON storage.objects
FOR SELECT USING (
    bucket_id = 'temp-uploads' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ==============================================
-- PUBLIC BUCKETS (No additional policies needed)
-- ==============================================

-- These buckets are public and don't need RLS policies:
-- - tournament-results
-- - tournament-screenshots  
-- - venue-layouts
-- - website-assets
-- - sponsor-logos
-- - game-assets
