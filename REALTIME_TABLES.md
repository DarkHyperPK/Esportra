# Tables That Need Realtime Enabled in Supabase

To enable real-time bracket updates and map veto synchronization across browsers, you need to enable Realtime on the following tables:

## Required Tables for Brackets System

1. **`tournament_matches`**
   - Used for: Bracket match updates (team swaps, scores, status changes, deletions)
   - Subscription: `tournament_matches_${tournament.id}`
   - Events: INSERT, UPDATE, DELETE
   - **Critical for:** Real-time bracket updates when teams are dragged/swapped or brackets are cleared

2. **`tournament_match_results`**
   - Used for: Match result uploads and verification
   - Subscription: `tournament_results_${tournament.id}`
   - Events: INSERT, DELETE

3. **`tournament_participants`**
   - Used for: Participant/team changes (when teams are added/removed)
   - Subscription: `tournament_participants_${tournament.id}`
   - Events: INSERT, UPDATE, DELETE

## Required Tables for Map Veto System

4. **`match_map_vetos`**
   - Used for: Map veto state updates (BO selection, status, team links)
   - Subscriptions: 
     - `match-veto-${matchId}` (for specific match)
     - `veto-links-${tournament.id}-${userTeamId}` (for team-specific links)
   - Events: INSERT, UPDATE

5. **`match_map_veto_actions`**
   - Used for: Real-time map ban/pick actions
   - Subscription: `match-veto-actions-${matchId}`
   - Events: INSERT

## How to Enable Realtime in Supabase

### Option 1: Via Database Migration (Recommended)
Run the migration file: `supabase/migrations/20251122_enable_realtime_tables.sql`

This migration will:
- Add all 5 tables to the `supabase_realtime` publication
- Handle errors gracefully (won't fail if tables are already added)
- Verify that all tables were successfully added
- Provide detailed logging of the process

### Option 2: Via Supabase Dashboard
1. Go to your Supabase Dashboard
2. Navigate to **Database** → **Replication**
3. For each table listed above, toggle **Realtime** to **ON**

### Option 3: Via SQL (Manual)
Run this SQL in your Supabase SQL Editor:

```sql
-- Enable Realtime for bracket system tables
ALTER PUBLICATION supabase_realtime ADD TABLE tournament_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE tournament_match_results;
ALTER PUBLICATION supabase_realtime ADD TABLE tournament_participants;

-- Enable Realtime for map veto system tables
ALTER PUBLICATION supabase_realtime ADD TABLE match_map_vetos;
ALTER PUBLICATION supabase_realtime ADD TABLE match_map_veto_actions;
```

### Verify Realtime is Enabled
After enabling, you can verify by:
1. Checking the Replication page in your Supabase Dashboard - all tables should show a green checkmark or "Active" status
2. Running this query:
```sql
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN (
    'tournament_matches',
    'tournament_match_results',
    'tournament_participants',
    'match_map_vetos',
    'match_map_veto_actions'
);
```

## Notes
- Realtime must be enabled on all these tables for the bracket system to work properly
- **Without Realtime, changes in one browser won't sync to other browsers** (e.g., clearing brackets, dragging teams)
- Realtime uses PostgreSQL's logical replication, so it's efficient and reliable
- The `tournament_matches` table is especially critical for bracket clearing and team swaps

