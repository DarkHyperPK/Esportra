# Realtime Database Tables Setup

To enable realtime updates in the tournament management system, you need to enable realtime on the following Supabase tables:

## Required Tables for Realtime

1. **`tournaments`** - For tournament data updates
2. **`tournament_participants`** - For participant list updates

## How to Enable Realtime in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Database** → **Replication**
3. Enable replication for the following tables:
   - `tournaments`
   - `tournament_participants`

Alternatively, you can enable realtime using SQL:

```sql
-- Enable realtime for tournaments table
ALTER PUBLICATION supabase_realtime ADD TABLE tournaments;

-- Enable realtime for tournament_participants table
ALTER PUBLICATION supabase_realtime ADD TABLE tournament_participants;
```

## What This Fixes

- **No more page reloads**: Changes to tournament data and participants will update in real-time
- **Instant updates**: When participants register/unregister, the list updates automatically
- **Tournament status changes**: Status updates reflect immediately without refresh

## Current Implementation

The `TournamentManage.tsx` component now subscribes to:
- Tournament changes (UPDATE events on `tournaments` table)
- Participant changes (INSERT, UPDATE, DELETE events on `tournament_participants` table)

Both subscriptions filter by the current tournament ID to only receive relevant updates.

