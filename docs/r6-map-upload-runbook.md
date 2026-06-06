# Rainbow Six Siege map upload runbook

Use this runbook to publish R6 map images from `R6 Maps/` and keep frontend/backend map metadata aligned.

## Prerequisites

- All 27 source images present in [`R6 Maps/`](../R6%20Maps/)
- Staging SSH access and API/storage credentials on the target host
- Backend migration applied that upserts `game_maps` rows for `Rainbow Six Siege`

## 1. Regenerate canonical manifest

```bash
node scripts/generate-r6-map-manifest.mjs
```

Output: [`src/data/r6-map-manifest.json`](../src/data/r6-map-manifest.json)

The script normalizes display names (for example `RussianCafe` → `Kafe Dostoyevsky`, `ClubHouse` → `Clubhouse`).

## 2. Upload images to public storage

Recommended object prefix:

```text
system.assets.games/r6/maps/{slug}.avif
```

For each manifest entry:

1. Upload `R6 Maps/{filename}` to storage.
2. Capture the public URL.
3. Upsert `game_maps.map_image_url` for `(game='Rainbow Six Siege', map_name=displayName)`.

Suggested verification SQL:

```sql
SELECT map_name, map_image_url IS NOT NULL AS has_image
FROM game_maps
WHERE game = 'Rainbow Six Siege'
ORDER BY map_name;
```

Expected result: **27 rows**, all with `has_image = true`.

## 3. Sync game catalog (when backend is available)

```bash
npm run sync:game-catalog
```

This refreshes:

- `src/data/gameCatalogSync.json`
- `src/data/gameCatalogAssets.json`
- `e2e/fixtures/backend-catalog.json`

If backend is offline, keep the manual R6 overlay in `gameCatalogAssets.json` (slug `rainbow-six-siege`, `mapPoolSize: 9` in backend catalog when synced).

## 4. Frontend validation checklist

- Tournament wizard shows all R6 maps with images.
- Wizard blocks progression unless **exactly 9** maps are selected.
- Map veto board uses dynamic 9-map sequences (BO1/BO3/BO5).
- Veto history timeline appears on active veto UI and match page summary.

## 5. Test gates

```bash
npx vitest run src/services/vetoService/__tests__/sequences.test.ts src/components/tournament/wizard/__tests__/TournamentMapPoolSelector.test.tsx
npm run test:e2e:veto
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|--------|--------------|-----|
| Wizard shows 0 R6 maps | DB seed missing or API offline | Apply migration / verify `/api/games/maps?game=Rainbow Six Siege` |
| Broken map cards | `map_image_url` null or AVIF blocked | Re-upload assets; ensure storage MIME allowlist includes `avif` |
| Veto history empty | History endpoint/migration not deployed | Deploy backend `GET /api/veto/{matchId}/history` support |
| Exact-9 validation skipped | `mapVetoEnabled` false in tournament settings | Enable map veto in wizard settings step |
