# Final Table Renaming Plan - Game-Specific vs Universal

## Analysis: Which Tables Are Game-Specific?

### ✅ **UNIVERSAL TABLES** (Keep as-is, no renaming)
These tables work for ALL games and should NOT be renamed:

1. **profiles** - User profiles (not game-specific)
2. **teams** - Teams can play multiple games (has `game` column for filtering)
3. **team_members** - Team membership (not game-specific)
4. **team_rosters** - Has `game` column, can filter by game
5. **team_roster_members** - Roster membership (not game-specific)
6. **tournaments** - Universal tournament info (has `game` column)
7. **tournament_participants** - Universal registrations (linked via `tournament_id` → `tournaments.game`)
8. **tournament_matches** - **UNIVERSAL** bracket structure
   - Works for all games (single/double elimination, round robin, etc.)
   - Just tracks "Team A vs Team B" matches
   - No game-specific columns
   - Same bracket logic for Valorant, CS2, Fortnite, etc.
9. **tournament_match_results** - **UNIVERSAL** result submissions
   - Just screenshots and comments
   - Can filter by `tournament_id` (which links to `tournaments.game`)
   - No game-specific data needed
10. **tournament_bans** - Universal ban management

### 🎮 **GAME-SPECIFIC TABLES** (Only rename these 3)
These tables are ONLY for games that use map veto systems (Valorant, CS2):

1. **tournament_map_pools** → `valorant_tournament_map_pools`
   - Only games with map veto need this
   - Fortnite, PUBG, Apex don't use map pools

2. **match_map_vetos** → `valorant_match_map_vetos`
   - Only games with map veto need this
   - Fortnite, PUBG, Apex don't use map veto

3. **match_map_veto_actions** → `valorant_match_map_veto_actions`
   - Only games with map veto need this

### 📊 **SHARED TABLE** (Keep as-is)
- **game_maps** - Already has `game` column, shared across all games

## Why `tournament_matches` is Universal

**tournament_matches** structure:
- `tournament_id` - Links to tournament
- `round` - Round number (1, 2, 3, etc.)
- `match_number` - Match number in round
- `team1_id`, `team2_id` - Teams playing
- `winner_team_id` - Winner
- `status` - Match status
- `scores` - Match scores

**This is game-agnostic!**
- Bracket structure works the same for all games
- Single elimination = same for Valorant, CS2, Fortnite
- Double elimination = same for all games
- Just tracks "Team A vs Team B" regardless of game

**Example:**
- Valorant tournament: Round 1, Match 1 = Team Alpha vs Team Beta
- CS2 tournament: Round 1, Match 1 = Team X vs Team Y
- Same structure, different games

## Why `tournament_match_results` is Universal

**tournament_match_results** structure:
- `tournament_id` - Links to tournament (which has `game` column)
- `match_id` - Links to match
- `team_id` - Reporting team
- `image_url` - Screenshot
- `comment` - Notes

**This is game-agnostic!**
- Just result submissions (screenshots + comments)
- Can filter by `tournament_id` to get game
- No game-specific columns needed

## Final Renaming Plan

### Tables to RENAME (3 tables):
```sql
-- Only rename map veto system tables
ALTER TABLE tournament_map_pools RENAME TO valorant_tournament_map_pools;
ALTER TABLE match_map_vetos RENAME TO valorant_match_map_vetos;
ALTER TABLE match_map_veto_actions RENAME TO valorant_match_map_veto_actions;
```

### Tables to KEEP (11 tables):
- `profiles`
- `teams`
- `team_members`
- `team_rosters`
- `team_roster_members`
- `tournaments`
- `tournament_participants`
- `tournament_matches` ✅ Universal
- `tournament_match_results` ✅ Universal (filter by tournament_id)
- `tournament_bans`
- `game_maps` (shared, has game column)

## Summary

**Only 3 tables need renaming** - the map veto system tables:
1. `tournament_map_pools` → `valorant_tournament_map_pools`
2. `match_map_vetos` → `valorant_match_map_vetos`
3. `match_map_veto_actions` → `valorant_match_map_veto_actions`

**All other tables are universal** and work for all games through:
- `game` column filtering (teams, game_maps)
- `tournament_id` linking (participants, matches, results link to tournaments.game)

