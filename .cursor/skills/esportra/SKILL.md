---
name: esportra
description: Master project skill for Esportra — architecture, 7-phase implementation protocol, harness routing, and marketing copy locations. Read this first for any task in this repo.
---

# Esportra — Project Skill

Esports tournament management and venue booking. React 18 + TypeScript + Vite + Supabase.

## When to Activate

**Always** at session start or when the task touches this repo. This skill routes to the right harness skill, agent, and project guideline.

## Authority order

1. `project-guidelines/` — product rules (CODING, IMPLEMENTATION, UI, UX, FEATURES)
2. This skill — routing and Esportra-specific context
3. `.cursor/skills/*` — specialized workflows
4. `.cursor/rules/*` — always-on conventions
5. `CLAUDE.md` — quick reference

## Architecture

```
src/
  components/   # UI (landing/ for marketing copy)
  hooks/        # All data fetching — no raw Supabase in components
  pages/        # Routes
  types/        # TS interfaces
  lib/          # supabase client, utilities
supabase/
  migrations/   # One concern per migration, auto-deploy on main
```

**Stack**: TanStack Query, React Hook Form + Zod, Tailwind + shadcn/ui, Framer Motion, Capacitor mobile.

**Desktop** (separate repo `esportra-desktop`): ow-electron + SignalR + .NET Station Agent — use `dotnet-patterns`, `csharp-testing`.

## 7-phase protocol (mandatory for features)

From `project-guidelines/IMPLEMENTATION_GUIDE.md`:

| Phase | Output | Harness |
|-------|--------|---------|
| 1 Discovery | Answered questions | `product-lens`, **planner** |
| 2 Interaction map | Actor/action diagram | **planner** |
| 3 Edge cases | Finalized list | **planner** |
| 4 Plan | File-level task list | **planner**, `blueprint` |
| 5 Backend | Migrations + RLS + RPCs | `database-migrations`, `postgres-patterns`, **database-reviewer** |
| 6 Frontend | Hooks + types + UI | `frontend-patterns`, `design-system` |
| 7 Verify | E2E proof | `e2e-testing`, `browser-qa`, **e2e-runner** |

No UI-only features unless explicitly prototyping.

## Harness routing

Full map: [references/harness-map.md](references/harness-map.md)

Quick picks:

| You're doing… | Read skill |
|---------------|------------|
| SQL / RLS / migration | `postgres-patterns`, `database-migrations` |
| React component / hook | `frontend-patterns` |
| Landing / hero / CTA copy | `brand-voice` + [brand-voice-profile.md](references/brand-voice-profile.md) |
| Where copy lives in code | [marketing-copy-locations.md](references/marketing-copy-locations.md) |
| Social from a launch | `content-engine` → `crosspost` |
| Security before commit | `security-review` + **security-reviewer** |
| UI polish | `liquid-glass-design`, `UI_STYLE_GUIDE.md` |

## Marketing copy workflow

1. Load [brand-voice-profile.md](references/brand-voice-profile.md)
2. Find target file in [marketing-copy-locations.md](references/marketing-copy-locations.md)
3. Read existing copy in that component — match rhythm and weight
4. Draft with `brand-voice` bans enforced
5. Visual check against `UI_STYLE_GUIDE.md` and `web-design-quality` rule

## Agents (ECC — `D:\ECC-1.10.0\agents\`)

| Agent | Trigger |
|-------|---------|
| planner | Complex features |
| tdd-guide | New logic / bug fixes |
| code-reviewer | After code changes |
| security-reviewer | Auth, RLS, payments |
| database-reviewer | Migrations, queries |
| build-error-resolver | Build/type failures |
| e2e-runner | Critical user flows |
| architect | Cross-cutting design |
| typescript-reviewer | Deep TS/React refactors |

## Critical rules

- TypeScript only in `src/`
- Data through hooks in `src/hooks/` — never raw Supabase in components
- Every table: RLS default deny
- Paginate with `.limit()`, consolidate queries (RPCs over N+1)
- Conventional commits, `npm run build` before push

## Architecture & security (mandatory)

| Reference | Purpose |
|-----------|---------|
| [architecture.md](references/architecture.md) | Layers, folders, data-flow boundaries |
| [security-model.md](references/security-model.md) | Defense-in-depth, RLS, protected triggers |
| [security-gates.md](references/security-gates.md) | Pre-commit/PR gates by change type |
| `docs/architecture/decisions/` | ADRs for significant decisions |

**Security is blocking.** Migrations and auth changes require **database-reviewer** + **security-reviewer** before merge. Never weaken RLS or existing triggers.

Rules auto-apply: `esportra-security` (always), `esportra-architecture` (on `src/` + `supabase/`).

## Related skills

Replace `project-guidelines-example` — that was a generic template; this is the live project skill.
