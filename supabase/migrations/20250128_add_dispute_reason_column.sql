-- Add dispute_reason column to tournament_disputes table
-- This allows categorizing disputes for better organization and filtering

begin;

-- Add dispute_reason column if it doesn't exist
do $$ begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
      and table_name = 'tournament_disputes' 
      and column_name = 'dispute_reason'
  ) then
    alter table public.tournament_disputes 
    add column dispute_reason text;
  end if;
end $$;

-- Add index for filtering by reason
create index if not exists idx_td_dispute_reason on public.tournament_disputes(dispute_reason) where dispute_reason is not null;

commit;

