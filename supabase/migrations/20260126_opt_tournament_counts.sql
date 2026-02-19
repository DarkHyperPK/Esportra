-- Create a function to fetch tournaments with participant counts in a single query
-- This resolves the N+1 query performance bottleneck

create or replace function get_organizer_tournaments_with_counts(p_organizer_id uuid)
returns table (
  id uuid,
  name text,
  game text,
  start_date timestamptz,
  end_date timestamptz,
  venue_id uuid,
  max_teams integer,
  prize_pool numeric,
  organizer_id uuid,
  entry_fee numeric,
  is_public boolean,
  banner_url text,
  logo_url text,
  slug text,
  description text,
  deleted_at timestamptz,
  current_participants bigint,
  status text
) as $$
begin
  return query
  select 
    t.id,
    t.name,
    t.game,
    t.start_date,
    t.end_date,
    t.venue_id,
    t.max_teams,
    t.prize_pool,
    t.organizer_id,
    t.entry_fee,
    t.is_public,
    t.banner_url,
    t.logo_url,
    t.slug,
    t.description,
    t.deleted_at,
    (select count(*)::bigint from tournament_participants tp where tp.tournament_id = t.id) as current_participants,
    t.status::text
  from tournaments t
  where (
    t.organizer_id = p_organizer_id
    or exists (
      select 1 from tournament_staff ts
      where ts.tournament_id = t.id
      and ts.user_id = p_organizer_id
      and ts.status = 'active'
    )
  )
  and t.deleted_at is null
  order by t.start_date asc;
end;
$$ language plpgsql security definer;

-- Grant execute permission to authenticated users
grant execute on function get_organizer_tournaments_with_counts(uuid) to authenticated;
