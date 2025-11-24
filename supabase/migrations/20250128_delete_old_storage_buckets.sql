-- Delete old storage buckets after migration is complete
-- ⚠️  WARNING: Only run this after deleting all files from old buckets!
-- ⚠️  You MUST delete files first using: 20250128_delete_old_bucket_files.sql
-- ⚠️  This will permanently delete buckets (but they should be empty)!

-- Steps to delete old buckets:
-- 1. First run: 20250128_delete_old_bucket_files.sql (to delete all files)
-- 2. Verify buckets are empty (run the SELECT query in that file)
-- 3. Then run this file to delete the empty buckets

begin;

-- List of old bucket names to delete
-- Uncomment the buckets you want to delete after verification

-- Users domain
-- delete from storage.buckets where id = 'user-avatars';
-- delete from storage.buckets where id = 'kyc-documents';
-- delete from storage.buckets where id = 'user-uploads';

-- Tournaments domain
-- delete from storage.buckets where id = 'tournament-banners';
-- delete from storage.buckets where id = 'tournament-results';
-- delete from storage.buckets where id = 'tournament-screenshots';
-- delete from storage.buckets where id = 'dispute-evidence';

-- Teams domain
-- delete from storage.buckets where id = 'team-logos';

-- Venues domain
-- delete from storage.buckets where id = 'venue-images';
-- delete from storage.buckets where id = 'venue-layouts';

-- System domain
-- delete from storage.buckets where id = 'game-assets';
-- delete from storage.buckets where id = 'website-assets';
-- delete from storage.buckets where id = 'sponsor-logos';
-- delete from storage.buckets where id = 'notification-attachments';
-- delete from storage.buckets where id = 'temp-uploads';

-- Alternative: Delete all old buckets at once (use with caution!)
/*
delete from storage.buckets 
where id in (
  'user-avatars',
  'kyc-documents',
  'user-uploads',
  'tournament-banners',
  'tournament-results',
  'tournament-screenshots',
  'dispute-evidence',
  'team-logos',
  'venue-images',
  'venue-layouts',
  'game-assets',
  'website-assets',
  'sponsor-logos',
  'notification-attachments',
  'temp-uploads'
);
*/

commit;

-- ⚠️  IMPORTANT NOTES:
-- 1. This script is commented out by default for safety
-- 2. Uncomment only the buckets you've verified are migrated
-- 3. Delete buckets one at a time or in small groups
-- 4. Keep backups of important data
-- 5. Test your application after each deletion

