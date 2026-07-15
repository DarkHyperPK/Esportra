# Esportra Harness Map — 55 Skills

Read `.cursor/skills/esportra/SKILL.md` first. Activate the listed skill before doing the work.

## Tier 0 — Project (always)

| Skill | When |
|-------|------|
| **esportra** | Any Esportra task — architecture, routing, copy locations |
| `project-guidelines/*` | Authoritative product rules (CODING, UI, IMPLEMENTATION, UX) |

**55 skills total** (including `esportra`; replaced `project-guidelines-example`).

## Feature development (7-phase protocol)

| Phase | Skills | Agents |
|-------|--------|--------|
| 1–4 Discovery & plan | `blueprint`, `product-lens`, `architecture-decision-records` | **planner**, **architect** |
| 5 Backend | `database-migrations`, `postgres-patterns`, `api-design`, `security-review` | **database-reviewer**, **security-reviewer** |
| 6 Frontend | `frontend-patterns`, `design-system`, `backend-patterns` | **typescript-reviewer** |
| 7 Verify | `e2e-testing`, `browser-qa`, `verification-loop` | **e2e-runner** |
| After code | `coding-standards`, `tdd-workflow` | **tdd-guide**, **code-reviewer** |
| Pre-PR security | `security-gates` (esportra ref), `verification-loop` | **security-reviewer** |
| Build broken | — | **build-error-resolver** |

## Architecture & security (always enforce)

| Concern | References / skills | Agents |
|---------|---------------------|--------|
| Layer boundaries | `esportra/references/architecture.md`, `frontend-patterns` | architect |
| RLS / migrations | `postgres-patterns`, `database-migrations` | database-reviewer |
| Auth / input / payments | `security-review`, `security-model.md` | security-reviewer |
| Pre-PR gates | `security-gates.md`, `verification-loop` | code-reviewer |
| ADRs | `architecture-decision-records`, `docs/architecture/decisions/` | planner |
| Multi-PR plans | `blueprint` | planner |
| Harness config audit | `security-scan` | — |


| Skill | Use for |
|-------|---------|
| `brand-voice` | All site copy — load `references/brand-voice-profile.md` |
| `article-writing` | About, blog, long-form pages |
| `product-lens` | Validate messaging before shipping copy-heavy features |
| `content-engine` | Hooks, CTAs, campaign angles (adapt for web vs social) |
| `prompt-optimizer` | Improve prompts for copy/marketing tasks |

## Social & distribution (not website body copy)

| Skill | Use for |
|-------|---------|
| `crosspost` | X, LinkedIn, Threads, Bluesky variants |
| `x-api` | Pull/post X content when API available |
| `social-graph-ranker` | Audience/graph analysis for distribution |
| `deep-research` / `exa-search` | Research before campaigns or positioning |

## Fundraising & B2B (not public website)

| Skill | Use for |
|-------|---------|
| `investor-materials` | Decks, one-pagers |
| `investor-outreach` | Cold/warm investor email |
| `lead-intelligence` | Prospect research + outreach drafts |
| `market-research` | TAM, competitors, category analysis |

## Media production

| Skill | Use for |
|-------|---------|
| `fal-ai-media` | AI image/audio generation |
| `remotion-video-creation` | Programmatic promo videos |
| `video-editing` / `videodb` | Video pipeline workflows |
| `frontend-slides` | Slide decks / presentations |

## Desktop suite (.NET)

| Skill | Use for |
|-------|---------|
| `dotnet-patterns` | SignalR hub, Station Agent |
| `csharp-testing` | xUnit / integration tests |

## Ops & infra

| Skill | Use for |
|-------|---------|
| `deployment-patterns` | Coolify, GitHub Actions |
| `docker-patterns` | Container config |
| `git-workflow` | Commits, PRs |

## Harness meta

| Skill | Use for |
|-------|---------|
| `configure-ecc` | Tune installed harness |
| `agent-harness-construction` | Extend agent/skill setup |
| `agent-eval` / `eval-harness` | Measure agent quality |
| `agentic-engineering` | Agent-first workflows |
| `context-budget` | Long session context management |
| `skill-stocktake` | Audit skill usage |
| `rules-distill` | Compress rules from codebase patterns |
| `search-first` | Search before implementing |
| `documentation-lookup` | External API/docs lookup |
| `codebase-onboarding` | New contributor orientation |
| `security-scan` | Automated security checks |

## Not for Esportra website ad copy

`openclaw-persona-forge` — OpenClaw agent persona design only; skip for Esportra marketing.
