# Valorant Tournament System - Database Tables Analysis

This document lists all database tables used by the Valorant tournament system and explains their purpose.

## Core Tournament Tables

### 1. **tournaments**
- **Purpose**: Main tournament information and configuration
- **Usage in Valorant**:
  - Stores tournament details (name, game="Valorant", format, dates, prize pool)
  - Tracks tournament status (draft, open, ongoing, completed)
  - Links to organizer and venue
- **Key Fields**: `id`, `game`, `format`, `max_teams`, `status`, `organizer_id`
- **Used In**: Tournament creation, listing, details, bracket generation

### 2. **tournament_participants**
- **Purpose**: Tracks teams/players registered for tournaments
- **Usage in Valorant**:
  - Stores team registrations for Valorant tournaments
  - Links teams to tournaments
  - Tracks registration status (pending, approved, checked_in)
  - Stores roster information for team-based tournaments
- **Key Fields**: `tournament_id`, `team_id`, `participant_type`, `status`, `roster_name`
- **Used In**: Registration, bracket generation, participant lists

### 3. **tournament_matches**
- **Purpose**: Stores bracket match information
- **Usage in Valorant**:
  - Each match in the bracket (Round 1, Round 2, Finals, etc.)
  - Tracks which teams are playing (`team1_id`, `team2_id`)
  - Match status (pending, in_progress, completed)
  - Winner tracking (`winner_team_id`)
  - Round and slot information for bracket structure
- **Key Fields**: `id`, `tournament_id`, `team1_id`, `team2_id`, `status`, `round`, `slot`, `winner_team_id`
- **Used In**: Bracket generation, match management, bracket visualization

## Map Veto System Tables (Valorant-Specific)

### 4. **game_maps**
- **Purpose**: Stores all available maps for each game
- **Usage in Valorant**:
  - Stores Valorant maps (Haven, Bind, Split, Ascent, etc.)
  - Map images and metadata
  - Active/inactive status
- **Key Fields**: `id`, `game`, `map_name`, `map_image_url`, `is_active`
- **Used In**: Map pool selection, map veto process

### 5. **tournament_map_pools**
- **Purpose**: Organizer-selected maps available for their tournament
- **Usage in Valorant**:
  - Organizer selects which Valorant maps are available for their tournament
  - Links tournaments to specific maps from `game_maps`
- **Key Fields**: `tournament_id`, `map_id`
- **Used In**: Map pool management, map veto initialization

### 6. **match_map_vetos**
- **Purpose**: Tracks the map veto process state for each match
- **Usage in Valorant**:
  - Stores veto process state (pending, in_progress, completed)
  - Current team's turn (`current_team_id`)
  - Current action (ban/pick) and action number
  - Banned maps for each team (`team1_banned_maps`, `team2_banned_maps`)
  - Final selected map (`selected_map_id`)
  - Best-of format (BO1, BO3, BO5)
  - Selected map pool for the match
- **Key Fields**: `id`, `match_id`, `team1_id`, `team2_id`, `status`, `current_team_id`, `current_action`, `best_of`, `selected_map_pool`
- **Used In**: Map veto UI, veto process flow, map selection

### 7. **match_map_veto_actions**
- **Purpose**: Log of all veto actions taken during the process
- **Usage in Valorant**:
  - Records each ban/pick action
  - Tracks which team performed the action
  - Records side selection (attack/defense) for picked maps
  - Action sequence number
- **Key Fields**: `id`, `veto_id`, `match_id`, `team_id`, `action_type`, `map_id`, `side`, `action_number`
- **Used In**: Veto history, action replay, audit trail

## Match Results Tables

### 8. **tournament_match_results**
- **Purpose**: Stores match result submissions from team captains
- **Usage in Valorant**:
  - Team captains upload result screenshots (up to 5 images)
  - Optional comments/notes
  - Status tracking (pending, accepted, rejected)
  - Links to match and reporting team
- **Key Fields**: `id`, `tournament_id`, `match_id`, `team_id`, `reporter_user_id`, `image_url`, `comment`, `status`
- **Used In**: Result submission, result display, dispute resolution

## Team System Tables

### 9. **teams**
- **Purpose**: Team information and metadata
- **Usage in Valorant**:
  - Team details (name, logo, game)
  - Team ownership and creation
  - Links to team members and rosters
- **Key Fields**: `id`, `name`, `logo_url`, `game`, `created_by`, `owner_id`
- **Used In**: Team registration, bracket display, team lookups

### 10. **team_members**
- **Purpose**: Team membership and roles
- **Usage in Valorant**:
  - Links users to teams
  - Team roles (owner, captain, member)
  - Active membership status
- **Key Fields**: `id`, `team_id`, `user_id`, `role`, `is_active`
- **Used In**: Permission checking (captain can submit results), team management

### 11. **team_rosters**
- **Purpose**: Game-specific team rosters
- **Usage in Valorant**:
  - Valorant-specific roster (5v5 format)
  - Links teams to specific games
  - Roster size and format
- **Key Fields**: `id`, `team_id`, `name`, `game`, `format`, `team_size`
- **Used In**: Team registration, roster validation

### 12. **team_roster_members**
- **Purpose**: Members in specific rosters
- **Usage in Valorant**:
  - Links users to Valorant rosters
  - Validates roster size (5 players + 2 subs for 5v5)
- **Key Fields**: `id`, `roster_id`, `user_id`
- **Used In**: Roster validation, member management

## User & Profile Tables

### 13. **profiles**
- **Purpose**: User profile information
- **Usage in Valorant**:
  - User roles (player, organizer, admin)
  - Permission checking
  - User identification
- **Key Fields**: `id`, `username`, `role`, `is_admin`
- **Used In**: Authentication, permission checks, user display

## Tournament Management Tables

### 14. **tournament_bans**
- **Purpose**: Tracks users banned from specific tournaments
- **Usage in Valorant**:
  - Organizers can ban users from their tournaments
  - Prevents banned users from registering
- **Key Fields**: `id`, `tournament_id`, `user_id`, `ban_reason`, `banned_at`
- **Used In**: Registration validation, ban management

## Storage Buckets (Supabase Storage)

### 15. **tournament-results** (Storage Bucket)
- **Purpose**: Stores match result screenshot images
- **Usage in Valorant**:
  - Team captains upload result screenshots
  - Up to 5 images per match result
- **Used In**: Match result submission

## Table Relationships Flow

```
tournaments
  ├── tournament_participants (teams registered)
  │     └── teams
  │           ├── team_members
  │           └── team_rosters
  │                 └── team_roster_members
  │
  ├── tournament_map_pools (selected maps)
  │     └── game_maps
  │
  └── tournament_matches (bracket matches)
        ├── match_map_vetos (veto process)
        │     ├── match_map_veto_actions (action log)
        │     └── game_maps (maps being vetoed)
        │
        └── tournament_match_results (result submissions)
              └── teams (reporting team)
```

## Summary

**Total Tables Used**: 14 database tables + 1 storage bucket

**Core Tables**: tournaments, tournament_participants, tournament_matches
**Map Veto Tables**: game_maps, tournament_map_pools, match_map_vetos, match_map_veto_actions
**Results Tables**: tournament_match_results
**Team Tables**: teams, team_members, team_rosters, team_roster_members
**User Tables**: profiles
**Management Tables**: tournament_bans
**Storage**: tournament-results bucket

All these tables work together to provide the complete Valorant tournament experience including registration, bracket generation, map veto process, match results, and team management.

