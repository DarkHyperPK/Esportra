-- Fix map images to use new storage bucket structure
-- Update game_maps.map_image_url to use system.assets.games (for game assets)
-- Maps are located in: system.assets.games/Valorant Maps Pictures/
-- Note: If files are in system.assets.website, change 'games' to 'website' below

BEGIN;

-- Update all Valorant map images to use system.assets.games bucket
-- Change 'games' to 'website' if your files are in system.assets.website instead
UPDATE public.game_maps
SET map_image_url = CASE 
  WHEN LOWER(map_name) = 'abyss' THEN 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.games/Valorant%20Maps%20Pictures/Abyss.webp'
  WHEN LOWER(map_name) = 'ascent' THEN 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.games/Valorant%20Maps%20Pictures/Ascent.webp'
  WHEN LOWER(map_name) = 'bind' THEN 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.games/Valorant%20Maps%20Pictures/Bind.webp'
  WHEN LOWER(map_name) = 'breeze' THEN 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.games/Valorant%20Maps%20Pictures/Breeze.webp'
  WHEN LOWER(map_name) = 'corrode' THEN 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.games/Valorant%20Maps%20Pictures/Corrode.webp'
  WHEN LOWER(map_name) = 'fracture' THEN 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.games/Valorant%20Maps%20Pictures/Fracture.webp'
  WHEN LOWER(map_name) = 'haven' THEN 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.games/Valorant%20Maps%20Pictures/haven.jpg'
  WHEN LOWER(map_name) = 'icebox' THEN 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.games/Valorant%20Maps%20Pictures/Icebox.webp'
  WHEN LOWER(map_name) = 'lotus' THEN 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.games/Valorant%20Maps%20Pictures/Lotus.webp'
  WHEN LOWER(map_name) = 'pearl' THEN 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.games/Valorant%20Maps%20Pictures/pearl.jpg'
  WHEN LOWER(map_name) = 'split' THEN 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.games/Valorant%20Maps%20Pictures/split.jpg'
  WHEN LOWER(map_name) = 'sunset' THEN 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.games/Valorant%20Maps%20Pictures/Sunset.webp'
  -- For any other maps, try to update the bucket name if it exists
  ELSE COALESCE(
    REPLACE(
      REPLACE(
        REPLACE(map_image_url, '/website-assets/', '/system.assets.games/'),
        'website-assets/',
        'system.assets.games/'
      ),
      'system.assets.website/',
      'system.assets.games/'
    ),
    map_image_url
  )
END
WHERE game = 'Valorant'
  AND LOWER(map_name) IN ('abyss', 'ascent', 'bind', 'breeze', 'corrode', 'fracture', 'haven', 'icebox', 'lotus', 'pearl', 'split', 'sunset');

COMMIT;

-- Verification query
SELECT 
  map_name,
  map_image_url,
  CASE 
    WHEN map_image_url LIKE '%system.assets%' THEN '✅ New bucket'
    WHEN map_image_url LIKE '%website-assets%' THEN '⚠️ Old bucket'
    ELSE '❓ Unknown'
  END as bucket_status
FROM public.game_maps
WHERE game = 'Valorant'
ORDER BY map_name;

