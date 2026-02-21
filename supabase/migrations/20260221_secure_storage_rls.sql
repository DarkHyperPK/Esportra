-- 1. ENABLE ROW LEVEL SECURITY
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2. WIPE EXISTING BUCKET POLICIES (Start Fresh)
DO $$ 
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'buckets' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.buckets', pol.policyname);
    END LOOP;
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;

-- 3. BUCKET (Root Folder) POLICIES
CREATE POLICY "Anyone can see buckets exist" ON storage.buckets FOR SELECT USING (true);
CREATE POLICY "Only Admins can create or delete buckets" ON storage.buckets FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

-- 4. OBJECT POLICIES (The Files)

-- ==========================================
-- RULE SET A: "Public Read, Owner/Admin Write"
-- E.g. Avatars, Teams, Tournaments, Venues (14 buckets total)
-- ==========================================
-- Read:
CREATE POLICY "Public Read for Public Buckets" ON storage.objects FOR SELECT USING (
    bucket_id IN (
        'users.avatars', 'users.uploads', 'tournaments.banners', 'tournaments.results', 
        'tournaments.media', 'tournaments.disputes.evidence', 'teams.logos', 
        'venues.images', 'venues.layouts', 'organizer-banners', 'organizer-media', 
        'venue-images', 'system.notifications.attachments', 'system.assets.sponsors', 'system.assets.partners'
    )
);

-- Insert/Update/Delete (Owner or Admin):
CREATE POLICY "Owner/Admin Write for Public Buckets" ON storage.objects FOR INSERT WITH CHECK (
    -- User is logging in and owns the file
    auth.uid() = owner 
    AND 
    bucket_id IN (
        'users.avatars', 'users.uploads', 'tournaments.banners', 'tournaments.results', 
        'tournaments.media', 'tournaments.disputes.evidence', 'teams.logos', 
        'venues.images', 'venues.layouts', 'organizer-banners', 'organizer-media', 
        'venue-images', 'system.notifications.attachments', 'system.assets.sponsors', 'system.assets.partners'
    )
);

CREATE POLICY "Owner/Admin Update for Public Buckets" ON storage.objects FOR UPDATE USING (
    (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
    AND 
    bucket_id IN (
        'users.avatars', 'users.uploads', 'tournaments.banners', 'tournaments.results', 
        'tournaments.media', 'tournaments.disputes.evidence', 'teams.logos', 
        'venues.images', 'venues.layouts', 'organizer-banners', 'organizer-media', 
        'venue-images', 'system.notifications.attachments', 'system.assets.sponsors', 'system.assets.partners'
    )
);

CREATE POLICY "Owner/Admin Delete for Public Buckets" ON storage.objects FOR DELETE USING (
    (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
    AND 
    bucket_id IN (
        'users.avatars', 'users.uploads', 'tournaments.banners', 'tournaments.results', 
        'tournaments.media', 'tournaments.disputes.evidence', 'teams.logos', 
        'venues.images', 'venues.layouts', 'organizer-banners', 'organizer-media', 
        'venue-images', 'system.notifications.attachments', 'system.assets.sponsors', 'system.assets.partners'
    )
);


-- ==========================================
-- RULE SET B: "High Security (Private)"
-- E.g. KYC Documents, Temporary System Files
-- ==========================================
-- Read (Owner or Admin only):
CREATE POLICY "Private Read for High Security" ON storage.objects FOR SELECT USING (
    (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
    AND 
    bucket_id IN ('users.documents.kyc', 'system.temp')
);

-- Insert/Update/Delete (Owner or Admin only):
CREATE POLICY "Owner/Admin Write for High Security" ON storage.objects FOR INSERT WITH CHECK (
    auth.uid() = owner 
    AND 
    bucket_id IN ('users.documents.kyc', 'system.temp')
);
CREATE POLICY "Owner/Admin Edit for High Security" ON storage.objects FOR UPDATE USING (
    (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
    AND 
    bucket_id IN ('users.documents.kyc', 'system.temp')
);
CREATE POLICY "Owner/Admin Delete for High Security" ON storage.objects FOR DELETE USING (
    (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
    AND 
    bucket_id IN ('users.documents.kyc', 'system.temp')
);


-- ==========================================
-- RULE SET C: "System Assets (Public Read, Admin Write Only)"
-- E.g. Global website media, game maps
-- ==========================================
-- Read (Anyone):
CREATE POLICY "Public Read System Assets" ON storage.objects FOR SELECT USING (
    bucket_id IN ('system.assets.games', 'system.assets.website')
);

-- Insert/Update/Delete (Admins ONLY):
CREATE POLICY "Admin Write System Assets" ON storage.objects FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    AND 
    bucket_id IN ('system.assets.games', 'system.assets.website')
);
CREATE POLICY "Admin Edit System Assets" ON storage.objects FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    AND 
    bucket_id IN ('system.assets.games', 'system.assets.website')
);
CREATE POLICY "Admin Delete System Assets" ON storage.objects FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    AND 
    bucket_id IN ('system.assets.games', 'system.assets.website')
);
