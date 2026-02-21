const fs = require('fs');

const publicBuckets = [
    'users.avatars', 'users.uploads', 'tournaments.banners', 'tournaments.results',
    'tournaments.media', 'tournaments.disputes.evidence', 'teams.logos',
    'venues.images', 'venues.layouts', 'organizer-banners', 'organizer-media',
    'venue-images', 'system.notifications.attachments', 'system.assets.sponsors'
];

const privateBuckets = ['users.documents.kyc', 'system.temp'];
const adminBuckets = ['system.assets.games', 'system.assets.website'];

let sql = `-- 1. WIPE EXISTING BUCKET POLICIES (Start Fresh)
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

`;

for (const b of publicBuckets) {
    sql += `-- ======================= BUCKET: ${b} =======================\n`;
    sql += `CREATE POLICY "Public Read [${b}]" ON storage.objects FOR SELECT USING (bucket_id = '${b}');\n`;
    sql += `CREATE POLICY "Owner/Admin Insert [${b}]" ON storage.objects FOR INSERT WITH CHECK (bucket_id = '${b}' AND auth.uid() = owner);\n`;
    sql += `CREATE POLICY "Owner/Admin Update [${b}]" ON storage.objects FOR UPDATE USING (bucket_id = '${b}' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));\n`;
    sql += `CREATE POLICY "Owner/Admin Delete [${b}]" ON storage.objects FOR DELETE USING (bucket_id = '${b}' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));\n\n`;
}

for (const b of privateBuckets) {
    sql += `-- ======================= BUCKET: ${b} =======================\n`;
    sql += `CREATE POLICY "Private Read [${b}]" ON storage.objects FOR SELECT USING (bucket_id = '${b}' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));\n`;
    sql += `CREATE POLICY "Owner/Admin Insert [${b}]" ON storage.objects FOR INSERT WITH CHECK (bucket_id = '${b}' AND auth.uid() = owner);\n`;
    sql += `CREATE POLICY "Owner/Admin Update [${b}]" ON storage.objects FOR UPDATE USING (bucket_id = '${b}' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));\n`;
    sql += `CREATE POLICY "Owner/Admin Delete [${b}]" ON storage.objects FOR DELETE USING (bucket_id = '${b}' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));\n\n`;
}

for (const b of adminBuckets) {
    sql += `-- ======================= BUCKET: ${b} =======================\n`;
    sql += `CREATE POLICY "Public Read System Asset [${b}]" ON storage.objects FOR SELECT USING (bucket_id = '${b}');\n`;
    sql += `CREATE POLICY "Admin ONLY Insert [${b}]" ON storage.objects FOR INSERT WITH CHECK (bucket_id = '${b}' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));\n`;
    sql += `CREATE POLICY "Admin ONLY Update [${b}]" ON storage.objects FOR UPDATE USING (bucket_id = '${b}' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));\n`;
    sql += `CREATE POLICY "Admin ONLY Delete [${b}]" ON storage.objects FOR DELETE USING (bucket_id = '${b}' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));\n\n`;
}

fs.writeFileSync('supabase/migrations/20260221_precise_storage_rls.sql', sql);
console.log("SQL script generated");
