---
description: "Esportra harness integration — routes tasks to the correct skill, agent, and project guideline"
alwaysApply: true
---
# Esportra Harness

This project has **55 curated skills** in `.cursor/skills/`. They are integrated — not optional extras.

## Session start

1. Read `.cursor/skills/esportra/SKILL.md` for architecture and routing
2. For features, follow `project-guidelines/IMPLEMENTATION_GUIDE.md` (7 phases)
3. Activate the specific skill from [harness-map.md](../skills/esportra/references/harness-map.md) before implementing

## Task → skill routing

| Task type | Skill(s) | Agent |
|-----------|----------|-------|
| New feature | `esportra`, `blueprint` | planner → tdd-guide |
| DB / migration / RLS | `database-migrations`, `postgres-patterns` | database-reviewer |
| React / hooks / UI | `frontend-patterns`, `design-system` | typescript-reviewer |
| Landing / hero / CTA copy | `brand-voice` + `esportra/references/brand-voice-profile.md` | — |
| About / long-form page | `article-writing`, `brand-voice` | — |
| Social campaign | `content-engine`, `crosspost` | — |
| Pre-commit security | `security-review` | security-reviewer |
| E2E verification | `e2e-testing`, `browser-qa` | e2e-runner |
| .NET desktop | `dotnet-patterns`, `csharp-testing` | csharp-reviewer |
| Build failure | — | build-error-resolver |

## Marketing copy on the website

Site copy files are mapped in `esportra/references/marketing-copy-locations.md`.

For ad copy, headlines, and CTAs:
- **Always** load `esportra/references/brand-voice-profile.md`
- Use `brand-voice` skill for voice consistency
- Use `product-lens` when messaging strategy is unclear
- Use `content-engine` for hooks/angles — then adapt for web (not social verbatim)
- `crosspost`, `x-api`, `investor-outreach` are for **off-site** distribution — not landing page body copy

## Rules stack

| Layer | Files |
|-------|-------|
| Always | `common-*` (9), `esportra-harness`, **`esportra-security`** |
| TypeScript | `typescript-*` (5) |
| C# desktop | `csharp-*` (5) |
| React/marketing UI | `web-*` (7) |
| Architecture | `esportra-architecture` (on `src/`, `supabase/`) |
| Marketing copy | `esportra-marketing` (on landing/hero) |

## Security & architecture (blocking)

| Change | References | Agents |
|--------|------------|--------|
| Migrations / RLS / RPCs | `security-model.md`, `security-gates` Gate C | database-reviewer, security-reviewer |
| Auth / roles / payments | `security-model.md`, Gate D | security-reviewer |
| New hooks / data layer | `architecture.md` | security-reviewer if auth-sensitive |
| Structural / multi-PR | `architecture.md`, ADRs | planner, architect |
| Pre-PR | `security-gates` Gate E | code-reviewer |

Skills: `postgres-patterns`, `database-migrations`, `security-review`, `verification-loop`, `architecture-decision-records`, `blueprint`.

## Do not

- Skip the 7-phase protocol for features
- Invent metrics or sponsor names in copy
- Use skills for unrelated stacks (removed from harness)
- Use `openclaw-persona-forge` for Esportra website copy
