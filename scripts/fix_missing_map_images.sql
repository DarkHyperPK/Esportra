-- Force update ALL Valorant map images to use new bucket
-- This will set URLs even if they're currently NULL or have other values
-- Run this if the previous migration didn't work

BEGIN;

-- Update all 12 Valorant maps with correct URLs
UPDATE public.game_maps
SET map_image_url = CASE 
  WHEN LOWER(map_name) = 'abyss' THEN 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/Valorant%20Maps%20Pictures/Abyss.webp'
  WHEN LOWER(map_name) = 'ascent' THEN 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/Valorant%20Maps%20Pictures/Ascent.webp'
  WHEN LOWER(map_name) = 'bind' THEN 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/Valorant%20Maps%20Pictures/Bind.webp'
  WHEN LOWER(map_name) = 'breeze' THEN 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/Valorant%20Maps%20Pictures/Breeze.webp'
  WHEN LOWER(map_name) = 'corrode' THEN 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/Valorant%20Maps%20Pictures/Corrode.webp'
  WHEN LOWER(map_name) = 'fracture' THEN 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/Valorant%20Maps%20Pictures/Fracture.webp'
  WHEN LOWER(map_name) = 'haven' THEN 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/Valorant%20Maps%20Pictures/haven.jpg'
  WHEN LOWER(map_name) = 'icebox' THEN 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/Valorant%20Maps%20Pictures/Icebox.webp'
  WHEN LOWER(map_name) = 'lotus' THEN 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/Valorant%20Maps%20Pictures/Lotus.webp'
  WHEN LOWER(map_name) = 'pearl' THEN 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/Valorant%20Maps%20Pictures/pearl.jpg'
  WHEN LOWER(map_name) = 'split' THEN 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/Valorant%20Maps%20Pictures/split.jpg'
  WHEN LOWER(map_name) = 'sunset' THEN 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/Valorant%20Maps%20Pictures/Sunset.webp'
  ELSE map_image_url
END
WHERE game = 'Valorant'
  AND LOWER(map_name) IN ('abyss', 'ascent', 'bind', 'breeze', 'corrode', 'fracture', 'haven', 'icebox', 'lotus', 'pearl', 'split', 'sunset');

COMMIT;

-- Verify the update
SELECT 
  map_name,
  map_image_url,
  CASE 
    WHEN map_image_url IS NULL THEN '❌ NULL - Migration failed!'
    WHEN map_image_url LIKE '%system.assets.website%' THEN '✅ New bucket'
    WHEN map_image_url LIKE '%website-assets%' THEN '⚠️ Old bucket - needs update'
    ELSE '❓ Unknown'
  END as status
FROM public.game_maps
WHERE game = 'Valorant'
ORDER BY map_name;

