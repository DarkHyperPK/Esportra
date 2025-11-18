-- Fix: Add side column to match_map_veto_actions if missing
-- This migration ensures the side column exists for attack/defend selection

begin;

-- Add side column to match_map_veto_actions if it doesn't exist
do $$
begin
  if not exists (
    select 1 
    from information_schema.columns 
    where table_schema = 'public' 
      and table_name = 'match_map_veto_actions' 
      and column_name = 'side'
  ) then
    alter table public.match_map_veto_actions
      add column side text check (side in ('attack', 'defend'));
    
    raise notice 'Added side column to match_map_veto_actions';
  else
    raise notice 'side column already exists in match_map_veto_actions';
  end if;
end $$;

commit;

