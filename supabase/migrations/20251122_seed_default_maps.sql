-- Seed default maps for popular esports games
-- Idempotent: safe to run multiple times

begin;

-- Counter-Strike 2 Maps
insert into public.game_maps (game, map_name, is_active) values
  ('Counter-Strike 2', 'Dust II', true),
  ('Counter-Strike 2', 'Mirage', true),
  ('Counter-Strike 2', 'Inferno', true),
  ('Counter-Strike 2', 'Nuke', true),
  ('Counter-Strike 2', 'Overpass', true),
  ('Counter-Strike 2', 'Vertigo', true),
  ('Counter-Strike 2', 'Ancient', true),
  ('Counter-Strike 2', 'Anubis', true),
  ('Counter-Strike 2', 'Cache', true),
  ('Counter-Strike 2', 'Train', true)
on conflict (game, map_name) do nothing;

-- Valorant Maps
insert into public.game_maps (game, map_name, is_active) values
  ('Valorant', 'Bind', true),
  ('Valorant', 'Haven', true),
  ('Valorant', 'Split', true),
  ('Valorant', 'Ascent', true),
  ('Valorant', 'Icebox', true),
  ('Valorant', 'Breeze', true),
  ('Valorant', 'Fracture', true),
  ('Valorant', 'Pearl', true),
  ('Valorant', 'Lotus', true),
  ('Valorant', 'Sunset', true),
  ('Valorant', 'Abyss', true),
  ('Valorant', 'Corrode', true)
on conflict (game, map_name) do nothing;

-- Rainbow Six Siege Maps (popular competitive maps)
insert into public.game_maps (game, map_name, is_active) values
  ('Rainbow Six Siege', 'Bank', true),
  ('Rainbow Six Siege', 'Border', true),
  ('Rainbow Six Siege', 'Chalet', true),
  ('Rainbow Six Siege', 'Clubhouse', true),
  ('Rainbow Six Siege', 'Coastline', true),
  ('Rainbow Six Siege', 'Consulate', true),
  ('Rainbow Six Siege', 'Kafe Dostoyevsky', true),
  ('Rainbow Six Siege', 'Oregon', true),
  ('Rainbow Six Siege', 'Skyscraper', true),
  ('Rainbow Six Siege', 'Theme Park', true),
  ('Rainbow Six Siege', 'Villa', true)
on conflict (game, map_name) do nothing;

-- Call of Duty Maps (for competitive)
insert into public.game_maps (game, map_name, is_active) values
  ('Call of Duty', 'Highrise', true),
  ('Call of Duty', 'Invasion', true),
  ('Call of Duty', 'Karachi', true),
  ('Call of Duty', 'Rio', true),
  ('Call of Duty', 'Sub Base', true),
  ('Call of Duty', 'Vista', true)
on conflict (game, map_name) do nothing;

-- Apex Legends Maps
insert into public.game_maps (game, map_name, is_active) values
  ('Apex Legends', 'King''s Canyon', true),
  ('Apex Legends', 'World''s Edge', true),
  ('Apex Legends', 'Olympus', true),
  ('Apex Legends', 'Storm Point', true),
  ('Apex Legends', 'Broken Moon', true)
on conflict (game, map_name) do nothing;

commit;

