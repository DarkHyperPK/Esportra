-- Check map image URLs in database
-- Run this to see which maps have images and which don't

SELECT 
  map_name,
  map_image_url,
  CASE 
    WHEN map_image_url IS NULL THEN '❌ NULL - No URL'
    WHEN map_image_url LIKE '%system.assets.website%' THEN '✅ New bucket'
    WHEN map_image_url LIKE '%website-assets%' THEN '⚠️ Old bucket'
    ELSE '❓ Unknown/Other'
  END as status
FROM public.game_maps
WHERE game = 'Valorant'
ORDER BY map_name;

-- Check if specific maps exist
SELECT 
  map_name,
  map_image_url IS NULL as is_null,
  map_image_url LIKE '%Breeze%' as has_breeze_url,
  map_image_url LIKE '%Icebox%' as has_icebox_url,
  map_image_url LIKE '%Split%' as has_split_url,
  map_image_url LIKE '%Sunset%' as has_sunset_url
FROM public.game_maps
WHERE game = 'Valorant'
  AND LOWER(map_name) IN ('breeze', 'icebox', 'split', 'sunset');

