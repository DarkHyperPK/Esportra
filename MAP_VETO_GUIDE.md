# Map Veto System Guide

## What is Map Veto?

Map Veto is a competitive feature that allows teams to ban and pick maps before a match starts. It's similar to mapban.gg and is commonly used in esports tournaments for games like Valorant, CS2, League of Legends, etc.

## How It Works

### 1. **Setup Phase (Organizer)**

**Step 1: Create/Select a Tournament**
- Go to your tournament management page
- Make sure the tournament has a game selected (e.g., "Valorant", "Counter-Strike 2")

**Step 2: Configure Map Pool**
- In the tournament management page, click on the **"Map Pool"** tab
- You'll see all available maps for that game (pre-seeded from the database)
- Check/uncheck maps to include/exclude them from the tournament's map pool
- Only maps in the pool can be used for veto in matches

**Step 3: Default Maps**
- Default maps are already seeded in the database for popular games:
  - Valorant: Bind, Haven, Split, Ascent, Icebox, Breeze, Fracture, Pearl, Lotus, Sunset, Abyss
  - Counter-Strike 2: Dust II, Mirage, Inferno, Nuke, Overpass, Vertigo, Ancient, Anubis, Cache, Train
  - And more...

### 2. **Veto Process (During Match)**

**Who Can Use It:**
- **Organizers**: Can start and participate in veto for any match
- **Team Captains**: Can participate in veto for their own team's matches

**How to Start:**
1. Go to the tournament brackets page
2. Find a match that has both teams assigned (not "TBD")
3. Click the **"Map Veto"** button (purple button with map icon)
4. The Map Veto dialog will open

**Veto Sequence (Standard 7-Map Format):**
The system uses a turn-based sequence:
1. **Team 1 Bans** a map
2. **Team 2 Bans** a map
3. **Team 1 Picks** a map (this will be played)
4. **Team 2 Picks** a map (this will be played)
5. **Team 1 Bans** another map
6. **Team 2 Bans** another map
7. **Team 1 Picks** the final map (this will be played)

**Result:** The last picked map is the one that will be played for the match.

### 3. **Real-Time Updates**

- The veto process updates in real-time for both teams
- When one team makes a move, the other team sees it immediately
- There's a timer (default 2 minutes) for each turn
- The system tracks whose turn it is

### 4. **After Veto Completes**

- The selected map is saved to the match
- A badge appears on the match card showing the selected map
- The match is ready to proceed with the chosen map

## How to Test/Check

### Testing as Organizer:

1. **Check Map Pool Setup:**
   ```
   - Go to: Tournament Management → Map Pool tab
   - Verify maps are listed for your game
   - Add/remove maps as needed
   ```

2. **Test Map Veto:**
   ```
   - Go to: Tournament Brackets page
   - Find a match with two teams
   - Click "Map Veto" button
   - You should see the Map Veto interface
   - Try banning/picking maps
   - Complete the sequence
   - Check that the selected map appears on the match card
   ```

3. **Check Database:**
   ```sql
   -- Check if maps are seeded
   SELECT * FROM game_maps WHERE game = 'Valorant';
   
   -- Check tournament map pool
   SELECT * FROM tournament_map_pools WHERE tournament_id = 'your-tournament-id';
   
   -- Check match veto status
   SELECT * FROM match_map_vetos WHERE match_id = 'your-match-id';
   
   -- Check veto actions
   SELECT * FROM match_map_veto_actions WHERE match_id = 'your-match-id';
   ```

### Testing as Team Captain:

1. **Verify Captain Status:**
   - Make sure you're a captain of one of the teams in the match
   - Check in `team_members` table: `role = 'captain'` and `is_active = true`

2. **Test Participation:**
   - Go to brackets page
   - Find your team's match
   - Click "Map Veto" button
   - You should be able to ban/pick when it's your turn
   - You should NOT be able to act when it's the opponent's turn

### Common Issues to Check:

1. **"Map Veto button doesn't appear":**
   - Check: Match has both teams assigned (not TBD)
   - Check: Match ID starts with "db-" (saved in database)
   - Check: You're logged in as organizer or captain

2. **"No maps available":**
   - Check: Tournament has a game selected
   - Check: Map pool is configured in Tournament Management → Map Pool
   - Check: Maps exist in `game_maps` table for that game

3. **"Can't ban/pick maps":**
   - Check: It's your team's turn
   - Check: You're the team captain (for players)
   - Check: Veto process is "in_progress" (not completed)

4. **"Dialog doesn't open":**
   - Check browser console for errors
   - Check: `mapVetoOpen` state is being set
   - Check: Match data is valid

## Database Structure

### Tables:

1. **`game_maps`**: All available maps per game
2. **`tournament_map_pools`**: Which maps are available for a specific tournament
3. **`match_map_vetos`**: The veto process state for each match
4. **`match_map_veto_actions`**: Log of all ban/pick actions

### Key Fields:

- `match_map_vetos.status`: 'pending', 'in_progress', 'completed', 'cancelled'
- `match_map_vetos.current_team_id`: Whose turn it is
- `match_map_vetos.current_action`: 'ban' or 'pick'
- `match_map_vetos.selected_map_id`: Final selected map (after completion)

## Veto Formats

Currently supported:
- **standard_7**: Ban-Ban-Pick-Pick-Ban-Ban-Pick (7 maps)
- **standard_5**: Ban-Ban-Pick-Pick-Ban (5 maps)
- **standard_9**: Ban-Ban-Pick-Pick-Ban-Ban-Pick-Pick-Ban (9 maps)

Default: `standard_7`

## Visual Flow

```
Match Created
    ↓
Organizer/Captain clicks "Map Veto"
    ↓
System initializes veto process (if not exists)
    ↓
Veto dialog opens showing available maps
    ↓
Team 1 bans → Team 2 bans → Team 1 picks → Team 2 picks → ...
    ↓
Final map is selected
    ↓
Veto status = 'completed'
    ↓
Selected map appears on match card
```

## Next Steps

1. **Apply the migrations** to your Supabase database:
   - `20251122_map_veto_system.sql`
   - `20251122_seed_default_maps.sql`

2. **Test the flow:**
   - Create a tournament
   - Set up map pool
   - Create a match with two teams
   - Try the veto process

3. **Monitor in database:**
   - Watch `match_map_vetos` table for state changes
   - Watch `match_map_veto_actions` for action logs

