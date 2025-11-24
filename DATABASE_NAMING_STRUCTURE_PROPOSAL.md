# Database Naming Structure Proposal

## Current Structure Analysis

### Generic Tournament Tables (Used by ALL games)
These tables are game-agnostic and work for any game:
- `tournaments` - Generic tournament info
- `tournament_participants` - Generic registrations
- `tournament_matches` - Generic bracket matches
- `tournament_match_results` - Generic result submissions
- `tournament_bans` - Generic ban management

### Game-Specific Tables (Currently Valorant-only)
These tables are specific to games that use map veto systems:
- `game_maps` - Maps for all games (has `game` column)
- `tournament_map_pools` - Tournament map selection
- `match_map_vetos` - Match veto process state
- `match_map_veto_actions` - Veto action audit log

## Proposed Naming Structure

### Option 1: Game Prefix (Recommended)
**Pattern**: `{game}_{feature}_*`

**Generic Tables** (keep as-is):
- `tournaments`
- `tournament_participants`
- `tournament_matches`
- `tournament_match_results`
- `tournament_bans`

**Game-Specific Tables** (rename with game prefix):
- `game_maps` → Keep (already has `game` column, shared across games)
- `tournament_map_pools` → `valorant_tournament_map_pools`
- `match_map_vetos` → `valorant_match_map_vetos`
- `match_map_veto_actions` → `valorant_match_map_veto_actions`

**Future Games**:
- `cs2_tournament_map_pools`
- `cs2_match_map_vetos`
- `cs2_match_map_veto_actions`

**Pros:**
- ✅ Clear game identification in table name
- ✅ No interference between games
- ✅ Easy to query game-specific tables
- ✅ Scalable for new games

**Cons:**
- ❌ Requires code changes to use game-specific table names
- ❌ More tables as games are added

### Option 2: Game Column + Better Naming
**Pattern**: Keep current structure but add `game` column and improve naming

**Generic Tables** (keep as-is):
- `tournaments`
- `tournament_participants`
- `tournament_matches`
- `tournament_match_results`
- `tournament_bans`

**Game-Specific Tables** (add `game` column, better naming):
- `game_maps` → Keep (already has `game`)
- `tournament_map_pools` → Keep (add `game` column, filter by game)
- `match_map_vetos` → Keep (add `game` column, filter by game)
- `match_map_veto_actions` → Keep (add `game` column, filter by game)

**Pros:**
- ✅ Single table per feature (simpler)
- ✅ Less code changes
- ✅ Can query all games or filter by game

**Cons:**
- ❌ All game data in same table (potential performance issues)
- ❌ Harder to manage game-specific features
- ❌ Risk of data mixing if `game` column not properly filtered

### Option 3: Schema-Based Separation
**Pattern**: Use PostgreSQL schemas per game

**Structure**:
```
public.tournaments (generic)
public.tournament_participants (generic)
public.tournament_matches (generic)

valorant.tournament_map_pools
valorant.match_map_vetos
valorant.match_map_veto_actions

cs2.tournament_map_pools
cs2.match_map_vetos
cs2.match_map_veto_actions
```

**Pros:**
- ✅ Clean separation
- ✅ Easy to manage permissions per game
- ✅ Can drop entire schema for a game

**Cons:**
- ❌ More complex setup
- ❌ Requires schema management
- ❌ Code needs to specify schema

## Recommended Approach: Option 1 (Game Prefix)

### Migration Plan

1. **Keep Generic Tables** (no changes):
   - `tournaments`
   - `tournament_participants`
   - `tournament_matches`
   - `tournament_match_results`
   - `tournament_bans`

2. **Rename Game-Specific Tables**:
   ```sql
   -- Rename existing Valorant tables
   ALTER TABLE tournament_map_pools RENAME TO valorant_tournament_map_pools;
   ALTER TABLE match_map_vetos RENAME TO valorant_match_map_vetos;
   ALTER TABLE match_map_veto_actions RENAME TO valorant_match_map_veto_actions;
   ```

3. **Update Code**:
   - Create helper function to get table name based on game
   - Update all queries to use game-specific table names
   - Example: `getMapVetoTable(game)` → returns `valorant_match_map_vetos` for Valorant

### Table Naming Convention

**Generic Tables** (no prefix):
- `tournaments`
- `tournament_participants`
- `tournament_matches`
- `tournament_match_results`
- `tournament_bans`

**Game-Specific Tables** (game prefix):
- `{game}_tournament_map_pools` (e.g., `valorant_tournament_map_pools`)
- `{game}_match_map_vetos` (e.g., `valorant_match_map_vetos`)
- `{game}_match_map_veto_actions` (e.g., `valorant_match_map_veto_actions`)

**Shared Tables** (game column):
- `game_maps` (has `game` column, shared across all games)

## Benefits of This Structure

1. **Clear Separation**: Easy to identify which tables belong to which game
2. **No Interference**: Games don't affect each other's data
3. **Scalable**: Easy to add new games (just create new tables)
4. **Maintainable**: Clear naming makes database exploration easier
5. **Performance**: Game-specific tables are smaller and faster

## Example Structure for Multiple Games

```
Generic:
├── tournaments
├── tournament_participants
├── tournament_matches
├── tournament_match_results
└── tournament_bans

Valorant:
├── valorant_tournament_map_pools
├── valorant_match_map_vetos
└── valorant_match_map_veto_actions

CS2 (future):
├── cs2_tournament_map_pools
├── cs2_match_map_vetos
└── cs2_match_map_veto_actions

Shared:
└── game_maps (game column)
```

## Implementation Helper

Create a utility function to get table names:
```typescript
function getGameTable(game: string, tableType: 'map_pools' | 'vetos' | 'veto_actions'): string {
  const gamePrefix = game.toLowerCase().replace(/\s+/g, '_');
  const tables = {
    map_pools: `${gamePrefix}_tournament_map_pools`,
    vetos: `${gamePrefix}_match_map_vetos`,
    veto_actions: `${gamePrefix}_match_map_veto_actions`
  };
  return tables[tableType];
}
```

