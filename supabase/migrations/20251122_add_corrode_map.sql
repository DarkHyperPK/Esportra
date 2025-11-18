-- Add Corrode map to Valorant maps if it doesn't exist
-- This is a fix for the missing Corrode map

BEGIN;

INSERT INTO public.game_maps (game, map_name, is_active, map_image_url)
VALUES (
  'Valorant',
  'Corrode',
  true,
  'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/website-assets/Valorant%20Maps%20Pictures/Corrode.webp'
)
ON CONFLICT (game, map_name) DO UPDATE
SET 
  is_active = EXCLUDED.is_active,
  map_image_url = EXCLUDED.map_image_url;

COMMIT;

