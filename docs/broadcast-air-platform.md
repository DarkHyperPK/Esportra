# Esportra Air backend and frontend

14 October 2026. Implemented locally in the existing platform repositories. This is not a deployment, independent runtime acceptance, or live database/game certification.

## What is connected

Later clarification on 14 October: the tournament dashboard entry and deeper tournament-to-Air data bridge were missing from this earlier pass. They are now implemented at `/organizer/tournament/:slug?tab=broadcast`. See [Tournament operations to Air](tournament-air-bridge.md) for authoritative creation, organization selection, configuration preview and per-match veto delivery. Its verification counts and rebuilt installer supersede this earlier checkpoint.

The main frontend owns organization show planning, pairing codes, crews, talent, sponsors, rundown editing, recorded activity and reports. The .NET backend owns authenticated organization/crew/node contracts. Air owns local OBS, capture, browser outputs and production progression. Web platform status does not control OBS.

The earlier product pass implemented show settings/home, nine-step setup, actual match/code selection, talent, crew workspace, rundown mapping/reorder and original-show event delivery. This continuation completes server routes and web controls for show duplication/deletion, scheduling, node access and recorded activity.

## Web entry points

| Route | Purpose |
| --- | --- |
| `/broadcast/home` | Organization shows, paired-node heartbeat and setup entry |
| `/broadcast/shows` | Create, duplicate planning, confirm deletion of an unused show |
| `/broadcast/get-started?showId=…` | Nine-step setup including settings, pairing and send configuration |
| `/broadcast/shows/:showId` | Persisted rundown and platform lifecycle |
| `/broadcast/shows/:showId/nodes` | Backend heartbeat and confirmed access revocation |
| `/broadcast/shows/:showId/activity` | Cursor-paginated acknowledged event metadata |
| `/broadcast/crew/shows` | Authenticated crew assignments and role briefs |

Assigned matches display resolved team names and best-of format. Crew/talent/sponsors are optional in preparation. A successful configuration send requires separate receipt/readiness verification in Air. Show status badges distinguish draft, scheduled, live, ended and cancelled.

Planned start uses the operator's browser timezone and sends UTC. Clearing is explicit `null`; changing only the title preserves the original timestamp, including milliseconds. An impossible local date/time is rejected. Changing the schedule never starts capture, OBS or the platform show.

## Added server contracts and guards

| Contract | Behavior |
| --- | --- |
| `POST /api/broadcast/shows/:showId/duplicate` | Owner-only transaction copies tournament link, match slots, rundown, talent and sponsors into a fresh draft |
| `DELETE /api/broadcast/shows/:showId` | Owner-only transaction deletes an unstarted show without runtime/proof/progression history; otherwise 409 |
| `GET /api/broadcast/shows/:showId/activity` | Owner-only event metadata; limit 1–100, stable `(created_at,id)` cursor; no raw payloads |
| `PATCH /api/broadcast/shows/:showId` | Title/tournament/schedule presence semantics; live title lock; schedule locked for live/closed shows |
| Existing match add/remove | Parent show locked; live/closed planning rejected; published/active bracket scope checked |
| Existing status update | Compare-and-set on the previous state; stale concurrent transitions return 409 |
| Existing config send | Rejects ended/cancelled shows; still sends to organization-connected nodes |
| Existing node deletion/heartbeat/event | Owner revokes registration; active-node condition prevents revoked-node heartbeat updates and legacy event writes |

Duplication uses a repeatable-read transaction, new row IDs and reset progression. It does not copy schedule, sync/live timestamps, arbitrary show runtime configuration, crew membership/invites, event history, corrections, proof or automation-rule links. Crew must be invited again. Shared original bracket matches remain shared; duplication does not create a tournament.

Deletion confirmation names the loss of planning/invites. Live and ended shows cannot be deleted. A draft/cancelled show with runtime records or non-pending match/rundown progression is also retained for reports. No existing data was deleted during implementation or browser fixtures.

Activity requires both `beforeAt` and `beforeId` when paging and fetches one extra row to compute the next cursor. It returns metadata only, ordered by original recorded time. Offline records can arrive later. It does not establish the current scene, actual game state, or streaming status.

Revocation affects platform access. Existing SignalR heartbeat closes an inactive node connection on its next heartbeat; it is not a remote stop command. Stop local OBS/capture/rundown on the workstation separately. REST bearer validation also checks active registration. Credential recovery/re-pairing is a local Air operation; web never receives the node token.

## Run the local platform

Use the repositories' existing authorized development configuration and the same development Supabase/Auth instance. Keep service-role credentials on the backend. No connection string or credential is included here.

```powershell
# Backend terminal, D:/esportra-backend
dotnet run --project src/Esportra.Api

# Frontend terminal, D:/frag-and-book-main
$env:VITE_API_URL = 'http://localhost:8080'
npm run dev
```

Backend Kestrel binds port 8080; development CORS includes localhost:5173. Frontend REST and SignalR both use `VITE_API_URL`. The built frontend artifact uses its build-time configuration; local source changes do not update the hosted website. This continuation adds no migration and runs no live schema changes.

## Verification

- Core: 243 tests passed. API event guard: 27 passed. API/test-project build: zero errors, four existing test fake-ADO warnings.
- Frontend: 64 focused broadcast tests passed; production build and required chunk/button/JSX checks passed. Changed broadcast files have no diagnostics in the final focused scan. Global strict TypeScript still fails in unrelated code.
- Browser: 13 workflow checks passed against real components/hooks and isolated local API/DB fixtures, with 13 web desktop/phone screenshots. Includes pairing, preparation, configuration send, crew, cursor paging, confirmed revocation, Asia/Karachi scheduling, duplication into setup and acknowledged deletion.
- New database integration coverage compiles for planning copy/reset, foreign-owner denial, deletion/history protection, live/closed guards and tied-timestamp pagination/privacy. It remains unexecuted without the Docker/PostgreSQL fixture. Synthetic browser responses are not database proof.

Actual screenshots and machine reports: `D:/Esportra-Air/docs/audits/product-smoke/`. The gallery includes the three previously verified native desktop screenshots. The previous unsigned Air installer is unchanged by this backend/frontend continuation.

Next validation: run the PostgreSQL integration fixture, then rehearse real web-to-Air configuration, observer/OBS activity and reconnect with authorized development accounts. No commit, push or deployment occurred.
