# Esportra — Features Documentation

> **Version 1.0** — Last Updated: March 2026
> Complete documentation of every feature on the Esportra platform.

---

## Table of Contents
1. [Authentication & Accounts](#1-authentication--accounts)
2. [User Profiles & Player Identity](#2-user-profiles--player-identity)
3. [Team Management](#3-team-management)
4. [Tournament System](#4-tournament-system)
5. [Stage & Bracket System](#5-stage--bracket-system)
6. [Match Flow (Captain Match Page)](#6-match-flow-captain-match-page)
7. [Map Veto System](#7-map-veto-system)
8. [Tournament Registration](#8-tournament-registration)
9. [Tournament Staff System](#9-tournament-staff-system)
10. [Organization Management](#10-organization-management)
11. [Dispute System](#11-dispute-system)
12. [Venue System](#12-venue-system)
13. [Verification & Licensing](#13-verification--licensing)
14. [Notification System](#14-notification-system)
15. [Admin System](#15-admin-system)
16. [Sponsor & Advertising](#16-sponsor--advertising)
17. [Analytics & Metrics](#17-analytics--metrics)
18. [Game Data (RAWG Integration)](#18-game-data-rawg-integration)
19. [Messaging System](#19-messaging-system)
20. [Leaderboards & Tournament History](#20-leaderboards--tournament-history)
21. [Real-time Infrastructure](#21-real-time-infrastructure)
22. [Desktop Agent Integration](#22-desktop-agent-integration)
23. [Reviews System](#23-reviews-system)
24. [Public Marketing Pages](#24-public-marketing-pages)
25. [Reference: All Hooks](#25-reference-all-hooks)
26. [Reference: All Edge Functions](#26-reference-all-edge-functions)
27. [Reference: All Database Tables](#27-reference-all-database-tables)
28. [Reference: All SignalR Hubs](#28-reference-all-signalr-hubs)

---

## 1. Authentication & Accounts

**Status**: Complete

Users sign up and sign in via Supabase Auth (email/password). OAuth integrations exist for Faceit and Riot accounts (linked post-registration, not used for primary auth). Password recovery uses branded emails via Resend.

### Pages
| Route | File | Purpose |
|-------|------|---------|
| `/auth/signup` | `src/pages/auth/SignUp.tsx` | User registration |
| `/auth/signin` | `src/pages/auth/SignIn.tsx` | User login |
| `/auth/callback` | `src/pages/auth/Callback.tsx` | OAuth callback handler |
| `/auth/forgot-password` | `src/pages/auth/ForgotPassword.tsx` | Password reset request |
| `/auth/reset-password` | `src/pages/auth/ResetPassword.tsx` | Password reset form |
| `/set-password` | `src/pages/auth/SetPassword.tsx` | Set new password (from email link) |
| `/suspended` | `src/pages/auth/Suspended.tsx` | Suspension notice page |
| `/account/settings` | `src/pages/account/Settings.tsx` | Account settings |

### Hooks
| Hook | Purpose |
|------|---------|
| `useAuthActions` | `signIn`, `signUp`, `signOut` via Supabase Auth |
| `useAuthState` | Session watcher, token refresh |

### Context Providers
| Context | Purpose |
|---------|---------|
| `src/contexts/AuthContext.tsx` | Session state, user object, suspension guard |
| `src/contexts/RoleContext.tsx` | User role: `casual`, `organizer`, `venue_owner`, `admin` |

### Edge Functions
| Function | Purpose |
|----------|---------|
| `send-recovery-email` | Branded password reset email via Resend |
| `set-password` | Server-side OTP verification + password update |

### DB Tables
`profiles`, `user_roles`

### Components
- `src/components/auth/SuspensionGuard.tsx` — redirects suspended users
- `src/components/ProtectedRoute.tsx` — auth + role gating

---

## 2. User Profiles & Player Identity

**Status**: Complete

Every user has a public profile with avatar, bio, country, social links, and game preferences. Profiles support linking external gaming accounts (Riot, Faceit) via OAuth. Player stats (tournaments played, won, earnings) are tracked.

### Pages
| Route | File | Purpose |
|-------|------|---------|
| `/player/:username` | `src/pages/player/Profile.tsx` | Public player profile |
| `/player/teams` | `src/pages/player/Teams.tsx` | Player's teams |
| `/player/history` | `src/pages/player/History.tsx` | Match/tournament history |

### Hooks
| Hook | Purpose |
|------|---------|
| `useProfile` | Fetch user profile via .NET API |
| `useProfileManagement` | Update profile fields (username, avatar, bio, tags, social, country) |
| `useUserStats` | Tournaments played/won, achievements, earnings |
| `useRiotAccount` | Link/unlink Riot (Valorant/LoL) account via OAuth |
| `useFaceitAccount` | Link/unlink Faceit account via PKCE OAuth |
| `useGameLogo` | RAWG API game logo lookup (cached) |
| `useRawgGame` | Full game metadata + screenshots |

### Context
| Context | Purpose |
|---------|---------|
| `src/contexts/UnifiedProfileContext.tsx` | Multi-mode profile (player/organizer/venue_owner) |

### Key Components
- `src/components/player/PlayerProfile.tsx` — full profile page layout
- `src/components/player/PlayerCard.tsx` — compact player card
- `src/components/player/PlayerAchievements.tsx` — achievement badges
- `src/components/player/PlayerTournamentHistory.tsx` — match history list
- `src/components/player/PlayerBookings.tsx` — venue booking history
- `src/components/player/AvatarUploader.tsx` — avatar upload with crop
- `src/components/player/EditProfileDialog.tsx` — profile edit modal
- `src/components/UnifiedDashboard.tsx` — role-adaptive dashboard

### OAuth Callbacks
| Route | File | Purpose |
|-------|------|---------|
| `/functions/v1/faceit-oauth` | `src/pages/auth/FaceitOAuthCallback.tsx` | Faceit OAuth completion |
| `/auth/riot/callback` | `src/pages/auth/RiotOAuthCallback.tsx` | Riot OAuth completion |

### Edge Functions
| Function | Purpose |
|----------|---------|
| `faceit-oauth` | Faceit PKCE token exchange → writes `faceit_accounts` |
| `riot-oauth` | Riot OAuth token exchange → writes `riot_accounts` |

### DB Tables
`profiles`, `faceit_accounts`, `riot_accounts`, `user_statistics`, `achievements`, `user_achievements`

---

## 3. Team Management

**Status**: Complete

Players create teams, invite members, manage rosters, upload logos/banners, and transfer ownership. Teams are required for team-format tournaments.

### Pages
| Route | File | Purpose |
|-------|------|---------|
| `/player/teams` | `src/pages/player/Teams.tsx` | Team management hub |

### Hooks
| Hook | Purpose |
|------|---------|
| `useTeamManagement` | Full CRUD: create, update, delete, invite, remove member, transfer ownership |
| `teams/useTeamMutations` | Logo/banner upload via Supabase Storage + .NET API update |

### Key Components
- `src/components/player/TeamCreationWizard.tsx` — multi-step team creation
- `src/components/player/TeamManager.tsx` — roster management
- `src/components/player/TeamList.tsx` — all teams for current user
- `src/components/player/TeamInviteModal.tsx` — invite players to team
- `src/components/player/TeamInvites.tsx` — pending invite management
- `src/components/player/EditTeamDialog.tsx` — edit team details
- `src/components/player/TeamDeleteModal.tsx` — confirmation for team deletion

### DB Tables
`teams`, `team_members`, `team_invitations`

---

## 4. Tournament System

**Status**: Complete (largest feature set on the platform)

The tournament system covers discovery, creation, management, and analytics. Organizers create tournaments via a 7-step wizard. Players browse, filter, and register.

### 4a. Tournament Browsing & Discovery

**Pages**
| Route | File | Purpose |
|-------|------|---------|
| `/tournaments` | `src/pages/organizer/TournamentList.tsx` | Public tournament listing |
| `/tournaments/upcoming` | `src/pages/tournaments/Upcoming.tsx` | Upcoming tournaments filter |
| `/tournaments/ongoing` | `src/pages/tournaments/Ongoing.tsx` | Ongoing tournaments filter |
| `/tournaments/:slug` | `src/pages/tournaments/Details.tsx` | Tournament detail + registration |
| `/tournament-history` | `src/pages/TournamentHistory.tsx` | Platform-wide tournament history |

**Hooks**
| Hook | Purpose |
|------|---------|
| `useTournaments` | Paginated tournament list with filters (game, format, region, date) |
| `useTournamentRegistrationStatus` | Batch check if current user is registered |

### 4b. Tournament Creation (Wizard)

**Pages**
| Route | File | Purpose |
|-------|------|---------|
| `/tournaments/create` | `src/pages/tournaments/Create.tsx` | 7-step tournament creation wizard |

**Hooks**
| Hook | Purpose |
|------|---------|
| `useTournamentWizard` | 7-step wizard with localStorage draft persistence |
| `useTournamentCreation` | Simple create form (alternate flow) |

**Wizard Steps** (`src/components/tournament/wizard/`)
1. `StepBasicInfo.tsx` — name, game, description
2. `StepBranding.tsx` — banner, colors
3. `StepFormatRules.tsx` — format (single/double elim, swiss, round robin), team size, rules
4. `StepRegistration.tsx` — registration window, max teams, entry fee
5. `StepReview.tsx` — final review before submission

**Validation**: `src/schemas/tournamentSchema.ts` (Zod)

### 4c. Organizer Dashboard

**Pages**
| Route | File | Purpose |
|-------|------|---------|
| `/organizer/tournaments` | `src/pages/organizer/ManageTournaments.tsx` | All organizer's tournaments |
| `/organizer/tournament/:slug` | `src/pages/organizer/TournamentManage.tsx` | Single tournament management |
| `/organizer/tournament/:slug/edit` | `src/pages/tournaments/Edit.tsx` | Edit tournament settings |

**Hooks**
| Hook | Purpose |
|------|---------|
| `useTournamentDashboard` | Consolidated .NET API call: tournament + participants + stages |
| `useOrganizerStats` | Analytics: total/active/upcoming tournaments, prize pool, game distribution |

**Key Components**
- `src/components/organizer/TournamentsList.tsx` — organizer's tournament list
- `src/components/organizer/TournamentAnalytics.tsx` — participation stats, completion rates
- `src/components/organizer/TournamentAnnouncementPanel.tsx` — broadcast announcements
- `src/components/organizer/ParticipantsList.tsx` — registered teams/players
- `src/components/organizer/MapPoolManager.tsx` — configure available maps
- `src/components/organizer/BanManagement.tsx` — tournament bans
- `src/components/organizer/tabs/StageManagementTab.tsx` — manage tournament stages

### DB Tables
`tournaments`, `tournament_participants`, `tournament_stages`, `tournament_bans`

---

## 5. Stage & Bracket System

**Status**: Complete — all 4 formats supported

Brackets are the core competitive structure. The system supports single elimination, double elimination, Swiss, and round robin. Brackets update in real-time via SignalR.

### Supported Formats
| Format | Generator | Key Behavior |
|--------|-----------|-------------|
| **Single Elimination** | `SingleEliminationGenerator.ts` | Standard knockout, losers are out |
| **Double Elimination** | `DoubleEliminationGenerator.ts` | Winners bracket + losers bracket + grand final |
| **Swiss** | `SwissGenerator.ts` | Paired rounds, win/loss tracking, tiebreakers |
| **Round Robin** | `RoundRobinGenerator.ts` | Everyone plays everyone, standings by points |

### Pages
| Route | File | Purpose |
|-------|------|---------|
| `/tournaments/:slug/brackets` | `src/pages/tournaments/Brackets.tsx` | Public bracket view |
| `/tournaments/:slug/brackets/fullscreen` | `src/pages/tournaments/brackets/FullscreenBracketPage.tsx` | Fullscreen bracket for streaming/projection |
| `/organizer/tournament/:slug/manage-bracket/:stageId` | `src/pages/organizer/ManageBracketPage.tsx` | Organizer bracket management |

### Hooks
| Hook | Purpose |
|------|---------|
| `useGraphBracket` | TanStack Query + SignalR `BracketHub` for live bracket data |
| `usePublicBracketData` | Stages + bracket versions for public view |
| `useBracketRealtime` | SignalR `BracketHub` events: `MatchUpdated`, `MatchInserted`, `BracketReset` |
| `useStageRealtime` | SignalR `BracketHub` events: `StageUpdated`, `VersionCreated` |
| `useMatchScheduling` | Stage scheduling config + interval-based auto-scheduling |

### Services (`src/services/bracket/`)
| Service | Purpose |
|---------|---------|
| `BracketGenerator.ts` | Orchestrator — picks correct generator based on format |
| `SingleEliminationGenerator.ts` | Generates single-elim bracket tree |
| `DoubleEliminationGenerator.ts` | Generates double-elim with WB/LB/GF |
| `SwissGenerator.ts` | Generates Swiss pairings per round |
| `RoundRobinGenerator.ts` | Generates full round-robin schedule |
| `MatchRepository.ts` | Persists bracket matches via .NET API |
| `GraphMatchService.ts` | Graph-based match data operations |
| `AdvancementService.ts` | Handles team advancement through bracket |
| `StageCompletionService.ts` | Detects when a stage is complete |
| `StandingsService.ts` | Computes standings for Swiss/RR |
| `BracketAdapter.ts` | Adapts raw data to bracket display format |
| `optimisticBracket.ts` | Optimistic UI updates for bracket mutations |

### Key Components
- `src/components/bracket/GraphBracket.tsx` — main bracket visualization (pan/zoom)
- `src/components/bracket/GraphMatchCard.tsx` — individual match card in bracket
- `src/components/bracket/BracketRenderer.tsx` — renders bracket from version data
- `src/components/bracket/BracketGeneratorUI.tsx` — UI for generating/resetting brackets
- `src/components/bracket/GroupStageView.tsx` — round robin group display
- `src/components/bracket/SwissView.tsx` — Swiss standings + pairings
- `src/components/bracket/StandingsTable.tsx` — standings with tiebreakers
- `src/components/bracket/BracketExporter.tsx` — export bracket as image

### Edge Functions
| Function | Purpose |
|----------|---------|
| `worker-bracket-advancement` | Webhook-triggered: advances winning teams through `brkt_advancements` edges |
| `compute-bracket-ui-cache` | Pre-computes bracket display structure for a version |

### DB Tables
`brkt_matches`, `brkt_versions`, `brkt_advancements`, `tournament_stages`

---

## 6. Match Flow (Captain Match Page)

**Status**: Complete

The captain match page is the central hub during a match. It handles check-in, time proposals, map veto, score reporting, disputes, and chat — all in real-time via SignalR.

### Pages
| Route | File | Purpose |
|-------|------|---------|
| `/tournaments/:slug/captain-match/:matchId?` | `src/pages/tournaments/CaptainMatchPage.tsx` | Full match management page |

### Hooks
| Hook | Purpose |
|------|---------|
| `useMatchCheckin` | Team check-in with 15-minute window, live via SignalR `MatchHub` |
| `useMatchResultReport` | Submit/accept/dispute scores, live via `MatchHub` |
| `useMatchDispute` | File dispute with evidence, live via `MatchHub` |
| `useTimeProposal` | Propose/accept/reject match time, live via `MatchHub` |
| `useMatchChat` | Real-time match chat via SignalR `ChatHub` |
| `useMatchRealtime` | SignalR `MatchHub` event router (dispatches to sub-hooks) |

### Key Components
- `src/components/tournament/MatchCheckinCard.tsx` — check-in UI with countdown
- `src/components/tournament/MatchResultUpload.tsx` — score submission form
- `src/components/tournament/MatchAutoReport.tsx` — Riot match auto-verification
- `src/components/tournament/FaceitMatchReport.tsx` — Faceit match result import
- `src/components/tournament/FullScoreboard.tsx` — detailed match scoreboard
- `src/components/tournament/MatchChat.tsx` — real-time chat panel
- `src/components/tournament/MatchSchedulingPanel.tsx` — schedule/reschedule UI
- `src/components/tournament/TimeProposalCard.tsx` — time negotiation UI
- `src/components/tournament/ManualAdjustmentMenu.tsx` — organizer manual overrides

### Edge Functions
| Function | Purpose |
|----------|---------|
| `process-match-result` | Fetches Riot match data by match ID + PUUID, validates scores |
| `scan-recent-matches` | Scans Riot/Valorant match history for auto-verification |
| `faceit-match-proxy` | Proxies Faceit Data API calls (allowlisted endpoints) |
| `riot-match-proxy` | Proxies Riot Games API calls |

### DB Tables
`match_checkins`, `match_result_reports`, `match_disputes`, `time_proposals`, `match_messages`

---

## 7. Map Veto System

**Status**: Complete

A full map ban/pick system supporting BO1, BO3, and BO5 formats. Each team's captain takes turns banning and picking maps. The veto runs in real-time via SignalR.

### Entry Points
| Route | File | Purpose |
|-------|------|---------|
| `/map-veto/:token` | `src/pages/tournaments/MapVetoToken.tsx` | Captain joins veto via unique token link |
| (embedded in CaptainMatchPage) | — | Veto section within match page |

### Hooks
| Hook | Purpose |
|------|---------|
| `useMapVetoMachine` | Full state machine: ban/pick/pick_side sequences for BO1/BO3/BO5 |
| `useVetoRealtime` | SignalR `VetoHub` events: `VetoAction`, `VetoComplete`, `VetoReset`, `StateSync` |

### Veto Sequences
| Format | Sequence |
|--------|----------|
| **BO1** | Ban → Ban → Ban → Ban → Ban → Ban → Last map played |
| **BO3** | Ban → Ban → Pick → Pick → Ban → Ban → Last map |
| **BO5** | Ban → Ban → Pick → Pick → Pick → Pick → Last map |

### Key Components (`src/components/tournament/`)
- `MapVeto.tsx` — main veto container
- `MapPool.tsx` — available maps grid
- `VetoHeader.tsx` — format and status display
- `VetoTeamDisplay.tsx` — team info panels
- `VetoTurnIndicator.tsx` — whose turn it is
- `VetoSelectedMaps.tsx` — picked/banned map results
- `VetoDialogs.tsx` — confirmation dialogs

### Service
- `src/services/vetoService/vetoService.ts` — sequence logic
- `src/services/vetoService/sequences.ts` — BO1/BO3/BO5 action definitions

### DB Tables
`match_map_veto`, `game_maps`

---

## 8. Tournament Registration

**Status**: Complete

Supports both solo and team registration. Registration windows are configurable by the organizer. Spots are limited with real-time count updates.

### Hooks
| Hook | Purpose |
|------|---------|
| `useTournamentRegistrationStatus` | Batch check registration status for current user |

### Key Components
- `src/components/tournament/TournamentRegistration.tsx` — registration container
- `src/components/tournament/TournamentRegistrationForm.tsx` — form wrapper
- `src/components/tournament/TeamRegistrationForm.tsx` — team-format registration
- `src/components/tournament/SoloRegistrationForm.tsx` — solo-format registration
- `src/components/tournament/SoloTournamentRegistration.tsx` — solo flow
- `src/components/tournament/TeamTournamentRegistration.tsx` — team flow
- `src/components/tournament/RegistrationManagement.tsx` — organizer registration management
- `src/components/tournament/RegistrationTypeSelector.tsx` — solo vs team selector

### DB Tables
`tournament_participants`

---

## 9. Tournament Staff System

**Status**: Complete

Organizers can invite staff members to help manage tournaments with granular permissions.

### Pages
| Route | File | Purpose |
|-------|------|---------|
| `/user/staff-invites` | `src/pages/user/StaffInvites.tsx` | Pending staff invitations |
| `/staff/dashboard` | `src/pages/staff/StaffDashboard.tsx` | Staff member dashboard |

### Hooks
| Hook | Purpose |
|------|---------|
| `useTournamentStaff` | Fetch staff list + permission check |
| `useStaffInvites` | Pending invites for current user |
| `useMyStaffAssignments` | All tournament assignments for current user |

### Staff Permissions
| Permission | Grants |
|-----------|--------|
| `scores:update` | Update match scores |
| `teams:manage` | Manage tournament participants |
| `bracket:edit` | Edit bracket structure |
| `announcements:send` | Broadcast announcements |
| `disputes:assist` | Help resolve disputes |

### Key Components
- `src/components/organizer/TournamentStaffManager.tsx` — invite/manage staff

### Library
- `src/lib/tournamentStaff.ts` — `fetchTournamentStaff`, `inviteTournamentStaff`, `respondToStaffInvite`, `fetchUserStaffAssignments`

### DB Tables
`tournament_staff`

---

## 10. Organization Management

**Status**: Complete

Organizations are the entities behind tournament organizers. They have their own public profiles, staff, and tournament portfolios.

### Pages
| Route | File | Purpose |
|-------|------|---------|
| `/organizer/setup-organization` | `src/pages/organizer/OrganizationWizard.tsx` | Organization setup wizard |
| `/organizer/dashboard` | `src/pages/organizer/Dashboard.tsx` | Organizer home dashboard |
| `/org/:slug` | `src/pages/org/PublicProfile.tsx` | Public organization profile |

### Key Components
- `src/components/organizer/OrganizationStaffManager.tsx` — org staff management
- `src/components/organizer/OrganizerTeamCard.tsx` — org team display
- `src/components/organizer/TournamentSchedule.tsx` — upcoming tournament calendar

### Library
- `src/lib/organizationStaff.ts` — `fetchOrganizationStaff`, `inviteOrganizationStaff`

### DB Tables
`organizations`, `organization_staff`, `organization_members`

---

## 11. Dispute System

**Status**: Complete (fully overhauled)

Three-tier dispute resolution: player files → organizer reviews → admin escalation. Disputes include evidence uploads and match context (teams, scores, bracket position).

### Pages
| Route | File | Purpose |
|-------|------|---------|
| `/user/raise-dispute` | `src/pages/user/RaiseDispute.tsx` | File a new dispute |
| `/user/disputes` | `src/pages/user/MyDisputes.tsx` | Player's dispute history |
| `/organizer/disputes` | `src/pages/organizer/Disputes.tsx` | Organizer dispute management |
| `/admin/disputes` | `src/pages/admin/DisputeCenter.tsx` | Admin dispute center |

### Hooks
| Hook | Purpose |
|------|---------|
| `useMatchDispute` | File, fetch, live-update disputes via .NET API + SignalR `MatchHub` |

### Key Components
- `src/components/player/DisputeSubmission.tsx` — submit with evidence upload
- `src/components/tournament/DisputeCard.tsx` — dispute display card
- `src/components/organizer/DisputeCenter.tsx` — organizer resolution UI

### DB Functions (RPCs)
- `notify_admins_of_dispute` — `SECURITY DEFINER` RPC (migration `20260304000009`)

### Notification Types
`dispute_filed`, `dispute_resolved`, `dispute_rejected`

### DB Tables
`match_disputes`, `tournament_disputes` (legacy)

---

## 12. Venue System

**Status**: Complete

Gaming venues can list their facilities, set availability and pricing, accept bookings, and integrate with the Desktop Agent for real-time station monitoring.

### 12a. Venue Discovery (Public)

**Pages**
| Route | File | Purpose |
|-------|------|---------|
| `/venues` / `/venues/search` | `src/pages/venues/Search.tsx` | Search venues by location |
| `/venues/featured` | `src/pages/venues/Featured.tsx` | Featured venues |
| `/venues/:slug` | `src/pages/venues/VenueDetails.tsx` | Venue detail page + booking |

**Hooks**
| Hook | Purpose |
|------|---------|
| `useVenueSearch` | Search by city/query/geolocation, uses `find_nearby_venues` |
| `useGeolocation` | Browser geolocation API |
| `useVenueLiveStatus` | Real-time seat availability via SignalR `LiveHub` |
| `useVenueImpressions` / `useTrackImpression` | View tracking for analytics |

### 12b. Venue Booking

**Hooks**
| Hook | Purpose |
|------|---------|
| `useVenueBooking` | Atomic booking: check availability + insert + decrement seats in one transaction |

**Key Components**
- `src/components/VenueBooking.tsx` — booking dialog
- `src/components/venue/StationSelector.tsx` — pick a station
- `src/components/venue/TimeSlotSelector.tsx` — pick a time slot
- `src/components/player/PlayerBookings.tsx` — player's booking history

### 12c. Venue Owner Management

**Pages**
| Route | File | Purpose |
|-------|------|---------|
| `/venues/list-venue` | `src/pages/venues/ListVenue.tsx` | List a new venue |
| `/venues/manage` | `src/pages/venues/ManageVenues.tsx` | Manage owned venues |
| `/venue-owner/dashboard` | `src/pages/venue-owner/Dashboard.tsx` | Venue owner dashboard |

**Key Components**
- `src/components/venue-owner/VenuesList.tsx` — all owned venues
- `src/components/venue-owner/VenueAnalytics.tsx` — impression/booking stats
- `src/components/venue-owner/VenueAvailability.tsx` — set available hours
- `src/components/venue-owner/VenueBookings.tsx` — incoming bookings
- `src/components/venue-owner/VenuePayments.tsx` — payment tracking
- `src/components/venue-owner/BookingHistory.tsx` — historical bookings

### DB Tables
`venues` (with `venue_id` VEN-XXXXXX, `status`, `price_per_hour`, `desktop_pairing_token`), `venue_bookings`, `venue_availability`, `venue_impressions`, `venue_live_status`

### DB Triggers
- `set_venue_id` — auto-generates VEN-XXXXXX identifier
- `set_pairing_token` — auto-generates 6-char desktop pairing token

---

## 13. Verification & Licensing

**Status**: Complete

Organizers and venue owners must complete verification before going live. Verified users receive licenses (ESP-VO-XXXXXX for venue owners, ESP-OR-XXXXXX for organizers, ESP-BC-XXXXXX for broadcasters).

### Pages
| Route | File | Purpose |
|-------|------|---------|
| `/verification` | `src/pages/VerificationStatus.tsx` | Verification status + wizard |

### Hooks
| Hook | Purpose |
|------|---------|
| `useLicenses` | Fetch user's licenses |

### Wizard Steps (`src/components/verification/wizard/`)
1. `StepPersonalDetails.tsx` — name, contact
2. `StepBusinessInfo.tsx` — business registration, tax ID
3. `StepDocuments.tsx` — upload verification documents
4. `StepExperience.tsx` — prior event/venue experience

### Key Components
- `src/components/verification/VerificationWizard.tsx` — multi-step wizard container
- `src/components/verification/OrganizerVerificationForm.tsx`
- `src/components/verification/VenueOwnerVerificationForm.tsx`
- `src/components/VerificationRequestForm.tsx`

### DB Tables
`licenses`, `verification_requests`

---

## 14. Notification System

**Status**: Complete

Real-time push notifications via SignalR. Notifications are triggered by match events, team invites, dispute updates, and tournament milestones. Automated email reminders fire 30 minutes before tournament start.

### Pages
| Route | File | Purpose |
|-------|------|---------|
| `/notifications` | `src/pages/notifications/Notifications.tsx` | Full notification page |

### Context
- `src/components/NotificationContext.tsx` — fetches notifications + team invites from .NET API, merges and sorts

### Key Components
- `src/components/notifications/NotificationDropdown.tsx` — navbar bell icon dropdown

### Notification Types
| Type | Trigger |
|------|---------|
| `match_ready` | Both teams assigned to a bracket match |
| `result_reported` | Opponent submitted scores |
| `result_accepted` | Scores confirmed |
| `result_disputed` | Opponent disputed scores |
| `dispute_filed` | New dispute filed |
| `dispute_resolved` | Dispute resolved by admin/organizer |
| `dispute_rejected` | Dispute rejected |
| `veto_your_turn` | Player's turn in map veto |
| `veto_completed` | Map veto finished |
| `match_completed` | Match result finalized |
| `tournament_registered` | Registration confirmed |
| `info` / `success` / `warning` / `error` | Generic notifications |

### Edge Functions
| Function | Purpose |
|----------|---------|
| `automated-reminders` | Cron: sends check-in reminder emails 30 min before tournament start |
| `send-email` | Transactional emails (templates: TOURNAMENT_REGISTRATION, CHECKIN_REMINDER, WELCOME, PARTNER_WELCOME) |

### DB Tables
`notifications`

### DB Trigger
`trg_match_ready_notify` → `notify_match_ready()` — fires when both teams are assigned to a bracket match

---

## 15. Admin System

**Status**: Complete (RBAC with 5 roles + 26 permissions)

Full admin panel with role-based access control. Super admins can manage other admin roles.

### Pages
| Route | File | Purpose |
|-------|------|---------|
| `/admin/dashboard` | `src/pages/admin/Dashboard.tsx` | Platform-wide stats |
| `/admin/tools/user-management` | `src/pages/admin/tools/UserManagement.tsx` | User management |
| `/admin/tools/tournament-management` | `src/pages/admin/tools/TournamentManagement.tsx` | Tournament oversight |
| `/admin/tools/venue-management` | `src/pages/admin/tools/VenueManagement.tsx` | Venue approval/management |
| `/admin/tools/verification-system` | `src/pages/admin/tools/VerificationSystem.tsx` | Verification reviews |
| `/admin/tools/audit-logs` | `src/pages/admin/tools/AuditLogs.tsx` | Admin action audit trail |
| `/admin/tools/analytics` | `src/pages/admin/tools/Analytics.tsx` | Platform analytics |
| `/admin/tools/sponsor-management` | `src/pages/admin/tools/SponsorManagement.tsx` | Sponsor management |
| `/admin/tools/system-settings` | `src/pages/admin/SystemSettings.tsx` | System configuration |
| `/admin/tools/admin-management` | `src/pages/admin/tools/AdminManagement.tsx` | Admin role management (super_admin only) |
| `/admin/tournaments/:id` | `src/pages/admin/TournamentDetails.tsx` | Single tournament detail |
| `/admin/disputes` | `src/pages/admin/DisputeCenter.tsx` | Dispute resolution center |

### Admin Roles
| Role | Description |
|------|-------------|
| `super_admin` | Full access, can manage other admins |
| `ops_admin` | Operations: tournaments, venues, users |
| `finance_admin` | Financial operations, payments, sponsorships |
| `moderator` | Content moderation, disputes, user warnings |
| `support_admin` | User support, basic user management |

### Hooks
| Hook | Purpose |
|------|---------|
| `useAdminPermissions` | RBAC permission check against current user's roles |
| `useAdminUsers` | Paginated user list with search |
| `useUserManagement` | User CRUD: delete, suspend/unsuspend, role changes |

### Context
- `src/contexts/AdminContext.tsx` — loads roles + permissions from .NET API, exposes `hasPermission()`

### Key Components
- `src/components/admin/AdminLayout.tsx` — admin panel shell with sidebar
- `src/components/admin/AdminAnalytics.tsx` — dashboard charts
- `src/components/admin/AuditLogs.tsx` — audit trail viewer
- `src/components/admin/UserManagement.tsx` — user search + actions
- `src/components/admin/TournamentManagement.tsx` — tournament oversight
- `src/components/admin/VenueManagement.tsx` — venue review/approval
- `src/components/admin/VerificationPanel.tsx` — verification request review

### Edge Functions
| Function | Purpose |
|----------|---------|
| `manage-users` | Legacy: admin delete/suspend/role-change (now via .NET API) |

### DB Tables
`admin_roles`, `admin_user_roles`

---

## 16. Sponsor & Advertising

**Status**: Complete

Sponsors are displayed across the platform in configurable placements. Partners can apply through a form. Admins manage active sponsorships.

### Hooks
| Hook | Purpose |
|------|---------|
| `useSponsors` | Fetch active sponsors filtered by placement + date range |
| `useAllSponsors` | Admin view of all sponsors |
| `useSponsorStats` | Impressions/clicks per sponsor |
| `usePartnerApplication` | Submit partner/sponsor application |

### Key Components
- `src/components/SponsorAd.tsx` — single sponsor ad unit
- `src/components/SponsorAds.tsx` — sponsor ad group
- `src/components/SponsorsBanner.tsx` — full-width sponsor banner
- `src/components/StaticAd.tsx` — static advertisement
- `src/components/PartnerApplicationForm.tsx` — partner application form

### Edge Functions
| Function | Purpose |
|----------|---------|
| `invite-sponsor` | Admin triggers sponsor welcome email after approval |

### DB Tables
`sponsors`

---

## 17. Analytics & Metrics

**Status**: Complete

Client-side event tracking and server-side metric recording with GeoIP lookup and privacy-safe visitor identification.

### Hooks
| Hook | Purpose |
|------|---------|
| `useAnalytics` | Client-side event tracking |
| `useOrganizerStats` | Tournament stats for organizer dashboard |
| `useVenueImpressionsData` / `useVenueImpressionTotals` | Venue impression analytics |

### Event Types
`page_view`, `user_action`, `tournament_event`, `team_event`, `venue_event`, `payment_event`, `search`, `error`

### Edge Functions
| Function | Purpose |
|----------|---------|
| `record-metric` | Server-side metric with GeoIP (ip-api.com), age group derivation, privacy-safe `visitor_id` (SHA-256 of IP + daily salt) |

### DB Tables
`venue_impressions`, `analytics_events`

---

## 18. Game Data (RAWG Integration)

**Status**: Complete

Game metadata (banners, logos, screenshots) is sourced from the RAWG API and cached in the database with a 7-day TTL.

### Hooks
| Hook | Purpose |
|------|---------|
| `useRawgGame` | Full game metadata: banner, logo, screenshots |
| `useGameLogo` | Cached game logo lookup |

### Library
- `src/lib/rawgProxy.ts` — RAWG API proxy client

### Edge Functions
| Function | Purpose |
|----------|---------|
| `rawg-proxy` | Authenticated proxy to RAWG API with 7-day `games_metadata` cache |

### DB Tables
`games_metadata`, `game_notification_preferences`

---

## 19. Messaging System

**Status**: Complete (migrated to SignalR)

Direct and group messaging between users. Match-scoped chat is separate from general messaging.

### Hooks
| Hook | Purpose |
|------|---------|
| `useMessaging` | Conversations list, messages, send, read tracking via .NET API + SignalR `ConversationHub` |
| `useMatchChat` | Match-specific chat via SignalR `ChatHub` |

### SignalR Hubs
| Hub | Purpose |
|-----|---------|
| `ChatHub` (`/hubs/chat`) | Match-scoped real-time chat |
| `ConversationHub` (`/hubs/conversations`) | Direct/group messaging |

### DB Tables
`conversations`, `conversation_participants`, `messages`, `match_messages`

---

## 20. Leaderboards & Tournament History

**Status**: Complete

Platform-wide leaderboards by tournaments won, played, and earnings. Individual player history with match-by-match results.

### Pages
| Route | File | Purpose |
|-------|------|---------|
| `/leaderboards` | `src/pages/Leaderboards.tsx` | Platform leaderboards |
| `/tournament-history` | `src/pages/TournamentHistory.tsx` | Platform tournament history |
| `/player/history` | `src/pages/player/History.tsx` | Player match history |

### Hooks
| Hook | Purpose |
|------|---------|
| `useUserStats` | `tournaments_played`, `tournaments_won`, `total_earnings` |

### Key Components
- `src/components/player/CaptainMatchHistory.tsx` — detailed match history view
- `src/components/player/PlayerTournamentHistory.tsx` — tournament result list

---

## 21. Real-time Infrastructure

**Status**: Complete — 7 SignalR hubs

All hubs connect to the .NET API (`VITE_API_URL`) with Supabase JWT authentication.

| Hub Path | Purpose | Key Events |
|----------|---------|------------|
| `/hubs/notifications` | Push notifications | `NotificationReceived` |
| `/hubs/bracket` | Bracket live updates | `MatchUpdated`, `MatchInserted`, `BracketReset`, `StageUpdated`, `VersionCreated` |
| `/hubs/match` | Match flow | `CheckinUpdate`, `ResultReported`, `ResultAccepted`, `DisputeFiled`, `TimeProposed` |
| `/hubs/veto` | Map veto state machine | `VetoAction`, `VetoComplete`, `VetoReset`, `StateSync` |
| `/hubs/chat` | Match-scoped chat | `MessageReceived` |
| `/hubs/conversations` | Direct/group messaging | `MessageReceived`, `ConversationUpdated` |
| `/hubs/live` | Venue live status | `SeatUpdate`, `StatusChange` |

### Context
- `src/contexts/SignalRContext.tsx` — `SignalRProvider` + `useHub(hubPath)` + `useSignalR()`

### Library
- `src/lib/signalrClient.ts` — `buildHubConnection()`, `startWithRetry()`, `HubPaths`

---

## 22. Desktop Agent Integration

**Status**: Complete (Phase 2)

Gaming venue PCs run a Station Agent that reports health metrics and seat status via SignalR. The web platform displays real-time seat availability.

### How It Works
1. Venue owner pairs their venue with the Desktop Suite using a `desktop_pairing_token` (6-char, auto-generated)
2. Station Agents on venue PCs connect to the SignalR hub
3. Agents report station status (available, occupied, offline) and health metrics
4. Web platform displays live seat counts via SignalR `LiveHub`

### Hooks
| Hook | Purpose |
|------|---------|
| `useVenueLiveStatus` | Initial fetch + SignalR `LiveHub` for real-time seat counts |

### DB Tables
`venue_live_status`

---

## 23. Reviews System

**Status**: Present (integrated with profiles)

Users can leave reviews on other users, venues, and tournaments.

### Hooks
| Hook | Purpose |
|------|---------|
| `useReviews` | Fetch/submit reviews (types: `user`, `venue`, `tournament`) |

### DB Tables
`reviews`

---

## 24. Public Marketing Pages

**Status**: Complete

Static/semi-static pages for the public-facing website.

### Pages
| Route | File | Purpose |
|-------|------|---------|
| `/` | `src/pages/Index.tsx` | Landing page |
| `/about` | `src/pages/About.tsx` | About Esportra |
| `/about/contact` | `src/pages/about/Contact.tsx` | Contact form |
| `/about/faq` | `src/pages/about/FAQ.tsx` | FAQ |
| `/contact` | `src/pages/Contact.tsx` | Contact page |
| `/partners` | `src/pages/Partners.tsx` | Partners/sponsors page |
| `/privacy` | `src/pages/Privacy.tsx` | Privacy policy |
| `/terms` | `src/pages/Terms.tsx` | Terms of service |

### Key Components
- `src/components/HeroSection.tsx` — landing hero
- `src/components/FeaturesSection.tsx` — feature showcase
- `src/components/GameFilter.tsx` — game selection filter
- `src/components/Footer.tsx` — site footer
- `src/components/Navbar.tsx` — main navigation bar

---

## 25. Reference: All Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useAdminPermissions` | `src/hooks/useAdminPermissions.ts` | RBAC permission lookup |
| `useAdminUsers` | `src/hooks/useAdminUsers.ts` | Admin user list with search |
| `useAnalytics` | `src/hooks/useAnalytics.ts` | Client-side event tracking |
| `useAuthActions` | `src/hooks/useAuthActions.ts` | Sign in/up/out |
| `useAuthState` | `src/hooks/useAuthState.ts` | Session watcher |
| `useBracketRealtime` | `src/hooks/useBracketRealtime.ts` | SignalR BracketHub events |
| `useEmail` | `src/hooks/useEmail.ts` | Trigger transactional emails |
| `useFaceitAccount` | `src/hooks/useFaceitAccount.ts` | Faceit OAuth link/unlink |
| `useGameLogo` | `src/hooks/useGameLogo.ts` | RAWG game logo cache |
| `useGeolocation` | `src/hooks/useGeolocation.ts` | Browser geolocation |
| `useGraphBracket` | `src/hooks/useGraphBracket.ts` | Bracket data + realtime |
| `useLicenses` | `src/hooks/useLicenses.ts` | User licenses |
| `useMapVetoMachine` | `src/hooks/useMapVetoMachine.ts` | Veto state machine |
| `useMatchChat` | `src/hooks/useMatchChat.ts` | Match chat via ChatHub |
| `useMatchCheckin` | `src/hooks/useMatchCheckin.ts` | Team check-in |
| `useMatchDispute` | `src/hooks/useMatchDispute.ts` | File/track disputes |
| `useMatchRealtime` | `src/hooks/useMatchRealtime.ts` | MatchHub event router |
| `useMatchResultReport` | `src/hooks/useMatchResultReport.ts` | Score submission |
| `useMatchScheduling` | `src/hooks/useMatchScheduling.ts` | Stage scheduling |
| `useMessaging` | `src/hooks/useMessaging.ts` | Full messaging system |
| `useMyStaffAssignments` | `src/hooks/useMyStaffAssignments.ts` | Staff assignments |
| `useOrganizerStats` | `src/hooks/useOrganizerStats.ts` | Organizer analytics |
| `usePartnerApplication` | `src/hooks/usePartnerApplication.ts` | Partner application |
| `useProfile` | `src/hooks/useProfile.ts` | Fetch profile |
| `useProfileManagement` | `src/hooks/useProfileManagement.ts` | Update profile |
| `usePublicBracketData` | `src/hooks/usePublicBracketData.ts` | Public bracket view |
| `useRawgGame` | `src/hooks/useRawgGame.ts` | Game metadata |
| `useReviews` | `src/hooks/useReviews.ts` | Reviews CRUD |
| `useRiotAccount` | `src/hooks/useRiotAccount.ts` | Riot OAuth link/unlink |
| `useSponsors` | `src/hooks/useSponsors.ts` | Active sponsors |
| `useStaffInvites` | `src/hooks/useStaffInvites.ts` | Staff invites |
| `useStageRealtime` | `src/hooks/useStageRealtime.ts` | Stage status events |
| `useTeamManagement` | `src/hooks/useTeamManagement.ts` | Team CRUD + roster |
| `useTeamMutations` | `src/hooks/teams/useTeamMutations.ts` | Team logo/banner upload |
| `useTimeProposal` | `src/hooks/useTimeProposal.ts` | Match time negotiation |
| `useTournamentCreation` | `src/hooks/useTournamentCreation.ts` | Simple tournament create |
| `useTournamentDashboard` | `src/hooks/useTournamentDashboard.ts` | Tournament + participants + stages |
| `useTournamentRegistrationStatus` | `src/hooks/useTournamentRegistrationStatus.ts` | Registration status check |
| `useTournamentStaff` | `src/hooks/useTournamentStaff.ts` | Tournament staff |
| `useTournamentWizard` | `src/hooks/useTournamentWizard.ts` | 7-step wizard |
| `useTournaments` | `src/hooks/useTournaments.ts` | Tournament list |
| `useUserManagement` | `src/hooks/useUserManagement.ts` | Admin user CRUD |
| `useUserStats` | `src/hooks/useUserStats.ts` | Player stats |
| `useVenueBooking` | `src/hooks/useVenueBooking.ts` | Venue booking flow |
| `useVenueImpressions` | `src/hooks/useVenueImpressions.ts` | Venue analytics |
| `useVenueLiveStatus` | `src/hooks/useVenueLiveStatus.ts` | Real-time seat status |
| `useVenueSearch` | `src/hooks/useVenueSearch.ts` | Venue search |
| `useVetoRealtime` | `src/hooks/useVetoRealtime.ts` | VetoHub events |
| `useMobile` | `src/hooks/use-mobile.tsx` | Responsive breakpoint |
| `useToast` | `src/hooks/use-toast.ts` | Toast notifications |

---

## 26. Reference: All Edge Functions

| Function | Purpose | Status |
|----------|---------|--------|
| `automated-reminders` | Cron: check-in reminder emails 30 min before start | Complete |
| `compute-bracket-ui-cache` | Pre-compute bracket display structure | Complete |
| `faceit-match-proxy` | Proxy Faceit Data API (allowlisted endpoints) | Complete |
| `faceit-oauth` | Faceit PKCE OAuth token exchange | Complete |
| `invite-sponsor` | Sponsor welcome email on admin approval | Complete |
| `manage-users` | Legacy admin user operations | Complete (legacy) |
| `process-match-result` | Fetch + validate Riot match data | Complete |
| `rawg-proxy` | RAWG API proxy with 7-day cache | Complete |
| `record-metric` | GeoIP analytics event logging | Complete |
| `riot-match-proxy` | Riot Games API proxy | Complete |
| `riot-oauth` | Riot OAuth token exchange | Complete |
| `scan-recent-matches` | Auto-scan Riot match history | Complete |
| `send-email` | Transactional emails via Resend | Complete |
| `send-recovery-email` | Branded password reset email | Complete |
| `set-password` | Server-side OTP + password update | Complete |
| `worker-bracket-advancement` | Webhook: advance teams through bracket | Complete |

---

## 27. Reference: All Database Tables

### Core
`profiles`, `user_roles`, `tournaments`, `tournament_participants`, `tournament_stages`, `tournament_staff`, `tournament_bans`, `tournament_matches` (legacy), `tournament_disputes` (legacy)

### Bracket System
`brkt_matches`, `brkt_versions`, `brkt_advancements`

### Match Flow
`match_checkins`, `match_result_reports`, `match_disputes`, `time_proposals`, `match_map_veto`, `game_maps`, `match_messages`

### Teams
`teams`, `team_members`, `team_invitations`

### Venues
`venues`, `venue_bookings`, `venue_availability`, `venue_impressions`, `venue_live_status`

### User Integrations
`faceit_accounts`, `riot_accounts`

### Admin
`admin_roles`, `admin_user_roles`

### Licensing
`licenses`, `verification_requests`

### Organizations
`organizations`, `organization_staff`, `organization_members`

### Messaging
`conversations`, `conversation_participants`, `messages`

### Other
`notifications`, `sponsors`, `reviews`, `analytics_events`, `user_statistics`, `achievements`, `user_achievements`, `games_metadata`, `game_notification_preferences`

---

## 28. Reference: All SignalR Hubs

| Hub Path | Purpose | Key Events |
|----------|---------|------------|
| `/hubs/notifications` | Push notifications | `NotificationReceived` |
| `/hubs/bracket` | Bracket updates | `MatchUpdated`, `MatchInserted`, `BracketReset`, `StageUpdated`, `VersionCreated` |
| `/hubs/match` | Match flow | `CheckinUpdate`, `ResultReported`, `ResultAccepted`, `DisputeFiled`, `TimeProposed` |
| `/hubs/veto` | Map veto | `VetoAction`, `VetoComplete`, `VetoReset`, `StateSync` |
| `/hubs/chat` | Match chat | `MessageReceived` |
| `/hubs/conversations` | Direct messaging | `MessageReceived`, `ConversationUpdated` |
| `/hubs/live` | Venue live status | `SeatUpdate`, `StatusChange` |

---

*This document was generated from a full codebase analysis. Keep it updated as features are added or modified.*
