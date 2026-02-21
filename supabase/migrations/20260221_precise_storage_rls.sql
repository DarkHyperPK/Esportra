-- 1. WIPE EXISTING BUCKET POLICIES (Start Fresh)
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

-- ======================= BUCKET: users.avatars =======================
CREATE POLICY "Public Read [users.avatars]" ON storage.objects FOR SELECT USING (bucket_id = 'users.avatars');
CREATE POLICY "Owner/Admin Insert [users.avatars]" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'users.avatars' AND auth.uid() = owner);
CREATE POLICY "Owner/Admin Update [users.avatars]" ON storage.objects FOR UPDATE USING (bucket_id = 'users.avatars' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));
CREATE POLICY "Owner/Admin Delete [users.avatars]" ON storage.objects FOR DELETE USING (bucket_id = 'users.avatars' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));

-- ======================= BUCKET: users.uploads =======================
CREATE POLICY "Public Read [users.uploads]" ON storage.objects FOR SELECT USING (bucket_id = 'users.uploads');
CREATE POLICY "Owner/Admin Insert [users.uploads]" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'users.uploads' AND auth.uid() = owner);
CREATE POLICY "Owner/Admin Update [users.uploads]" ON storage.objects FOR UPDATE USING (bucket_id = 'users.uploads' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));
CREATE POLICY "Owner/Admin Delete [users.uploads]" ON storage.objects FOR DELETE USING (bucket_id = 'users.uploads' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));

-- ======================= BUCKET: tournaments.banners =======================
CREATE POLICY "Public Read [tournaments.banners]" ON storage.objects FOR SELECT USING (bucket_id = 'tournaments.banners');
CREATE POLICY "Owner/Admin Insert [tournaments.banners]" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'tournaments.banners' AND auth.uid() = owner);
CREATE POLICY "Owner/Admin Update [tournaments.banners]" ON storage.objects FOR UPDATE USING (bucket_id = 'tournaments.banners' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));
CREATE POLICY "Owner/Admin Delete [tournaments.banners]" ON storage.objects FOR DELETE USING (bucket_id = 'tournaments.banners' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));

-- ======================= BUCKET: tournaments.results =======================
CREATE POLICY "Public Read [tournaments.results]" ON storage.objects FOR SELECT USING (bucket_id = 'tournaments.results');
CREATE POLICY "Owner/Admin Insert [tournaments.results]" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'tournaments.results' AND auth.uid() = owner);
CREATE POLICY "Owner/Admin Update [tournaments.results]" ON storage.objects FOR UPDATE USING (bucket_id = 'tournaments.results' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));
CREATE POLICY "Owner/Admin Delete [tournaments.results]" ON storage.objects FOR DELETE USING (bucket_id = 'tournaments.results' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));

-- ======================= BUCKET: tournaments.media =======================
CREATE POLICY "Public Read [tournaments.media]" ON storage.objects FOR SELECT USING (bucket_id = 'tournaments.media');
CREATE POLICY "Owner/Admin Insert [tournaments.media]" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'tournaments.media' AND auth.uid() = owner);
CREATE POLICY "Owner/Admin Update [tournaments.media]" ON storage.objects FOR UPDATE USING (bucket_id = 'tournaments.media' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));
CREATE POLICY "Owner/Admin Delete [tournaments.media]" ON storage.objects FOR DELETE USING (bucket_id = 'tournaments.media' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));

-- ======================= BUCKET: tournaments.disputes.evidence =======================
CREATE POLICY "Public Read [tournaments.disputes.evidence]" ON storage.objects FOR SELECT USING (bucket_id = 'tournaments.disputes.evidence');
CREATE POLICY "Owner/Admin Insert [tournaments.disputes.evidence]" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'tournaments.disputes.evidence' AND auth.uid() = owner);
CREATE POLICY "Owner/Admin Update [tournaments.disputes.evidence]" ON storage.objects FOR UPDATE USING (bucket_id = 'tournaments.disputes.evidence' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));
CREATE POLICY "Owner/Admin Delete [tournaments.disputes.evidence]" ON storage.objects FOR DELETE USING (bucket_id = 'tournaments.disputes.evidence' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));

-- ======================= BUCKET: teams.logos =======================
CREATE POLICY "Public Read [teams.logos]" ON storage.objects FOR SELECT USING (bucket_id = 'teams.logos');
CREATE POLICY "Owner/Admin Insert [teams.logos]" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'teams.logos' AND auth.uid() = owner);
CREATE POLICY "Owner/Admin Update [teams.logos]" ON storage.objects FOR UPDATE USING (bucket_id = 'teams.logos' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));
CREATE POLICY "Owner/Admin Delete [teams.logos]" ON storage.objects FOR DELETE USING (bucket_id = 'teams.logos' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));

-- ======================= BUCKET: venues.images =======================
CREATE POLICY "Public Read [venues.images]" ON storage.objects FOR SELECT USING (bucket_id = 'venues.images');
CREATE POLICY "Owner/Admin Insert [venues.images]" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'venues.images' AND auth.uid() = owner);
CREATE POLICY "Owner/Admin Update [venues.images]" ON storage.objects FOR UPDATE USING (bucket_id = 'venues.images' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));
CREATE POLICY "Owner/Admin Delete [venues.images]" ON storage.objects FOR DELETE USING (bucket_id = 'venues.images' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));

-- ======================= BUCKET: venues.layouts =======================
CREATE POLICY "Public Read [venues.layouts]" ON storage.objects FOR SELECT USING (bucket_id = 'venues.layouts');
CREATE POLICY "Owner/Admin Insert [venues.layouts]" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'venues.layouts' AND auth.uid() = owner);
CREATE POLICY "Owner/Admin Update [venues.layouts]" ON storage.objects FOR UPDATE USING (bucket_id = 'venues.layouts' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));
CREATE POLICY "Owner/Admin Delete [venues.layouts]" ON storage.objects FOR DELETE USING (bucket_id = 'venues.layouts' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));

-- ======================= BUCKET: organizer-banners =======================
CREATE POLICY "Public Read [organizer-banners]" ON storage.objects FOR SELECT USING (bucket_id = 'organizer-banners');
CREATE POLICY "Owner/Admin Insert [organizer-banners]" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'organizer-banners' AND auth.uid() = owner);
CREATE POLICY "Owner/Admin Update [organizer-banners]" ON storage.objects FOR UPDATE USING (bucket_id = 'organizer-banners' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));
CREATE POLICY "Owner/Admin Delete [organizer-banners]" ON storage.objects FOR DELETE USING (bucket_id = 'organizer-banners' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));

-- ======================= BUCKET: organizer-media =======================
CREATE POLICY "Public Read [organizer-media]" ON storage.objects FOR SELECT USING (bucket_id = 'organizer-media');
CREATE POLICY "Owner/Admin Insert [organizer-media]" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'organizer-media' AND auth.uid() = owner);
CREATE POLICY "Owner/Admin Update [organizer-media]" ON storage.objects FOR UPDATE USING (bucket_id = 'organizer-media' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));
CREATE POLICY "Owner/Admin Delete [organizer-media]" ON storage.objects FOR DELETE USING (bucket_id = 'organizer-media' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));

-- ======================= BUCKET: venue-images =======================
CREATE POLICY "Public Read [venue-images]" ON storage.objects FOR SELECT USING (bucket_id = 'venue-images');
CREATE POLICY "Owner/Admin Insert [venue-images]" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'venue-images' AND auth.uid() = owner);
CREATE POLICY "Owner/Admin Update [venue-images]" ON storage.objects FOR UPDATE USING (bucket_id = 'venue-images' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));
CREATE POLICY "Owner/Admin Delete [venue-images]" ON storage.objects FOR DELETE USING (bucket_id = 'venue-images' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));

-- ======================= BUCKET: system.notifications.attachments =======================
CREATE POLICY "Public Read [system.notifications.attachments]" ON storage.objects FOR SELECT USING (bucket_id = 'system.notifications.attachments');
CREATE POLICY "Owner/Admin Insert [system.notifications.attachments]" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'system.notifications.attachments' AND auth.uid() = owner);
CREATE POLICY "Owner/Admin Update [system.notifications.attachments]" ON storage.objects FOR UPDATE USING (bucket_id = 'system.notifications.attachments' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));
CREATE POLICY "Owner/Admin Delete [system.notifications.attachments]" ON storage.objects FOR DELETE USING (bucket_id = 'system.notifications.attachments' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));

-- ======================= BUCKET: system.assets.sponsors =======================
CREATE POLICY "Public Read [system.assets.sponsors]" ON storage.objects FOR SELECT USING (bucket_id = 'system.assets.sponsors');
CREATE POLICY "Owner/Admin Insert [system.assets.sponsors]" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'system.assets.sponsors' AND auth.uid() = owner);
CREATE POLICY "Owner/Admin Update [system.assets.sponsors]" ON storage.objects FOR UPDATE USING (bucket_id = 'system.assets.sponsors' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));
CREATE POLICY "Owner/Admin Delete [system.assets.sponsors]" ON storage.objects FOR DELETE USING (bucket_id = 'system.assets.sponsors' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));

-- ======================= BUCKET: users.documents.kyc =======================
CREATE POLICY "Private Read [users.documents.kyc]" ON storage.objects FOR SELECT USING (bucket_id = 'users.documents.kyc' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));
CREATE POLICY "Owner/Admin Insert [users.documents.kyc]" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'users.documents.kyc' AND auth.uid() = owner);
CREATE POLICY "Owner/Admin Update [users.documents.kyc]" ON storage.objects FOR UPDATE USING (bucket_id = 'users.documents.kyc' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));
CREATE POLICY "Owner/Admin Delete [users.documents.kyc]" ON storage.objects FOR DELETE USING (bucket_id = 'users.documents.kyc' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));

-- ======================= BUCKET: system.temp =======================
CREATE POLICY "Private Read [system.temp]" ON storage.objects FOR SELECT USING (bucket_id = 'system.temp' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));
CREATE POLICY "Owner/Admin Insert [system.temp]" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'system.temp' AND auth.uid() = owner);
CREATE POLICY "Owner/Admin Update [system.temp]" ON storage.objects FOR UPDATE USING (bucket_id = 'system.temp' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));
CREATE POLICY "Owner/Admin Delete [system.temp]" ON storage.objects FOR DELETE USING (bucket_id = 'system.temp' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));

-- ======================= BUCKET: system.assets.games =======================
CREATE POLICY "Public Read System Asset [system.assets.games]" ON storage.objects FOR SELECT USING (bucket_id = 'system.assets.games');
CREATE POLICY "Admin ONLY Insert [system.assets.games]" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'system.assets.games' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admin ONLY Update [system.assets.games]" ON storage.objects FOR UPDATE USING (bucket_id = 'system.assets.games' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admin ONLY Delete [system.assets.games]" ON storage.objects FOR DELETE USING (bucket_id = 'system.assets.games' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ======================= BUCKET: system.assets.website =======================
CREATE POLICY "Public Read System Asset [system.assets.website]" ON storage.objects FOR SELECT USING (bucket_id = 'system.assets.website');
CREATE POLICY "Admin ONLY Insert [system.assets.website]" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'system.assets.website' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admin ONLY Update [system.assets.website]" ON storage.objects FOR UPDATE USING (bucket_id = 'system.assets.website' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admin ONLY Delete [system.assets.website]" ON storage.objects FOR DELETE USING (bucket_id = 'system.assets.website' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

