-- Enable RLS on tournament_map_pools
ALTER TABLE tournament_map_pools ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public read access" ON tournament_map_pools;
DROP POLICY IF EXISTS "Organizers can manage map pools" ON tournament_map_pools;
DROP POLICY IF EXISTS "Organizers can insert maps" ON tournament_map_pools;
DROP POLICY IF EXISTS "Organizers can delete maps" ON tournament_map_pools;

-- Allow public read access
CREATE POLICY "Public read access" ON tournament_map_pools
  FOR SELECT USING (true);

-- Allow organizers to insert maps
CREATE POLICY "Organizers can insert maps" ON tournament_map_pools
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = tournament_map_pools.tournament_id
      AND tournaments.organizer_id = auth.uid()
    )
  );

-- Allow organizers to delete maps
CREATE POLICY "Organizers can delete maps" ON tournament_map_pools
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = tournament_map_pools.tournament_id
      AND tournaments.organizer_id = auth.uid()
    )
  );
