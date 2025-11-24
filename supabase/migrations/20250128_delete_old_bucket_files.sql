-- Delete all files from old storage buckets before deleting the buckets
-- ⚠️  WARNING: This will permanently delete all files in old buckets!
-- ⚠️  Make sure you've migrated important files first!

begin;

-- =====================================================
-- DELETE ALL FILES FROM OLD BUCKETS
-- =====================================================
-- Run these one at a time, or uncomment the ones you want to clean

-- Users domain
-- delete from storage.objects where bucket_id = 'user-avatars';
-- delete from storage.objects where bucket_id = 'kyc-documents';
-- delete from storage.objects where bucket_id = 'user-uploads';

-- Tournaments domain
-- delete from storage.objects where bucket_id = 'tournament-banners';
-- delete from storage.objects where bucket_id = 'tournament-results';
-- delete from storage.objects where bucket_id = 'tournament-screenshots';
-- delete from storage.objects where bucket_id = 'dispute-evidence';

-- Teams domain
-- delete from storage.objects where bucket_id = 'team-logos';

-- Venues domain
-- delete from storage.objects where bucket_id = 'venue-images';
-- delete from storage.objects where bucket_id = 'venue-layouts';

-- System domain
-- delete from storage.objects where bucket_id = 'game-assets';
-- delete from storage.objects where bucket_id = 'website-assets';
-- delete from storage.objects where bucket_id = 'sponsor-logos';
-- delete from storage.objects where bucket_id = 'notification-attachments';
-- delete from storage.objects where bucket_id = 'temp-uploads';

-- =====================================================
-- DELETE ALL OLD BUCKETS AT ONCE (after files are deleted)
-- =====================================================
-- Uncomment this ONLY after all files are deleted from old buckets

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

-- =====================================================
-- VERIFY BUCKETS ARE EMPTY (before deleting buckets)
-- =====================================================
-- Run this to check how many files are in each old bucket

select 
  bucket_id,
  count(*) as file_count
from storage.objects
where bucket_id in (
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
)
group by bucket_id
order by bucket_id;

commit;

-- ⚠️  IMPORTANT NOTES:
-- 1. Delete files FIRST (uncomment delete statements above)
-- 2. Verify buckets are empty (run the SELECT query)
-- 3. Then delete buckets (uncomment the DELETE FROM buckets statement)
-- 4. Do this one bucket at a time to be safe

