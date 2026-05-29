# Staging → Main Promotion Test Plan

Use this gate before merging `staging` into `main`. The goal is **zero manual smoke testing** for covered areas: run one command, get a pass/fail signal.

---

## Prerequisites

1. **Staging deployed** — frontend + backend (browse `status_group` + `created_at` sort require backend).
2. **`e2e/.env`** — copy from `e2e/.env.example` with real passwords.
3. **Accounts** — organizer `E2E_ORGANIZER_EMAIL`, players `E2E_PLAYER1_*` / `E2E_PLAYER2_*`.
4. **Local build (optional but recommended):**
   ```bash
   npm run build
   dotnet build d:/esportra-backend/src/Esportra.Api/Esportra.Api.csproj
   ```

---

## One-command promotion gate

```bash
npm run test:e2e:promote
```

Runs **all** Playwright specs below serially (`workers: 1`). Expected runtime: **~8–12 minutes** on staging.

**Pass criteria:** exit code `0`, no failed tests. Flaky realtime test has retry in CI via `playwright.config.ts`.

> **Important:** Browse tests (`tournament-browse-promotion.spec.ts`) require **both** staging frontend (sends `status_group`) **and** staging backend (filters + `created_at` sort). They will fail until those deploys land — that is intentional; they block promotion of broken browse logic.

---

## Automated coverage map

| Spec file | Area | What it proves |
|-----------|------|----------------|
| `tournament-browse-promotion.spec.ts` | **Browse / promote blocker** | Tab isolation (`status_group`), newest-first sort, Upcoming/Completed visible **without** Online/Region filters |
| `stage-status-simplification.spec.ts` | **Stage status** | Derived progress chips, completion API, timeline validation, advance flow, public/organizer UI |
| `br-round-evidence.spec.ts` | **BR evidence (regression)** | Player evidence → publish → organizer leaderboard |
| `br-organizer-stages.spec.ts` | **BR organizer stages** | Templates, groups, seeding, edit/reorder/delete, advancement UI, reseed blocked |
| `br-organizer-games.spec.ts` | **BR organizer games** | Rounds, results, evidence review, complete/reopen/reset, leaderboard, multi-group, realtime |
| `br-player-game-room.spec.ts` | **BR player room** | Enter room, lobby code, evidence, gates, history, live updates |
| `br-public-leaderboard.spec.ts` | **BR public** | Leaderboard tab, groups, standings, scoring rules, lobby code not public |
| `br-errors-negative.spec.ts` | **BR error UX** | API + UI negative paths, friendly toasts, no technical leakage |

**Total:** ~47 automated tests (including browse gate).

---

## Feature checklist (automated ✓ / manual ○)

### Battle Royale (modern path) — ✓ fully automated

| # | Scenario | Spec |
|---|----------|------|
| 1 | Single-lobby + qualifier→finals templates | `br-organizer-stages` |
| 2 | Group bootstrap, random/snake seed | `br-organizer-stages` |
| 3 | Stage edit, reorder, delete, reset | `br-organizer-stages` |
| 4 | Advance teams after completion | `br-organizer-stages` |
| 5 | Reseed blocked when rounds exist | `br-organizer-stages` |
| 6 | Create/start/complete/reset round | `br-organizer-games` |
| 7 | Manual results grid + evidence review | `br-organizer-games` |
| 8 | Organizer leaderboard (no orphan zeros) | `br-organizer-games` |
| 9 | Player game room + evidence + duplicate | `br-player-game-room` |
| 10 | Public leaderboard + lobby security | `br-public-leaderboard` |
| 11 | Timeline / ongoing / evidence validation errors | `br-errors-negative` |
| 12 | SignalR cross-browser refresh (best-effort) | `br-organizer-games` `@flaky` |

### Stage status simplification — ✓ automated

| # | Scenario | Spec |
|---|----------|------|
| 13 | Derived progress labels (no manual status PATCH) | `stage-status-simplification` |
| 14 | Completion API + timeline gates | `stage-status-simplification` |
| 15 | Advance API + UI chips | `stage-status-simplification` |

### Tournament browse (staging fixes) — ✓ automated

| # | Scenario | Spec |
|---|----------|------|
| 16 | New publish shows on **Upcoming** without filters | `tournament-browse-promotion` |
| 17 | Completed shows on **Completed** without filters | `tournament-browse-promotion` |
| 18 | Newest-created sort within tab | `tournament-browse-promotion` |
| 19 | Region filter + All Regions both work | `tournament-browse-promotion` |
| 20 | Online filter includes online BR events | `tournament-browse-promotion` |

### Brackets / match room / mock — ○ manual (not in promote suite)

| # | Scenario | Notes |
|---|----------|-------|
| 21 | Organizer match room from bracket card | Staging-only; no E2E yet |
| 22 | Mock tournament generate/clear/publish | Staging-only; no E2E yet |
| 23 | Walkover / bracket graph refresh | Staging-only; no E2E yet |

### Seasons / invitations — ○ out of scope for this gate

Excluded from `test:e2e:promote` per release scope. Test separately if merging season work to main.

### UI / design revamp — ○ visual smoke only

| # | Scenario | Notes |
|---|----------|-------|
| 24 | Landing hero + navbar render | Quick visual on staging after deploy |
| 25 | `/brand` page loads | 404 check |
| 26 | JackButton / dark theme on sign-in | Visual |

---

## Manual spot-check (5 min, optional)

Only if promote suite passes but you want extra confidence:

1. Open `/tournaments` → **Upcoming** → confirm your latest publish is near the top.
2. Open **Completed** → confirm a recently finished event appears without filters.
3. Sign in as organizer → publish a draft → confirm it appears within 30s on browse.
4. Open one BR tournament public page → **Leaderboard** tab loads.

---

## CI / pre-merge workflow

```bash
# 1. Deploy staging (frontend + backend)
# 2. Run gate
npm run test:e2e:promote

# 3. Optional lint + build
npm run lint
npm run build

# 4. Merge staging → main when green
```

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Browse tests fail, BR tests pass | Backend not deployed (`status_group` ignored) |
| `API lists newest created first` fails | Backend sort not deployed |
| Evidence 500 on PUT | Storage bucket / player auth on staging |
| Tests skip entirely | Missing or placeholder `e2e/.env` |
| Realtime test flakes | SignalR latency — retry once; non-blocking if rest passes |

---

## Adding coverage

When adding staging features before main promotion:

1. Add/modify spec under `e2e/`.
2. Register in `test:e2e:promote` in `package.json`.
3. Add a row to the **Automated coverage map** above.
