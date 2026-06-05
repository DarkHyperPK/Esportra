# Staging test plan — Game catalog + Battle Royale (Playwright)

Target: **staging** frontend + backend after catalog migration and BR map/config parity.

## Prerequisites

1. **Backend deployed** with:
   - `GameCatalog/esportsGames.json` imported (restart API or fresh deploy)
   - Migration `20250605120000_br_round_map.sql` applied (`br_rounds.map` column)
2. **Frontend deployed** pointing at staging API (`VITE_API_URL`).
3. **Local / CI env** — copy `e2e/.env.example` → `e2e/.env` and set:
   - `BASE_URL` — staging site URL
   - `E2E_API_URL` — staging API URL
   - `E2E_ORGANIZER_EMAIL` / `E2E_ORGANIZER_PASSWORD`
   - `E2E_PLAYER1_EMAIL` … (for registration tests)
   - Optional: `E2E_BACKEND_CATALOG_PATH` — path to backend `esportsGames.json` for robustness spec

## Quick smoke (5–10 min)

```bash
# Catalog sync manifest (local monorepo with sibling backend)
npm run check:game-catalog-sync

# API + catalog parity vs backend packaged JSON
npm run test:e2e:catalog
```

## Full BR + catalog suite (20–40 min)

```bash
npm run test:e2e:br
npm run test:e2e:catalog
```

Run serially (`--workers=1`) — already configured in npm scripts.

---

## Playwright specs

### 1. `e2e/game-catalog-robustness.spec.ts` (@staging-only)

| Test | Validates |
|------|-----------|
| Public catalog matches backend packaged registry | `GET /api/games/catalog` — game count, version, contentHash, modes, structures, features |
| Every slug/name/alias resolves | `GET /api/games/catalog/{alias}` |
| Tournament create rejects invalid game/mode/structure | API validation via catalog |
| Registration enforces roster mode/size | Catalog-backed registration rules |
| BR settings rejected on non-BR games | `HasBattleRoyaleSettings` guard |

**Pass criteria:** All tests green; `catalogVersion` matches `gameCatalogSync.json`.

### 2. `e2e/game-catalog-gui.spec.ts` (@staging-only)

| Test | Validates |
|------|-----------|
| Wizard lists catalog games; CS2 excluded from picker | `useGameCatalog` + StepBasicInfo |
| Valorant 5v5 bracket wizard completion | End-to-end create |
| Skirmish 2v2 roster + registration | Mode-level catalog (team size) |
| Understaffed roster blocked | Registration validation |

**Pass criteria:** Wizard game dropdown populated from API; tournament creates successfully.

### 3. BR specs (`npm run test:e2e:br`)

| Spec | Focus |
|------|--------|
| `br-organizer-stages.spec.ts` | Stage config, advancement |
| `br-organizer-games.spec.ts` | Round management, results |
| `br-player-game-room.spec.ts` | Public/player BR room |
| `br-public-leaderboard.spec.ts` | Leaderboard + scoring |
| `br-round-evidence.spec.ts` | Evidence upload flow |
| `br-errors-negative.spec.ts` | Invalid input handling |

**Pass criteria:** Organizer can assign **per-round maps** (Apex/PUBG/Fortnite); leaderboard tiebreaker/scoring matches preset.

---

## Manual checks (not covered by Playwright)

| # | Flow | Steps | Expected |
|---|------|-------|----------|
| M1 | Catalog API maps | `GET /api/games/catalog/apex-legends` | `brConfig.maps.items[]` with placeholder `imageUrl` |
| M2 | Wizard BR map mode | Create Apex BR tournament → Format step | **Default Map Mode** visible (not hidden) |
| M3 | Organizer map picker | BR stage → advanced config / round panel | Map tiles with placeholder thumbnails |
| M4 | Landing games | Homepage supported games | Games load; IGDB batch still works |
| M5 | Offline assets | Disable API / block catalog | UI shows empty game lists (no stale bundled catalog) |
| M6 | Catalog drift CI | Change backend JSON without `npm run sync:game-catalog` | `npm run check:game-catalog-sync` fails |

---

## After backend catalog change

From `frag-and-book-main` (sibling `esportra-backend`):

```bash
npm run sync:game-catalog
git add src/data/gameCatalogSync.json src/data/gameCatalogAssets.json
git commit -m "chore(catalog): sync manifest with backend"
```

---

## Failure triage

| Symptom | Likely cause |
|---------|----------------|
| Empty game picker | Catalog API down or CORS; check Network tab for `/api/games/catalog` |
| Map mode hidden in wizard | Catalog not loaded before step 2; hard refresh |
| `contentHash drift` in CI | Run `npm run sync:game-catalog` |
| E2E robustness can't find backend JSON | Set `E2E_BACKEND_CATALOG_PATH` or clone backend as sibling |
| Map save 400 | Backend not restarted after catalog import; map name not in catalog pool |
