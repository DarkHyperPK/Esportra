# Organization/Roster Model

## Overview

The platform uses a two-tier structure:
- **Teams** = Organizations (e.g., "SCYTES", "Made In Pakistan")
- **Rosters** = Game-specific teams within an organization (e.g., "SCYTES Valorant", "SCYTES Fortnite")

## Database Structure

### `teams` Table (Organizations)
- Represents one organization
- Can have multiple rosters (one per game)
- Example: Organization "SCYTES" can have rosters for Valorant, Fortnite, and COD

### `team_rosters` Table (Game-Specific Teams)
- One roster per game per organization (enforced by unique constraint on `team_id, game`)
- Each roster represents the organization in tournaments for that specific game
- Fields:
  - `team_id`: References the organization
  - `name`: Roster name (e.g., "SCYTES Valorant")
  - `game`: The game this roster is for (e.g., "Valorant")
  - `format`: Format (e.g., "5v5", "solo", "duo", "trio")
  - `team_size`: Number of players required

### `team_roster_members` Table
- Members of a specific roster
- Each user can be in multiple rosters (different games)
- Fields:
  - `roster_id`: References the roster
  - `user_id`: References the player
  - `role`: Optional role within the roster
  - `is_active`: Whether the member is currently active

### `tournament_participants` Table
- When registering for a tournament, you register a **roster** (not the organization directly)
- Fields:
  - `roster_id`: **Primary** - The roster competing in the tournament
  - `team_id`: **Secondary** - The organization that owns the roster (for reference)
  - `roster_name`: Display name of the roster
  - `team_name`: Display name of the organization (for backwards compatibility)

## Registration Flow

1. User creates an **organization** (team) with basic info
2. User creates **rosters** for specific games (max 3 rosters, each for a different game)
3. User invites members to specific rosters
4. When registering for a tournament:
   - Select the organization
   - Select the roster for that tournament's game
   - The roster (not the organization) is registered in `tournament_participants`

## Constraints

- **One roster per game per organization**: Enforced by unique index on `team_rosters(team_id, game)`
- **Roster name validation**: Trigger ensures `roster_name` matches the actual roster name when `roster_id` is set
- **Member limits**: Enforced by trigger (e.g., 7 members max for 5v5 rosters)

## Example

**Organization**: "SCYTES"
- Roster 1: "SCYTES Valorant" (game: Valorant, format: 5v5, 7 members)
- Roster 2: "SCYTES Fortnite" (game: Fortnite, format: duo, 2 members)
- Roster 3: "SCYTES COD" (game: Call of Duty, format: 5v5, 7 members)

When registering for a Valorant tournament:
- Organization: SCYTES
- Roster: SCYTES Valorant
- `tournament_participants.roster_id` = SCYTES Valorant roster ID
- `tournament_participants.team_id` = SCYTES organization ID

