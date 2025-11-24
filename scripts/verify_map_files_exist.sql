-- Verify that map image files exist in storage
-- This query checks if the files are accessible
-- Note: This requires the files to actually exist in the storage bucket

-- First, check what URLs are in the database
SELECT 
  map_name,
  map_image_url,
  CASE 
    WHEN map_image_url IS NULL THEN '❌ NULL'
    WHEN map_image_url LIKE '%system.assets.website%' THEN '✅ New bucket URL'
    WHEN map_image_url LIKE '%website-assets%' THEN '⚠️ Old bucket URL'
    ELSE '❓ Other'
  END as url_status
FROM public.game_maps
WHERE game = 'Valorant'
  AND LOWER(map_name) IN ('breeze', 'icebox', 'split', 'sunset')
ORDER BY map_name;

-- Expected file paths in storage bucket: system.assets.website
-- Valorant Maps Pictures/Breeze.webp
-- Valorant Maps Pictures/Icebox.webp
-- Valorant Maps Pictures/split.jpg
-- Valorant Maps Pictures/Sunset.webp

-- If files don't exist, you need to upload them to:
-- Bucket: system.assets.website
-- Path: Valorant Maps Pictures/{filename}

