-- List all storage buckets in your Supabase project
-- Run this in SQL Editor to see all buckets and their configuration

-- =====================================================
-- BASIC: List all buckets
-- =====================================================
SELECT 
  id as bucket_id,
  name as bucket_name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at,
  updated_at
FROM storage.buckets
ORDER BY name;

-- =====================================================
-- DETAILED: List buckets with file counts
-- =====================================================
SELECT 
  b.id as bucket_id,
  b.name as bucket_name,
  b.public,
  b.file_size_limit,
  COALESCE(file_counts.file_count, 0) as file_count,
  COALESCE(file_counts.total_size, 0) as total_size_bytes,
  b.created_at,
  b.updated_at
FROM storage.buckets b
LEFT JOIN (
  SELECT 
    bucket_id,
    COUNT(*) as file_count,
    SUM(metadata->>'size')::bigint as total_size
  FROM storage.objects
  GROUP BY bucket_id
) file_counts ON b.id = file_counts.bucket_id
ORDER BY b.name;

-- =====================================================
-- SUMMARY: Count buckets by type
-- =====================================================
SELECT 
  CASE 
    WHEN id LIKE 'users.%' THEN 'Users Domain'
    WHEN id LIKE 'tournaments.%' THEN 'Tournaments Domain'
    WHEN id LIKE 'teams.%' THEN 'Teams Domain'
    WHEN id LIKE 'venues.%' THEN 'Venues Domain'
    WHEN id LIKE 'system.%' THEN 'System Domain'
    ELSE 'Legacy/Other'
  END as domain,
  COUNT(*) as bucket_count,
  SUM(CASE WHEN public THEN 1 ELSE 0 END) as public_buckets,
  SUM(CASE WHEN NOT public THEN 1 ELSE 0 END) as private_buckets
FROM storage.buckets
GROUP BY 
  CASE 
    WHEN id LIKE 'users.%' THEN 'Users Domain'
    WHEN id LIKE 'tournaments.%' THEN 'Tournaments Domain'
    WHEN id LIKE 'teams.%' THEN 'Teams Domain'
    WHEN id LIKE 'venues.%' THEN 'Venues Domain'
    WHEN id LIKE 'system.%' THEN 'System Domain'
    ELSE 'Legacy/Other'
  END
ORDER BY domain;

-- =====================================================
-- OLD VS NEW: Compare old and new bucket structure
-- =====================================================
SELECT 
  CASE 
    WHEN id IN (
      'user-avatars', 'kyc-documents', 'user-uploads',
      'tournament-banners', 'tournament-results', 'tournament-screenshots', 'dispute-evidence',
      'team-logos',
      'venue-images', 'venue-layouts',
      'game-assets', 'website-assets', 'sponsor-logos',
      'notification-attachments', 'temp-uploads'
    ) THEN 'Old Structure'
    ELSE 'New Structure'
  END as bucket_type,
  id as bucket_id,
  name as bucket_name,
  public,
  (SELECT COUNT(*) FROM storage.objects WHERE bucket_id = b.id) as file_count
FROM storage.buckets b
ORDER BY bucket_type, name;

-- =====================================================
-- EMPTY BUCKETS: Find buckets with no files
-- =====================================================
SELECT 
  b.id as bucket_id,
  b.name as bucket_name,
  b.public,
  b.created_at
FROM storage.buckets b
LEFT JOIN storage.objects o ON b.id = o.bucket_id
WHERE o.id IS NULL
ORDER BY b.name;

-- =====================================================
-- BUCKETS WITH FILES: Find buckets that have files
-- =====================================================
SELECT 
  b.id as bucket_id,
  b.name as bucket_name,
  b.public,
  COUNT(o.id) as file_count,
  MIN(o.created_at) as oldest_file,
  MAX(o.created_at) as newest_file
FROM storage.buckets b
INNER JOIN storage.objects o ON b.id = o.bucket_id
GROUP BY b.id, b.name, b.public
ORDER BY file_count DESC;

