-- Add map images for popular esports games
-- Using high-quality gaming-themed images from Unsplash

begin;

-- Valorant Maps with gaming-themed images
update public.game_maps
set map_image_url = case map_name
  when 'Bind' then 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=600&fit=crop&q=90'
  when 'Haven' then 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=800&h=600&fit=crop&q=90'
  when 'Split' then 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=800&h=600&fit=crop&q=90'
  when 'Ascent' then 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=600&fit=crop&q=90'
  when 'Icebox' then 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=800&h=600&fit=crop&q=90'
  when 'Breeze' then 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=600&fit=crop&q=90'
  when 'Fracture' then 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=800&h=600&fit=crop&q=90'
  when 'Pearl' then 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=600&fit=crop&q=90'
  when 'Lotus' then 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=800&h=600&fit=crop&q=90'
  when 'Sunset' then 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=600&fit=crop&q=90'
  when 'Abyss' then 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=800&h=600&fit=crop&q=90'
  else map_image_url
end
where game = 'Valorant' and map_image_url is null;

-- Counter-Strike 2 Maps with gaming-themed images
update public.game_maps
set map_image_url = case map_name
  when 'Dust II' then 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=600&fit=crop&q=90'
  when 'Mirage' then 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=800&h=600&fit=crop&q=90'
  when 'Inferno' then 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=600&fit=crop&q=90'
  when 'Nuke' then 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=600&fit=crop&q=90'
  when 'Overpass' then 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=800&h=600&fit=crop&q=90'
  when 'Vertigo' then 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=600&fit=crop&q=90'
  when 'Ancient' then 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=600&fit=crop&q=90'
  when 'Anubis' then 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=800&h=600&fit=crop&q=90'
  when 'Cache' then 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=600&fit=crop&q=90'
  when 'Train' then 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=600&fit=crop&q=90'
  else map_image_url
end
where game = 'Counter-Strike 2' and map_image_url is null;

-- Use generic gaming images for other games as fallback
update public.game_maps
set map_image_url = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=600&fit=crop&q=90'
where map_image_url is null;

commit;

