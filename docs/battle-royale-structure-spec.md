# Battle Royale Tournament Structure — Implementation Spec

**Version:** lean v1 (shipped) → backend parity → v2 presets  
**Platform:** Frag & Book tournament platform  
**Goal:** One flexible BR structure that works for every battle royale game, with organizer customization. Game-specific esports formats (PUBG group-vs-group, etc.) come later as presets on top of the same core.

### Scope tiers

| Tier | What ships | Notes |
|------|------------|-------|
| **Lean v1** | Stages → groups → rounds → results, `top_n_per_group` advancement, tournament-wide scoring preset | UI must not promise behavior the backend ignores |
| **Backend parity** | Per-stage scoring via `config.br`, `brTiebreaker`, `br_rounds.map` + map modes | Re-enable hidden frontend controls after this lands |
| **V2 presets** | Game-specific templates (Apex ALGS, Fortnite FNCS, PUBG PCS) + PUBG group-vs-group | Built on stable parity layer |

---

## 0. Guiding principles

1. **One core data model for all BR games** — no game-specific code paths in v1.
2. **Hybrid customization** — tournament-wide defaults; each stage may override specific fields.
3. **Relational model only** — use `br_groups` / `br_rounds` / `br_round_results`. Do not extend the legacy JSON path (`useBRGameResults.ts`).
4. **Build universal first, presets second** — v1 ships the generic engine; v2 adds PUBG/Apex/Fortnite templates that pre-fill config.
5. **Every config field resolves unambiguously** — no silent fallbacks that differ between UI and server.

---

## 1. Core hierarchy (locked definitions)

```
Tournament
  └── Stage[]                    (ordered phases: Qualifiers, Semis, Finals)
        └── Group / Lobby[]      (parallel lobbies within a stage)
              └── Round / Game[]   (one playable match each; best-of-1 always)
                    └── Result[]   (placement + kills → points)
```

| Term | DB/API | Meaning |
|------|--------|---------|
| **Stage** | `tournament_stages` (`format = "battle_royale"`) | A phase of the tournament |
| **Group / Lobby** | `br_groups` | A lobby roster; groups in the same stage run **in parallel** and do **not** merge in v1 |
| **Round / Game** | `br_rounds` | One match; this **is** the match (no separate match entity) |
| **Competing unit** | `team_id` in results | Team or solo player depending on mode |
| **Result** | `br_round_results` | One unit's placement + kills for one round |

**Lobby count for a stage:**

```
G = capacity > 0 ? ceil(entrants / capacity) : 1
```

If `capacity` is null, the stage is a **single merged lobby** (1 group).

---

## 2. Config resolution (hybrid model)

Every field resolves with this precedence:

```
stage override (if set) → tournament default → game catalog default
```

Implement `resolveStageBRConfig(tournament, stage, game)` in `src/utils/brConfigResolve.ts`. All UI and API scoring/advancement logic must call this helper.

### 2.1 Tournament defaults (`tournament.settings`)

```jsonc
{
  "brScoringPreset": "algs",
  "brCustomScoring": null,
  "brKillCap": 6,
  "brTiebreaker": "most_wins",
  "brDefaultLobbySize": 20,
  "brDefaultGameCount": 6,
  "brDefaultMapMode": "none"
}
```

### 2.2 Per-stage overrides (`tournament_stages.config.br`)

```jsonc
{
  "br": {
    "scoring": { "presetKey": "fncs", "custom": null, "killCap": 3 },
    "gameCount": 8,
    "advancement": {
      "mode": "top_n_per_group",
      "perGroup": 10,
      "overall": 16
    },
    "map": {
      "mode": "per_round",
      "pool": ["Erangel", "Miramar"],
      "fixedMap": null
    }
  }
}
```

Also keep existing columns authoritative:
- `capacity` = lobby size in competing units
- `advancement_count` = legacy per-group cutoff; sync with `config.br.advancement.perGroup` when mode is `top_n_per_group`

---

## 3. Scoring

**Lean v1:** tournament-wide preset from `tournament.settings` only (backend + frontend aligned).

**Backend parity:** per-stage override via `stage.config.br.scoring` resolved by `BattleRoyaleConfigResolver` / `resolveStageBRConfig()`.

**Single source of truth (frontend preview):** `src/utils/brScoring.ts` — `calculateBRPoints(placement, kills, preset, killCap)`.

- **Placement points:** `preset.placements[placement - 1]`; out of range = 0
- **Kill points:** `min(kills, killCap) * preset.killPoints`; `killCap = null` = unlimited
- **Round total:** placement + kill points
- **Group standing:** sum across completed rounds in that group

### Tiebreakers

| Rule | Order |
|------|-------|
| `most_wins` | more 1st-place finishes → more kills → better (lower) average placement |
| `most_kills` | more kills → more wins → better average placement |
| `head_to_head` | better (lower) average placement → more wins → more kills |

---

## 4. Map system (backend parity — not lean v1)

### Catalog defaults

| Game | `hasMaps` | Pool |
|------|-----------|------|
| Apex | `true` | Kings Canyon, World's Edge, Olympus, Storm Point, Broken Moon, E-District |
| PUBG | `true` | Erangel, Miramar, Sanhok, Karakin, Paramo, Taego, Deston, Vikendi, Rondo |
| Fortnite | `false` | `[]` |

### Map modes (per stage)

| Mode | Behavior |
|------|----------|
| `none` | No map; forced when `hasMaps = false` |
| `fixed_stage` | One map for all rounds in the stage |
| `per_round` | Organizer picks map per round |
| `rotation` | Auto: `pool[(round_number - 1) % pool.length]` |

Add nullable `map` to `br_rounds`.

---

## 5. Round / match settings (v1)

Each round: `round_number`, `lobby_code`, `map`, schedule, queue timer, `status` (`pending → active → completed`).

- Best-of-1 always
- `active` requires `lobby_code` (+ `map` when mode = `per_round`)
- `completed` requires evidence reviewed; locks results

---

## 6. Progression & advancement (v1)

### Within a stage

Parallel groups, independent leaderboards, roster locks after first round.

### Between stages

| Mode | Tier | Rule |
|------|------|------|
| `top_n_per_group` | **Lean v1** | Top `perGroup` from each group |
| `top_n_overall` | **Backend parity / v2** | Top `overall` from merged standings — deferred until backend supports it |

```
POST /api/stages/{stageId}/br/advance?preview=true|false
Body: { mode, perGroup?, overall? }
```

---

## 7. Out of scope for v1

- PUBG rotating pairwise group-vs-group (AB / BC / AC)
- Wildcard slots, points-threshold advancement
- Circuit carry-over, advantage points, Survival/Winners stages
- Player map voting / veto
- Legacy JSON BR path changes

---

## 8. Implementation order

1. **Lean v1:** preserve stage config on saves; hide maps / `top_n_overall`; align scoring preview with `calculateBRPoints`
2. **Backend parity:** `BattleRoyaleConfigResolver`, stage-aware scoring, tiebreaker sorting, `br_rounds.map`
3. **Frontend parity:** re-enable map + per-stage config UI (`BR_FEATURE_FLAGS.mapsEnabled`)
4. **V2:** `brPresets.ts`, game-specific templates, PUBG group-vs-group last

---

# V2 Appendix — Game-Specific Presets

v2 adds **templates that pre-fill v1 config**. No new core entities.

## V2-A. Preset registry

`src/config/brPresets.ts` with presets like `generic_single_lobby`, `pubg_pcs_group_stage`, `apex_algs_qualifier`, `fortnite_fncs_heats`.

## V2-B. PUBG group-vs-group

Seed groups A/B/C merge on schedule (AB, BC, AC) into shared lobbies with **one global stage leaderboard**. Implemented via:

```jsonc
{
  "br": {
    "lobbyFormation": {
      "mode": "rotating_pairwise",
      "seedGroups": ["A", "B", "C"],
      "matchupSchedule": ["AB", "BC", "AC"],
      "matchesPerMatchup": 6,
      "leaderboardScope": "stage_global"
    }
  }
}
```

## V2-C. Deferred features

Wildcards, points threshold, auto round generation, circuit seeding, multi-stage esports presets.

---

## AI handoff prompt

> **Task:** Implement Battle Royale v1 per `docs/battle-royale-structure-spec.md`.
>
> **Core model:** Tournament → Stage → Group → Round → Result.
>
> **Requirements:** hybrid config via `resolveStageBRConfig()`, stage-aware scoring, map modes, advancement `top_n_per_group` / `top_n_overall` only. Do NOT build v2 features.
>
> **Start with:** types + `brConfigResolve.ts` → catalog maps → round `map` → scoring → advancement → UI.
