# Esportra A-Z Architecture Migration Report
## .NET 9 + Redis — Complete Web App Migration

---

## 1. Executive Summary

This is the **exhaustive, A-to-Z** migration plan for every feature in the Esportra web app. Every hook, context, lib file, Edge Function, storage bucket, email template, notification type, and page is accounted for.

**Target:** .NET 9 Web API + Redis + SignalR — Supabase minimised to auth + PostgreSQL + storage.

> [!IMPORTANT]
> **Nothing is left behind.** This document covers 15 feature domains, 47 hooks, 19 Edge Functions, 5 contexts, 13 lib files, 94 pages, and 265 components.

---

## 2. Why .NET 9

| Version | Status (Mar 2026) | Verdict |
|---|---|---|
| **.NET 8** | LTS — stable but 2+ years old | Skip |
| **.NET 9** | **Latest stable** (Nov 2024) | ✅ Use — `HybridCache`, faster SignalR, native AOT, built-in OpenAPI |
| **.NET 10** | Preview — ships Nov 2026 | Upgrade when LTS drops |

---

## 3. Complete Feature Inventory & Migration Map

### Domain 1: Authentication & Authorization

**Current:** Supabase Auth (Google, Discord OAuth) + `AuthContext` + `RoleContext` + `AdminContext`

| Source File | Size | What It Does | .NET Migration |
|---|---|---|---|
| `contexts/AuthContext.tsx` | 9KB | Session, profile fetch, Supabase Realtime for profile changes | **Keep Supabase Auth.** .NET validates JWTs. Profile listener → `NotificationHub` |
| `contexts/RoleContext.tsx` | 12KB | Multi-role switching (casual/organizer/venue_owner), verified_roles gating | `RoleEnrichmentMiddleware` — roles cached in Redis, enforced via `[Authorize]` policies |
| `contexts/AdminContext.tsx` | 5KB | Admin role resolution, permission lookup, 10s polling | `GET /api/admin/me` — cached in Redis `user-ctx:{userId}`, invalidated on role change |
| `hooks/useAdminPermissions.ts` | 9KB | 26 permissions in `resource:action` format, 5 admin roles | Server-side `PermissionRequirement` handler |
| `hooks/useAuthState.ts` | 2KB | Supabase `onAuthStateChange` | **Keep client-side** — still uses Supabase Auth |
| `hooks/useAuthActions.ts` | 5KB | signIn, signUp, signOut, OAuth | **Keep client-side** — still uses Supabase Auth |
| `pages/auth/SignIn.tsx` | 11KB | Login form | **Keep** — calls Supabase Auth directly |
| `pages/auth/SignUp.tsx` | 18KB | Registration form | **Keep** — calls Supabase Auth, then `POST /api/profiles` for profile setup |
| `pages/auth/ForgotPassword.tsx` | 8KB | Password recovery | **Keep** — Supabase Auth |
| `pages/auth/ResetPassword.tsx` | 12KB | Password reset | **Keep** — Supabase Auth |
| `pages/auth/SetPassword.tsx` | 4KB | Initial password set | **Keep** — Supabase Auth |
| `pages/auth/Callback.tsx` | 3KB | OAuth callback | **Keep** — Supabase Auth |
| `pages/auth/FaceitOAuthCallback.tsx` | 1KB | FACEIT OAuth callback | → `GET /api/integrations/faceit/callback` |
| `pages/auth/Suspended.tsx` | 5KB | Suspension page | **Keep** — read-only |

**RBAC Model (4 Layers):**

| Layer | Tables | .NET Enforcement |
|---|---|---|
| Platform Roles | `user_roles`, `verified_roles` | `[Authorize(Policy = "Organizer")]` |
| Admin Roles | `admin_roles`, `admin_user_roles`, `profiles.admin_roles` | `PermissionRequirement("resource:action")` — 26 permissions |
| Team Roles | `team_members` | Resource-based: `svc.IsTeamCaptain(userId, matchId)` |
| Org Staff | `organization_staff`, `staff_tournament_assignments` | Resource-based: `svc.HasOrgPermission(userId, orgId, perm)` |
| Tournament Staff | `tournament_staff` | Resource-based: `svc.HasTournamentPermission(userId, tournId, perm)` |

---

### Domain 2: Profiles & Connected Accounts

| Source File | Size | What It Does | .NET Endpoint |
|---|---|---|---|
| `hooks/useProfile.ts` | 2KB | Fetch profile by user ID | `GET /api/profiles/{id}` |
| `hooks/useProfileManagement.ts` | 4KB | Update profile, avatar, bio, country | `PUT /api/profiles/{id}` |
| `contexts/UnifiedProfileContext.tsx` | 13KB | Aggregated profile data (stats, roles, connected accts) | `GET /api/profiles/{id}/full` (cached 60s) |
| `hooks/useRiotAccount.ts` | 4KB | Link/unlink Riot account, fetch PUUID | `POST/DELETE /api/profiles/me/riot` |
| `hooks/useFaceitAccount.ts` | 5KB | Link/unlink FACEIT account | `POST/DELETE /api/profiles/me/faceit` |
| `hooks/useUserStats.ts` | 9KB | Win rate, match history, achievements | `GET /api/profiles/{id}/stats` (cached 60s) |
| `pages/player/Profile.tsx` | 10KB | Profile view page | **Keep** — calls API |
| `pages/player/History.tsx` | 8KB | Match history | **Keep** — calls `GET /api/profiles/{id}/history` |
| `pages/account/*` | 1 page | Account settings | **Keep** — calls API |
| `services/api.ts` (profileApi) | 1KB | CRUD wrapper | **Replace with** `apiClient.ts` → .NET |

---

### Domain 3: Teams & Roster Management

| Source File | Size | What It Does | .NET Endpoint |
|---|---|---|---|
| `hooks/useTeamManagement.ts` | **38KB** | Create team, invite players, accept/decline invites, kick members, transfer captaincy, update logo/info | **Full controller:** `POST/PUT/DELETE /api/teams/*` |
| `pages/player/Teams.tsx` | **149KB** | Team list, roster view, invite modal, member management | **Keep UI** — calls API |
| `hooks/teams/` | 1 file | Team hooks | Merge into team endpoints |

**Team Endpoints:**

```
POST   /api/teams                          # Create team
GET    /api/teams/{id}                     # Get team info
PUT    /api/teams/{id}                     # Update team (name, logo, description)
DELETE /api/teams/{id}                     # Disband team
GET    /api/teams/{id}/members             # List roster
POST   /api/teams/{id}/invite              # Invite player (by email/username)
POST   /api/teams/{id}/invite/{id}/accept  # Accept invite
POST   /api/teams/{id}/invite/{id}/decline # Decline invite
DELETE /api/teams/{id}/members/{userId}    # Kick member
POST   /api/teams/{id}/transfer-captain    # Transfer captaincy
PUT    /api/teams/{id}/logo                # Upload team logo (via Storage, signed URL from .NET)
```

---

### Domain 4: Tournaments

| Source File | Size | What It Does | .NET Endpoint |
|---|---|---|---|
| `hooks/useTournamentCreation.ts` | 8KB | Create tournament with settings | `POST /api/tournaments` |
| `hooks/useTournamentWizard.ts` | 19KB | Multi-step tournament setup wizard | `POST /api/tournaments/{id}/setup` |
| `hooks/useTournaments.ts` | 4KB | List/filter tournaments | `GET /api/tournaments` (cached 30s) |
| `hooks/useTournamentDashboard.ts` | 13KB | Organizer dashboard stats | `GET /api/tournaments/{id}/dashboard` |
| `hooks/useTournamentRegistrationStatus.ts` | 2KB | Registration status check | `GET /api/tournaments/{id}/registration-status` |
| `services/api.ts` (tournamentApi) | 4KB | CRUD for tournaments | Replace with API |
| `services/api.ts` (registrationApi) | 2KB | Registration CRUD | `POST/DELETE /api/tournaments/{id}/register` |
| `pages/tournaments/Create.tsx` | 6KB | Create page | **Keep UI** |
| `pages/tournaments/Details.tsx` | **54KB** | Tournament detail page | **Keep UI** |
| `pages/tournaments/List.tsx` | 9KB | Public listing | **Keep UI** |
| `pages/tournaments/CaptainMatchPage.tsx` | **66KB** | Match flow (veto, checkin, report) | **Keep UI** — calls API |
| `pages/tournaments/Brackets.tsx` | 8KB | Bracket viewer | **Keep UI** |
| `pages/organizer/TournamentManage.tsx` | **91KB** | Full tournament management | **Keep UI** |
| `pages/organizer/ManageBracketPage.tsx` | 25KB | Bracket generation/management | **Keep UI** |

---

### Domain 5: Bracket Engine

| Source File | Size | What It Does | .NET Service |
|---|---|---|---|
| `services/bracket/BracketGenerator.ts` | 4KB | Generates bracket structure | `Esportra.Core/Bracket/BracketGenerator.cs` |
| `services/bracket/SingleEliminationGenerator.ts` | 7KB | Single elim bracket | `SingleEliminationGenerator.cs` |
| `services/bracket/DoubleEliminationGenerator.ts` | 11KB | Double elim bracket | `DoubleEliminationGenerator.cs` |
| `services/bracket/RoundRobinGenerator.ts` | 7KB | Round robin format | `RoundRobinGenerator.cs` |
| `services/bracket/SwissGenerator.ts` | 17KB | Swiss system | `SwissGenerator.cs` |
| `services/bracket/AdvancementService.ts` | 10KB | Match advancement logic | `AdvancementService.cs` |
| `services/bracket/GraphMatchService.ts` | **20KB** | Graph-based match management | `GraphMatchService.cs` |
| `services/bracket/MatchRepository.ts` | 7KB | Match data fetching | `MatchRepository.cs` |
| `services/bracket/BracketAdapter.ts` | 5KB | Graph→UI adapter | `BracketAdapter.cs` |
| `services/bracket/StageCompletionService.ts` | **17KB** | Stage finalization | `StageCompletionService.cs` |
| `services/bracket/StandingsService.ts` | 6KB | Leaderboard calculations | `StandingsService.cs` + Redis sorted sets |
| `services/bracket/optimisticBracket.ts` | 6KB | Optimistic UI updates | **Keep client-side** (UI only) |
| `hooks/useBracketRealtime.ts` | 6KB | Supabase Realtime → bracket cache | → `BracketHub` (SignalR) |
| `hooks/useStageRealtime.ts` | 6KB | Supabase Realtime → stage updates | → `BracketHub` (SignalR) |
| `hooks/useGraphBracket.ts` | 1KB | Query hook | `GET /api/brackets/{versionId}` |
| `hooks/usePublicBracketData.ts` | 3KB | Public bracket data | `GET /api/brackets/{versionId}/public` (cached 10s) |

---

### Domain 6: Match System

| Source File | Size | What It Does | .NET Endpoint |
|---|---|---|---|
| `hooks/useMatchResultReport.ts` | 10KB | Submit/accept/dispute match results + Supabase Realtime | `POST /api/matches/{id}/report`, `POST /api/matches/{id}/accept`, + `MatchHub` |
| `hooks/useMatchCheckin.ts` | 5KB | Player check-in for matches | `POST /api/matches/{id}/checkin` |
| `hooks/useMatchScheduling.ts` | 11KB | Time proposals, scheduling | `POST /api/matches/{id}/schedule` |
| `hooks/useTimeProposal.ts` | 7KB | Propose/accept match times | `POST /api/matches/{id}/time-proposal` |
| `hooks/useMatchChat.ts` | 5KB | In-match chat via Supabase Realtime | → `ChatHub` (SignalR) |
| `hooks/useMatchDispute.ts` | 7KB | File disputes with evidence | `POST /api/disputes` |

---

### Domain 7: Map Veto

| Source File | Size | What It Does | .NET Service |
|---|---|---|---|
| `hooks/useMapVetoMachine.ts` | **52KB** | Full veto state machine + Supabase Realtime | `Esportra.Core/Match/MapVetoEngine.cs` + `VetoHub` (SignalR) |
| `services/vetoService/vetoService.ts` | 2KB | Veto sequence definitions | `VetoSequenceService.cs` |
| `services/vetoService/sequences.ts` | 2KB | Map pool sequences | Config in `appsettings.json` |
| `services/vetoService/types.ts` | 0.4KB | Type defs | Contracts project |
| `pages/tournaments/MapVetoToken.tsx` | 5KB | Veto token page | **Keep UI** — calls VetoHub |

> [!CAUTION]
> **`useMapVetoMachine.ts` (52KB)** is the #1 security-critical migration. State machine must run server-side to prevent client manipulation.

---

### Domain 8: Venues & Bookings

| Source File | Size | What It Does | .NET Endpoint |
|---|---|---|---|
| `hooks/useVenueSearch.ts` | 4KB | Geo/name venue search | `GET /api/venues?q=&lat=&lng=` (cached 30s) |
| `hooks/useVenueBooking.ts` | 8KB | Create/cancel bookings | `POST/DELETE /api/venues/{id}/bookings` |
| `hooks/useVenueImpressions.ts` | 3KB | Track venue views | `POST /api/venues/{id}/impressions` |
| `hooks/useVenueLiveStatus.ts` | 1KB | Live seat availability | `GET /api/venues/{id}/live-status` |
| `hooks/useGeolocation.ts` | 1KB | Browser geolocation | **Keep client-side** |
| `services/api.ts` (venueApi) | 2KB | CRUD | `POST/PUT/DELETE /api/venues/*` |
| `services/api.ts` (bookingApi) | 2KB | Booking CRUD | `POST/PUT/DELETE /api/venues/{id}/bookings/*` |
| `hooks/useLicenses.ts` | 1KB | License management | `GET /api/venues/{id}/licenses` |
| `pages/venues/*.tsx` | 6 pages | Search, Details, List, Manage | **Keep UI** |
| `pages/venue-owner/*.tsx` | 1 page | Venue owner dashboard | **Keep UI** |

---

### Domain 9: Organizations & Staff

| Source File | Size | What It Does | .NET Endpoint |
|---|---|---|---|
| `lib/organizationStaff.ts` | **20KB** | Org staff CRUD, invites, accept/decline, tournament assignments, permission checks, audit log | **Full controller:** `POST/PUT/DELETE /api/organizations/{id}/staff/*` |
| `lib/tournamentStaff.ts` | 5KB | Tournament-level staff + permission index | `GET /api/tournaments/{id}/staff` |
| `hooks/useTournamentStaff.ts` | 2KB | Fetch staff with permissions | `GET /api/tournaments/{id}/staff` |
| `hooks/useMyStaffAssignments.ts` | 1KB | User's staff assignments | `GET /api/staff/me/assignments` |
| `hooks/useStaffInvites.ts` | 1KB | Pending staff invites | `GET /api/staff/me/invites` |
| `pages/organizer/OrganizationSettings.tsx` | **60KB** | Full org management UI | **Keep UI** |
| `pages/organizer/OrganizationWizard.tsx` | 27KB | Org creation wizard | **Keep UI** |
| `pages/staff/*.tsx` | 1 page | Staff dashboard | **Keep UI** |

**Organization Staff Endpoints:**

```
GET    /api/organizations/{id}/staff                        # List all staff
POST   /api/organizations/{id}/staff/invite                 # Invite by email
POST   /api/organizations/{id}/staff/{id}/respond           # Accept/decline
PUT    /api/organizations/{id}/staff/{id}                   # Update role/perms
DELETE /api/organizations/{id}/staff/{id}                   # Remove staff
POST   /api/organizations/{id}/staff/{id}/assign-tournaments # Assign to tournaments
DELETE /api/organizations/{id}/staff/{id}/tournaments/{tid}  # Unassign
GET    /api/staff/me/assignments                            # My assignments
GET    /api/staff/me/invites                                # My pending invites
```

---

### Domain 10: Notifications

| Source File | Size | What It Does | .NET Migration |
|---|---|---|---|
| `components/NotificationContext.tsx` | 10KB | Fetch notifications + Supabase Realtime for live updates + synthetic team invite notifs | → `NotificationHub` (SignalR) + `GET /api/notifications` |

**Notification Types Currently Used:**

| Type | Triggered By | Where |
|---|---|---|
| `result_reported` | Match result submitted | `useMatchResultReport.ts` |
| `result_accepted` | Match result verified | `process-match-result` Edge Function |
| `match_completed` | Series finished | `process-match-result` Edge Function |
| `team_invite` | Team invitation (synthetic from `team_invitations`) | `NotificationContext.tsx` |
| `staff_invite` | Organization staff invite | `organizationStaff.ts` |
| `tournament_announcement` | Organizer broadcast | `tournamentAnnouncements.ts` |
| `match_ready` | Match ready for check-in | DB trigger (`match_ready_notification_trigger`) |
| `dispute_filed` | Dispute submitted | `file_match_result_dispute` RPC |

**Migration:** All notifications written via `POST /api/notifications` by the .NET backend. Real-time delivery via `NotificationHub` → user-specific SignalR group `user:{userId}`.

---

### Domain 11: Email System

| Source File | Size | What It Does | .NET Migration |
|---|---|---|---|
| `hooks/useEmail.ts` | 2KB | Calls `send-email` Edge Function | `Esportra.Infrastructure/Email/EmailService.cs` |
| `supabase/functions/send-email/` | Edge Function | Resend API with HTML templates | .NET `IEmailService` using Resend SDK |

**Email Templates:**

| Template Type | Triggered By |
|---|---|
| `WELCOME` | User signup |
| `TOURNAMENT_REGISTRATION` | Tournament registration |
| `CHECKIN_REMINDER` | Automated reminder |
| `MATCH_CHECKIN_REMINDER` | Match approaching |
| `TEAM_INVITE` | Team invitation |
| `STAFF_INVITE` | Organization staff invite |

**Migration:** Create `EmailService.cs` using Resend .NET SDK. Templates as Razor views or embedded HTML. Called by .NET endpoints, not from client.

---

### Domain 12: Storage & File Uploads

| Source File | What It Does | .NET Migration |
|---|---|---|
| `lib/storage.ts` | Generates Supabase Storage public URLs | **Keep for reads.** .NET generates signed upload URLs |
| `lib/imageUtils.ts` | Client-side image cropping/resizing | **Keep client-side** |
| `components/FileUpload.tsx` | File upload component | **Keep** — upload to Supabase Storage directly |

**Storage Buckets:**

| Bucket | Used For | Upload Path |
|---|---|---|
| `system.assets.website` | Landing page assets, logos | Direct from admin |
| `avatars` | User profile avatars | Direct from client |
| `team-logos` | Team branding | Direct from client, signed URL from .NET |
| `tournaments.disputes.evidence` | Dispute screenshots/video | Direct from client |
| `venue-images` | Venue photos | Direct from client |

**Strategy:** Client uploads directly to Supabase Storage. .NET generates signed upload URLs when authorization is needed. .NET generates signed download URLs for private buckets. Public bucket reads stay via Supabase CDN.

```
POST /api/storage/upload-url     # .NET returns a signed upload URL
POST /api/storage/download-url   # .NET returns a signed download URL (private files)
```

---

### Domain 13: Sponsors, Ads & Partner Portal

| Source File | Size | What It Does | .NET Endpoint |
|---|---|---|---|
| `hooks/useSponsors.ts` | 6KB | Sponsor CRUD, ad placements, impressions | `GET/POST/PUT /api/sponsors/*` |
| `hooks/usePartnerApplication.ts` | 2KB | Partner submissions | `POST /api/partners/apply` |
| `pages/Partners.tsx` | 18KB | Public partners page, gallery, dynamic tracking | `GET /api/partners/public` (cached 60s) |
| `components/PartnerApplicationForm.tsx` | 21KB | Multi-step partner application wizard | **Keep UI** — submits to `/api/partners/apply` |
| `components/SponsorAd.tsx` | 3KB | Ad display component | **Keep UI** |
| `components/SponsorAds.tsx` | 8KB | Ad rotation | **Keep UI** |
| `components/SponsorsBanner.tsx` | 6KB | Sponsor banners | **Keep UI** |
| `components/StaticAd.tsx` | 4KB | Static ad placements | **Keep UI** |

---

### Domain 14: Admin Panel

| Source File | Size | What It Does | .NET Endpoint |
|---|---|---|---|
| `pages/admin/AdminAccess.tsx` | 33KB | Admin access gate | **Keep UI** |
| `pages/admin/AdminManagement.tsx` | 26KB | Role/permission management | `GET/POST/PUT /api/admin/users/*` |
| `pages/admin/Dashboard.tsx` | 11KB | Platform analytics | `GET /api/admin/dashboard` (cached 120s) |
| `pages/admin/DisputeCenter.tsx` | **35KB** | Dispute resolution | `GET/PUT /api/admin/disputes/*` |
| `pages/admin/ManageUsers.tsx` | 2KB | User management | `GET /api/admin/users` |
| `pages/admin/SystemSettings.tsx` | 4KB | System config | `GET/PUT /api/admin/settings` |
| `pages/admin/TournamentDetails.tsx` | 4KB | Admin tournament view | `GET /api/admin/tournaments/{id}` |
| `pages/admin/tools/*` | 10 files | Admin tools | Various admin endpoints |
| `hooks/useAdminUsers.ts` | 2KB | Manage users | `GET /api/admin/users` |
| `hooks/useUserManagement.ts` | 5KB | Suspend/ban/unban | `POST /api/admin/users/{id}/suspend` etc. |
| `lib/auditLog.ts` | 5KB | Audit logging | `AuditService.cs` — all audit writes server-side |

---

### Domain 15: Leaderboards, Stats & Analytics

| Source File | Size | What It Does | .NET Endpoint |
|---|---|---|---|
| `pages/Leaderboards.tsx` | 26KB | Global leaderboard | `GET /api/leaderboards` (Redis sorted set) |
| `pages/TournamentHistory.tsx` | 16KB | Past tournaments | `GET /api/tournaments/history` |
| `hooks/useOrganizerStats.ts` | 5KB | Organizer dashboard stats | `GET /api/organizer/stats` (cached 60s) |
| `hooks/useAnalytics.ts` | 9KB | Platform analytics | `GET /api/analytics` (cached 120s) |

---

### Domain 16: Miscellaneous

| Source File | What It Does | .NET Migration |
|---|---|---|
| `hooks/useRawgGame.ts` | RAWG.io game search proxy | `GET /api/games/search` |
| `hooks/useReviews.ts` (13KB) | Venue reviews | `GET/POST /api/venues/{id}/reviews` |
| `hooks/useMessaging.ts` (13KB) | Direct messaging | `GET/POST /api/messages` + `ChatHub` |
| `hooks/useGameLogo.ts` | Game logo URLs | `GET /api/games/{id}/logo` |
| `lib/tournamentAnnouncements.ts` (5KB) | Broadcast announcements to all tournament participants | `POST /api/tournaments/{id}/announcements` |
| `lib/rawgProxy.ts` | RAWG API wrapper | Merge into `RawgApiClient.cs` |
| `lib/timeUtils.ts` | Timezone helpers | **Keep client-side** |
| `lib/queryClient.ts` | React Query config | **Keep client-side** |
| `pages/Leaderboards.tsx` | Global rankings | `GET /api/leaderboards` |
| `pages/About.tsx` | Static | **Keep** |
| `pages/Contact.tsx` | Contact form | `POST /api/contact` |
| `pages/Privacy.tsx` / `Terms.tsx` | Legal | **Keep** |
| `pages/VerificationStatus.tsx` | Role verification status | `GET /api/profiles/me/verification-status` |
| `components/VerificationRequestForm.tsx` | Organizer/venue verification form | `POST /api/profiles/me/request-verification` |

---

## 4. Edge Functions → .NET Endpoints (Complete Map)

| # | Edge Function | .NET Endpoint | Auth Policy |
|---|---|---|---|
| 1 | `scan-recent-matches` | `POST /api/matches/scan` | `[Authorize]` |
| 2 | `process-match-result` | `POST /api/matches/{id}/process` | `[Authorize]` + captain check |
| 3 | `verify-match-result` | `POST /api/matches/{id}/verify` | `[Authorize]` |
| 4 | `worker-bracket-advancement` | `POST /api/brackets/advance` | Internal/Service |
| 5 | `riot-oauth` | `POST /api/integrations/riot/callback` | `[Authorize]` |
| 6 | `faceit-oauth` | `POST /api/integrations/faceit/callback` | `[Authorize]` |
| 7 | `riot-match-proxy` | `GET /api/integrations/riot/match/{id}` | `[Authorize]` |
| 8 | `faceit-match-proxy` | `GET /api/integrations/faceit/match/{id}` | `[Authorize]` |
| 9 | `send-email` | Internal `EmailService.cs` | Not exposed |
| 10 | `invite-sponsor` | `POST /api/sponsors/invite` | `Organizer` |
| 11 | `manage-users` | `POST /api/admin/users/{id}/action` | `CanBanUsers` |
| 12 | `set-password` | `POST /api/auth/set-password` | `[Authorize]` |
| 13 | `send-recovery-email` | `POST /api/auth/recovery` | Public |
| 14 | `record-metric` | `POST /api/metrics` | `[Authorize]` |
| 15 | `rawg-proxy` | `GET /api/games/search` | Public |
| 16 | `automated-reminders` | Background job (Hangfire/Timer) | Internal |
| 17 | `compute-bracket-ui-cache` | Background job or on-demand | Internal |
| 18 | `faceit-org-test` | Dev only — delete | — |
| 19 | `finalize-match-result` | `POST /api/matches/{id}/finalize` | Internal |

---

## 5. SignalR Hubs (Full Real-Time)

| Hub | Replaces | Groups | Events |
|---|---|---|---|
| `BracketHub` | `useBracketRealtime` + `useStageRealtime` | `bracket:{versionId}` | `MatchUpdated`, `MatchInserted`, `StageCompleted` |
| `MatchHub` | `useMatchResultReport` realtime | `match:{matchId}` | `ReportSubmitted`, `ReportAccepted`, `ReportDisputed` |
| `VetoHub` | `useMapVetoMachine` realtime | `veto:{vetoId}` | `VetoAction`, `VetoComplete`, `StateSync` |
| `ChatHub` | `useMatchChat` + `useMessaging` | `chat:{matchId}`, `dm:{threadId}` | `MessageReceived`, `TypingIndicator` |
| `NotificationHub` | `NotificationContext` Realtime | `user:{userId}` | `NewNotification`, `NotificationRead`, `TeamInvite` |
| `LiveHub` | `useVenueLiveStatus` | `venue:{venueId}` | `SeatUpdate`, `StatusChange` |

---

## 6. Redis Caching Strategy

| Data | Pattern | Key | TTL |
|---|---|---|---|
| User role context | `HybridCache` | `user-ctx:{userId}` | 60s |
| Tournament list | Cache-aside | `tournaments:list:{filters}` | 30s |
| Public bracket | Cache-aside | `bracket:{versionId}` | 10s |
| Leaderboards | Sorted Set | `standings:{stageId}` | Realtime |
| Veto state | Hash | `veto:{vetoId}:state` | Until complete |
| Match state | Hash | `match:{matchId}:state` | Until complete |
| Rate limiting | Sliding window | `rate:{userId}:{endpoint}` | 1min |
| Admin dashboard | Cache-aside | `admin:dashboard` | 120s |
| Game logos | String | `game-logo:{gameId}` | 24h |
| Venue search | Cache-aside | `venues:search:{hash}` | 30s |

---

## 7. Email Service Architecture

```csharp
// Esportra.Infrastructure/Email/EmailService.cs
public class EmailService(IResendClient resend, ITemplateRenderer templates)
{
    public Task SendWelcome(string email, WelcomeData data) => ...
    public Task SendTournamentRegistration(string email, RegistrationData data) => ...
    public Task SendCheckinReminder(string email, CheckinData data) => ...
    public Task SendMatchReminder(string email, MatchData data) => ...
    public Task SendTeamInvite(string email, TeamInviteData data) => ...
    public Task SendStaffInvite(string email, StaffInviteData data) => ...
}
```

All emails triggered **server-side only**. No client-to-email path.

---

## 8. Audit Logging Architecture

Two audit systems currently exist — merge into one:

| Current | Source | .NET Migration |
|---|---|---|
| `lib/auditLog.ts` | Admin actions (suspend, ban, approve) | `AuditService.cs` — server-side only |
| `lib/organizationStaff.ts` → `logAuditEvent()` | Org staff actions | Same `AuditService.cs` with org context |

```csharp
public class AuditService(IDbConnection db)
{
    // Admin audit log (audit_logs table)
    public Task LogAdmin(ActionType action, TargetType target, string targetId, 
        string adminId, object? details = null, Severity? severity = null);
    
    // Organization audit log (staff_audit_log table)
    public Task LogOrgStaff(string orgId, string actorId, string action,
        string? targetType = null, string? targetId = null, object? details = null);
}
```

---

## 9. Exhaustive UI Component Directory Map

*(Proof of full codebase audit: all UI components kept client-side, communicating entirely via new .NET Endpoints rather than Supabase.)*

| Folder | Scope / Files | Migration Note |
|---|---|---|
| `components/admin/` | 21 components (UserManagement 55KB, TournamentManagement 27KB) | Re-route to `AdminEndpoints.cs` |
| `components/organizer/` | 19 components (OrgStaffManager 49KB, DisputeCenter 46KB) | Re-route to `OrganizationEndpoints.cs` + `AdminEndpoints.cs` |
| `components/player/` | 19 components (TeamCreationWizard 33KB, EditProfileDialog 29KB) | Re-route to `ProfileEndpoints.cs` + `TeamEndpoints.cs` |
| `components/tournament/` | 29 components + 4 subdirs (MatchAutoReport 51KB, RoundScheduling 47KB) | Re-route to `MatchEndpoints.cs`, `TournamentEndpoints.cs`, `BracketHub` |
| `components/bracket/` | 10 components (SwissView 29KB, GroupStageView 26KB) | UI rendering logic is safe; data feeds via `BracketHub` |
| `components/venue/` | 2+ components (StationSelector, TimeSlots) | Re-route to `VenueEndpoints.cs` |
| `components/verification/` | 2 large components + wizard (OrgVerification 25KB, VenueOwner 16KB) | Re-route to `ProfileEndpoints.cs` |
| `components/ui/` | 58 reusable primitive components | No backend changes required |
| `components/landing/` | 10 sections (FeaturesSection 10KB, AppShowcase 9KB) | Purely presentational |
| `components/effects/` | 10 animations (AnimatedLiquidBackground 10KB, etc.) | Purely presentational |
| `components/navigation/` | DesktopNav, MobileNav, UserMenu | Re-route user logic to `ProfileEndpoints.cs` and `NotificationHub` |
| `components/auth/` | Auth-related UI elements | Supabase Auth stays intact |

---

## 10. .NET Project Structure

```
esportra-api/
├── src/
│   ├── Esportra.Api/
│   │   ├── Program.cs
│   │   ├── Endpoints/
│   │   │   ├── ProfileEndpoints.cs
│   │   │   ├── TeamEndpoints.cs
│   │   │   ├── TournamentEndpoints.cs
│   │   │   ├── MatchEndpoints.cs
│   │   │   ├── BracketEndpoints.cs
│   │   │   ├── VenueEndpoints.cs
│   │   │   ├── OrganizationEndpoints.cs
│   │   │   ├── StaffEndpoints.cs
│   │   │   ├── NotificationEndpoints.cs
│   │   │   ├── SponsorEndpoints.cs
│   │   │   ├── AdminEndpoints.cs
│   │   │   ├── LeaderboardEndpoints.cs
│   │   │   ├── IntegrationEndpoints.cs
│   │   │   ├── StorageEndpoints.cs
│   │   │   └── ContactEndpoints.cs
│   │   ├── Middleware/
│   │   │   ├── SupabaseJwtMiddleware.cs
│   │   │   ├── RoleEnrichmentMiddleware.cs
│   │   │   └── RateLimitMiddleware.cs
│   │   └── Auth/
│   │       ├── PermissionRequirement.cs
│   │       └── PermissionHandler.cs
│   │
│   ├── Esportra.Core/
│   │   ├── Bracket/         (7 services)
│   │   ├── Match/           (MapVetoEngine, ResultProcessor, AutoReport)
│   │   ├── Team/            (TeamService, RosterService)
│   │   ├── Tournament/      (TournamentService, RegistrationService)
│   │   ├── Venue/           (BookingService, ImpressionService)
│   │   ├── Organization/    (OrgStaffService, AssignmentService)
│   │   ├── Notification/    (NotificationService)
│   │   ├── Auth/            (RbacService)
│   │   └── Audit/           (AuditService)
│   │
│   ├── Esportra.Infrastructure/
│   │   ├── Database/        (Npgsql connection pool)
│   │   ├── Cache/           (Redis + HybridCache)
│   │   ├── Email/           (Resend SDK)
│   │   ├── Integrations/    (RiotApiClient, FaceitApiClient, RawgClient)
│   │   ├── Storage/         (Supabase Storage signed URLs)
│   │   └── Hubs/            (6 SignalR hubs)
│   │
│   └── Esportra.Contracts/  (DTOs, request/response records)
│
├── tests/
├── docker-compose.yml        (API + Redis)
└── Esportra.sln
```

---

## 11. Migration Phases & Testing Strategy

> [!IMPORTANT]
> **Domain-by-Domain Validation Rule:**
> To ensure absolute stability and prevent "big bang" deployment failures, we will mandate a strict **Testing & Validation** pause after *every single domain* is migrated. We will thoroughly test the React-to-.NET integration for that specific feature (e.g., Teams) before writing a single line of backend code for the next domain.

| Phase | Weeks | What Moves |
|---|---|---|
| **0 — Foundation** | 1–2 | .NET 9 solution, Redis, Npgsql, JWT auth, RBAC middleware, `apiClient.ts`, `signalrClient.ts`. *Test: JWT validation works.* |
| **1 — Edge Functions** | 2–4 | All 19 Edge Functions → .NET endpoints. *Test: Trigger 19 endpoints via Postman/React.* |
| **2 — Server Logic** | 4–8 | Bracket engine, MapVetoEngine, email service, audit service. *Test: Generate 256-team brackets on server & veto sequence.* |
| **3 — Real-time** | 6–10 | All 6 SignalR hubs replacing Supabase Realtime. *Test: Multi-tab live chat and bracket updates.* |
| **4 — Hook Migration** | 8–16 | All 47 hooks redirected through API domain-by-domain. *Test: Full E2E user flow for each domain immediately after porting.* |
| **5 — Polish** | 14–20 | Redis caching, rate limiting, load testing, remove Edge Functions. *Test: Load test 10,000 requests/sec.* |

**Estimated timeline: 16–20 weeks** with no feature freeze.

---

## 12. What Stays Client-Side (Frontend Only)

| Item | Reason |
|---|---|
| Supabase Auth calls (signIn, signUp, OAuth) | Auth stays with Supabase |
| Supabase Storage uploads | Direct client → Storage CDN |
| `lib/imageUtils.ts` | Client-side image processing |
| `lib/timeUtils.ts` | Timezone helpers |
| `hooks/useGeolocation.ts` | Browser API |
| `services/bracket/optimisticBracket.ts` | UI-only optimistic updates |
| All React components and pages | UI remains unchanged — only the data source changes |

---

## 13. B2B Public APIs & White-Label (Whitelisting) Strategy

One of the largest benefits of moving from a "React ➔ Supabase" architecture to a "React ➔ .NET API ➔ Supabase" architecture is that **you now have a centralized API gateway that you fully control.** 

Because all business logic (bracket generation, matchmaking, map vetoes, dispute handling) is now abstracted behind HTTP endpoints in .NET, you can immediately start offering these capabilities to third-party partners as a **White-Label / API-as-a-Service** product.

Here is exactly how the new robust backend enables this:

### 1. Multi-Tenancy (White-Labeling Tournaments)
Currently, all tournaments belong to "Esportra." To offer a white-label solution where partners can host Esportra-powered tournaments on their own domains:
*   **Tenant IDs:** We introduce a `TenantId` to core tables (`tournaments`, `users`, `matches`). 
*   `.NET Middleware:** A custom .NET middleware reads the `X-Tenant-ID` header (or reads the origin domain) from incoming requests and automatically scopes all database queries to that specific partner.
*   **Custom Branding:** White-label partners can upload their own global CSS variables, logos, and custom domains, managed via a new `PlatformTenant` .NET endpoint.

### 2. API Keys & B2B Authentication
To allow partners to pull data (e.g., live brackets, leaderboards) directly into their own systems:
*   **API Key issuing:** .NET will include an `ApiKeyService` that generates hashed API keys for registered partners.
*   **Custom Authentication Policy:** We add an `[Authorize(Policy = "PartnerApi")]` attribute to specific routes in .NET.
*   **Usage:** Partners invoke your API using `Authorization: Bearer <their-api-key>`. The .NET middleware instantly validates the key against Redis (sub-millisecond validation) and logs the request.

### 3. Rate Limiting & Monetization (Using Redis)
When exposing public APIs, you must protect your servers and monetize heavy usage.
*   **Tiered Access:** We configure .NET's built-in `RateLimiter` connected to Redis.
*   **Free Tier:** 100 requests / minute.
*   **Pro Partner Tier:** 5,000 requests / minute.
*   Redis tracks consumption automatically using a sliding window algorithm. If a partner exceeds their quota, .NET returns a `429 Too Many Requests` response.

### 4. Webhooks (Real-Time Push for Partners)
Partners won't want to constantly poll your API to see if a match finished. 
*   We will implement a **Webhook Dispatcher** in .NET.
*   When a critical event happens (e.g., `MatchCompleted`, `TournamentRegistered`), .NET adds an event to a background queue.
*   A background worker (`IHostedService`) POSTs this JSON payload to the URLs that partners have registered via their developer dashboard.

### Summary of the B2B Flow
By completing this migration, you are essentially building **Esportra Web Services (EWS)**. Your own React frontend just becomes "Client #1" of your API. The architecture needed to let a multibillion-dollar partner use your engine is identical to the architecture you are building for your own React frontend.
