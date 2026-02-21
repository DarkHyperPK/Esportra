-- 1. ENABLE RLS ON STORAGE TABLES
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2. DROP EVERYTHING EXISTING
-- We drop all existing policies on storage.buckets and storage.objects to start fresh
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Drop policies for storage.buckets
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'buckets' LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON storage.buckets';
    END LOOP;

    -- Drop policies for storage.objects
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON storage.objects';
    END LOOP;
END $$;


-- 3. CREATE BUCKET POLICIES (STORAGE.BUCKETS)
-- Allows any authenticated user to see the buckets
CREATE POLICY "Public & Auth users can read buckets" 
ON storage.buckets FOR SELECT 
USING ( true );

-- Allows only authenticated users (or you as admin) to create/update/delete buckets
CREATE POLICY "Auth users can create buckets" 
ON storage.buckets FOR INSERT 
TO authenticated 
WITH CHECK ( true );

CREATE POLICY "Auth users can update buckets" 
ON storage.buckets FOR UPDATE 
TO authenticated 
USING ( true );

CREATE POLICY "Auth users can delete buckets" 
ON storage.buckets FOR DELETE 
TO authenticated 
USING ( true );


-- 4. CREATE OBJECT POLICIES (STORAGE.OBJECTS)
-- Allow public reading of any file in 'Public' buckets.
-- (If you want ALL buckets to be perfectly readable, we'll just allow SELECT on all objects below)
CREATE POLICY "Public Read All Objects" 
ON storage.objects FOR SELECT 
USING ( true ); 

-- Allow purely Authenticated Users to Insert/Upload files into any bucket
CREATE POLICY "Auth users can upload objects" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK ( true );

-- Allow purely Authenticated Users to Edit/Update files in any bucket
CREATE POLICY "Auth users can update objects" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING ( true );

-- Allow purely Authenticated Users to Delete/Remove files from any bucket
CREATE POLICY "Auth users can delete objects" 
ON storage.objects FOR DELETE 
TO authenticated 
USING ( true );


-- ==========================================
-- OPTIONAL FIX FOR SUPABASE STUDIO ADMINS
-- If your own user account inside Supabase Studio is getting blocked:
-- The 'service_role' and 'postgres' roles ALWAYS bypass RLS.
-- But if your logged-in dashboard user is restricted in Self-Hosted, this forces bypass:
ALTER TABLE storage.buckets FORCE ROW LEVEL SECURITY;
ALTER TABLE storage.objects FORCE ROW LEVEL SECURITY;

-- (It restricts the table so nothing gets through EXCEPT users holding the explicit policies above,
-- plus the superuser/service_role which override FORCE RLS anyway.)
