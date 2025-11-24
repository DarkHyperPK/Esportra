-- Check which bucket has the map images
-- Run this to see what's in both buckets

-- Check current database URLs
SELECT 
  map_name,
  map_image_url,
  CASE 
    WHEN map_image_url LIKE '%system.assets.games%' THEN '🎮 games bucket'
    WHEN map_image_url LIKE '%system.assets.website%' THEN '🌐 website bucket'
    WHEN map_image_url LIKE '%website-assets%' THEN '⚠️ old bucket'
    WHEN map_image_url IS NULL THEN '❌ NULL'
    ELSE '❓ Other'
  END as bucket_location
FROM public.game_maps
WHERE game = 'Valorant'
ORDER BY map_name;

-- Expected files in storage:
-- system.assets.games/Valorant Maps Pictures/* OR
-- system.assets.website/Valorant Maps Pictures/*

-- You need to check in Supabase Dashboard:
-- 1. Go to Storage > system.assets.games > Valorant Maps Pictures/
-- 2. Go to Storage > system.assets.website > Valorant Maps Pictures/
-- 3. See which one has the actual files

