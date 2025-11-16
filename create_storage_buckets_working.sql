-- =====================================================
-- SUPABASE STORAGE BUCKETS SETUP (WORKING VERSION)
-- =====================================================
-- Run these queries in your Supabase SQL Editor
-- You already have: kyc-documents, team-logos, tournament-banners, venue-images

-- =====================================================
-- 1. USER AVATARS BUCKET
-- =====================================================
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES (
    'user-avatars',
    'user-avatars',
    TRUE, -- Public for display
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    5242880 -- 5MB limit
);

-- RLS Policies for user-avatars
CREATE POLICY "Allow public to view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'user-avatars');

CREATE POLICY "Allow users to upload their own avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'user-avatars' AND auth.uid() = owner);

CREATE POLICY "Allow users to update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'user-avatars' AND auth.uid() = owner);

CREATE POLICY "Allow users to delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'user-avatars' AND auth.uid() = owner);

-- =====================================================
-- 2. USER UPLOADS BUCKET (General user files)
-- =====================================================
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES (
    'user-uploads',
    'user-uploads',
    FALSE, -- Private by default
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'],
    10485760 -- 10MB limit
);

-- RLS Policies for user-uploads
CREATE POLICY "Allow users to view their own uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'user-uploads' AND auth.uid() = owner);

CREATE POLICY "Allow users to upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'user-uploads' AND auth.uid() = owner);

CREATE POLICY "Allow users to update their own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'user-uploads' AND auth.uid() = owner);

CREATE POLICY "Allow users to delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'user-uploads' AND auth.uid() = owner);

-- =====================================================
-- 3. TOURNAMENT RESULTS BUCKET
-- =====================================================
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES (
    'tournament-results',
    'tournament-results',
    TRUE, -- Public for viewing results
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    10485760 -- 10MB limit
);

-- RLS Policies for tournament-results
CREATE POLICY "Allow public to view tournament results"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tournament-results');

CREATE POLICY "Allow organizers to upload tournament results"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tournament-results' AND auth.uid() IS NOT NULL);

CREATE POLICY "Allow organizers to update tournament results"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'tournament-results' AND auth.uid() IS NOT NULL);

-- =====================================================
-- 4. TOURNAMENT SCREENSHOTS BUCKET
-- =====================================================
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES (
    'tournament-screenshots',
    'tournament-screenshots',
    TRUE, -- Public for viewing
    ARRAY['image/jpeg', 'image/png', 'image/webp'],
    5242880 -- 5MB limit
);

-- RLS Policies for tournament-screenshots
CREATE POLICY "Allow public to view tournament screenshots"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tournament-screenshots');

CREATE POLICY "Allow authenticated users to upload screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tournament-screenshots' AND auth.uid() IS NOT NULL);

-- =====================================================
-- 5. VENUE LAYOUTS BUCKET (Floor plans, seating arrangements)
-- =====================================================
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES (
    'venue-layouts',
    'venue-layouts',
    TRUE, -- Public for venue details
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    10485760 -- 10MB limit
);

-- RLS Policies for venue-layouts
CREATE POLICY "Allow public to view venue layouts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'venue-layouts');

CREATE POLICY "Allow venue owners to upload layouts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'venue-layouts' AND auth.uid() IS NOT NULL);

-- =====================================================
-- 6. WEBSITE ASSETS BUCKET (Hero images, banners, icons)
-- =====================================================
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES (
    'website-assets',
    'website-assets',
    TRUE, -- Public for website display
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    20971520 -- 20MB limit
);

-- RLS Policies for website-assets
CREATE POLICY "Allow public to view website assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'website-assets');

-- Only admins can upload website assets
CREATE POLICY "Allow admins to upload website assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'website-assets' 
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_admin = TRUE
    )
);

-- =====================================================
-- 7. SPONSOR LOGOS BUCKET
-- =====================================================
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES (
    'sponsor-logos',
    'sponsor-logos',
    TRUE, -- Public for display
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    5242880 -- 5MB limit
);

-- RLS Policies for sponsor-logos
CREATE POLICY "Allow public to view sponsor logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'sponsor-logos');

CREATE POLICY "Allow admins to manage sponsor logos"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'sponsor-logos' 
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_admin = TRUE
    )
);

-- =====================================================
-- 8. GAME ASSETS BUCKET (Game icons, screenshots)
-- =====================================================
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES (
    'game-assets',
    'game-assets',
    TRUE, -- Public for display
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    10485760 -- 10MB limit
);

-- RLS Policies for game-assets
CREATE POLICY "Allow public to view game assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'game-assets');

CREATE POLICY "Allow admins to manage game assets"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'game-assets' 
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_admin = TRUE
    )
);

-- =====================================================
-- 9. NOTIFICATION ATTACHMENTS BUCKET
-- =====================================================
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES (
    'notification-attachments',
    'notification-attachments',
    FALSE, -- Private
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
    10485760 -- 10MB limit
);

-- RLS Policies for notification-attachments
CREATE POLICY "Allow users to view their notification attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'notification-attachments' AND auth.uid() = owner);

CREATE POLICY "Allow system to upload notification attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'notification-attachments' AND auth.uid() IS NOT NULL);

-- =====================================================
-- 10. TEMP UPLOADS BUCKET (Temporary files)
-- =====================================================
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES (
    'temp-uploads',
    'temp-uploads',
    FALSE, -- Private
    NULL, -- Allow all mime types
    20971520 -- 20MB limit
);

-- RLS Policies for temp-uploads
CREATE POLICY "Allow users to manage their own temp files"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'temp-uploads' AND auth.uid() = owner);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify your buckets were created:

-- View all buckets
SELECT id, name, public, created_at FROM storage.buckets ORDER BY created_at;

-- View all storage policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' 
ORDER BY policyname;
