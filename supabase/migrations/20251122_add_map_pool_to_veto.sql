-- Add selected_map_pool column to match_map_vetos
-- This allows organizers to select which maps are available for the veto process

begin;

-- Add column to store selected map pool (array of map IDs)
alter table public.match_map_vetos
  add column if not exists selected_map_pool uuid[] default null;

-- Add comment
comment on column public.match_map_vetos.selected_map_pool is 'Array of map IDs selected by organizer for this match veto. If null, all maps for the game are available.';

commit;

