<!-- esportra-canonical: company-v2 -->
# Company operating standard

Every agent in the company follows this standard. Role files add to it; they never contradict it.

---

## 1. Understand first, then build

Every agent runs `discovery-first` before analysis, design or implementation. The work of every role has two halves:

1. **Understanding phase** - receive, explore, restate, sort facts/assumptions/unknowns, ask, confirm.
2. **Implementation phase** - plan, build, verify.

You may not enter the implementation phase while a BLOCKING unknown is open. Asking good questions is part of the job, not a failure to do it. Every role file lists the questions that most often matter for that role; use them to find your unknowns.

## 2. How questions travel

Subagents cannot talk to the CEO. When you have BLOCKING or SHAPING questions:

1. Complete everything that does not depend on the answers.
2. Return with status `NEEDS_CLARIFICATION` and a `## Questions` block (format in `discovery-first/SKILL.md`).
3. The `/company` orchestrator batches questions from all agents, de-duplicates them, asks the CEO with `AskUserQuestion` (up to 4 per call, options with the recommendation first), writes answers to `clarifications.md`, and re-dispatches you with the answers.

Before asking, read the project's `clarifications.md` and `decisions.md`. Never re-ask a settled question. If new evidence contradicts a recorded answer, raise it as a new BLOCKING question that cites the old answer.

## 3. Statuses

| Status | Meaning |
|---|---|
| `NEEDS_CLARIFICATION` | Blocked on questions only the CEO (or another role) can answer. Questions block attached. |
| `IN_PROGRESS` | Working. |
| `BLOCKED` | Blocked on another task or an external dependency (name it). |
| `HANDOFF` | Work complete and self-verified; hand-off file written. |
| `APPROVED` / `NEEDS_REVISION` | Review verdicts (Creative Lead, QA, CTO audit, executive review). |
| `CHANGE_REQUEST` | Executive review found an unmet requirement or a security issue. |

## 4. Hand-off file

Every task ends with `.claude/company/projects/PROJ-XXX/handoffs/TASK-XXX-<role>.md`:

```markdown
# TASK-XXX - [title]
**Owner:** [role]   **Status:** HANDOFF | NEEDS_CLARIFICATION | BLOCKED   **Date:** [date]

## Understanding
Goal · for whom · success · scope · constraints (as confirmed)

## Answers that shaped this work
Links/rows from clarifications.md, and any assumptions still standing (with defaults)

## What I did
Decisions and why; alternatives rejected

## Output
Files changed/created · artifacts · screenshots

## Verification
Each acceptance criterion → evidence (test, screenshot, query, review)

## Open questions / risks / follow-ups
```

## 5. Skill availability

The Skill Integration Map in `company/SKILL.md` names skills. Some ship in this repo (`discovery-first`, `design-recipe`, `esportra-brand`, `impeccable`, `frontend-design`, `clean-architecture`, `secure-development`, `root-cause-diagnosis`, `webapp-testing`, `theme-factory`, `canvas-design`, `doc-coauthoring`, `internal-comms`, `pdf`, `docx`, `pptx`, `xlsx`, `skill-creator`). Others (`superpowers:*`, `feature-dev:*`, `pr-review-toolkit:*`, motion skills such as `animate`, `review-animations`) come from plugins that may not be installed.

- If a listed skill is available, invoke it at the listed phase.
- If it is not available, **say so in your hand-off** and apply the listed fallback. Never claim to have used a skill you did not load.
- **Never** use `brand-guidelines` for Esportra work (it is Anthropic's brand). Use `esportra-brand`.

## 6. Project context every agent reads first

- `CLAUDE.md` (architecture, layer rules, security non-negotiables, design quality, git workflow)
- The project folder: `proposal.md`, `clarifications.md`, `decisions.md`, `tasks.md`, previous `handoffs/`
- For any visual or copy work: `esportra-brand`, `design-recipe`, and the project's `creative/` folder (brief, direction contract)

## 7. Non-negotiables (from CLAUDE.md, restated because they block)

- Security is blocking. Never weaken RLS, triggers or storage policies to fix a bug. Service role key never in the client.
- Pages compose, components render, hooks own data, services own pure logic, schemas own validation.
- `npm run build` (with checks), lint with zero warnings and tests pass before any commit. Conventional commits. No secrets in diffs.
- Nothing ships to users without the relevant review verdicts (Creative Lead for UI, QA, CTO audit, CIO for security-relevant work).

## 8. Escalation

Escalate (write to `escalations.md`, return `BLOCKED` or `NEEDS_CLARIFICATION`) when: two roles disagree and no rule decides; a requirement conflicts with security, brand invariants or the budget; the brief is broken after two question rounds; or finishing the task would require doing something irreversible that was not approved.

---

## 9. Canonical sources (so nothing overrides the company's rules)

These repo files are the source of truth. Claude Code resolves same-named skills with **personal (`~/.claude/skills`) over project**, so a personal copy can shadow ours. Every canonical file starts with `<!-- esportra-canonical: company-v2 -->`.

| Canonical file | Authority over |
|---|---|
| `.claude/skills/discovery-first/SKILL.md` | How every agent understands and asks |
| `.claude/skills/esportra-brand/SKILL.md` | Brand, tokens, voice (over `brand-guidelines`, `theme-factory` presets) |
| `.claude/skills/design-recipe/SKILL.md` | Creative method and direction choice (over `frontend-design` defaults) |
| `.claude/skills/company/SKILL.md` + this file | Pipeline, statuses, hand-offs |
| `.claude/agents/*.md` | Role definitions (project agents beat user agents) |
| `DESIGN.md`, `PRODUCT.md` (repo root) | Anchors for `impeccable`, derived from the brand skill |

**Rule:** when you load one of these skills and the marker is missing, or its content contradicts this table, read the repo file by path and follow it. Report the shadowing in your hand-off so the CEO can remove the duplicate.

**Order of authority** when sources disagree: CEO answers in `clarifications.md` → `CLAUDE.md` (security and layer rules are blocking) → `esportra-brand` invariants → the project's Direction Contract → `design-recipe` → role file → generic vendored skills (`impeccable`, `frontend-design`, `theme-factory`, …) → personal taste.

## 10. A filled hand-off (example)

```markdown
# TASK-004 - Captain check-in page
**Owner:** senior-frontend-engineer   **Status:** HANDOFF   **Date:** 2026-10-02

## Understanding
Goal: captains stop missing check-in. For: captains on phones in Discord calls, 30 min before start.
Success: check-in completed in one tap; roster presence visible; works at 390 px.
Scope in: /t/:slug/check-in page, reminder deep link. Out: SMS.
Constraints: Broadcast direction (contract CL-003), kit components only, check-in RPC exists.

## Answers that shaped this work
- clarifications.md #2: captain checks in the whole team (not per player)
- clarifications.md #5: show online teammates (read-only)
- Assumption standing: presence via existing SignalR `JoinMatch` group (default; not contradicted)

## What I did
- `useCaptainCheckIn` hook (RPC + invalidates match-checkins, match-room-state)
- `checkInRules.ts` (pure: window open/closed, time left) + 9 tests
- `CheckInPage` composes `PageIntro`, stat tile, roster grid (`StatusPill`), sticky `ActionBar`
- Rejected: countdown animation (contract WILL NOT); per-player check-in (answer #2)

## Output
Files: src/hooks/useCaptainCheckIn.ts, src/services/checkIn/checkInRules.ts (+test), src/pages/tournaments/CheckIn.tsx, src/components/tournament/checkin/*.tsx
Screenshots: .claude/company/projects/PROJ-041/evidence/checkin-{390,1440}-{open,closed,done,error}.png

## Verification
- AC1 one-tap check-in → test `checks in team` + checkin-390-open.png
- AC2 closed window explains why → checkin-390-closed.png
- AC3 error recovery → checkin-390-error.png
- lint 0 warnings · 312 tests pass · build (check:buttons, chunks) pass
- Creative Lead review: APPROVED (CREATIVE-LEAD-REVIEW.md)

## Open questions / risks / follow-ups
- Presence can lag ~5 s on poor mobile data; acceptable per CPO, noted.
```

## 11. A clarification round (example)

Three agents returned `NEEDS_CLARIFICATION`. The orchestrator merged five questions into three decisions and asked:

```
AskUserQuestion:
1. [BLOCKING] Who checks in? header "Check-in"
   - Captain checks in the team (Recommended) - matches current rules; one tap
   - Every player checks in - fairer for rosters, slower on game day
2. [BLOCKING] Reminder channels? header "Channels" (multiSelect)
   - Push at T-30 and T-10 (Recommended)
   - Email at T-30 (Recommended)
   - SMS (≈ PKR 4 each)
3. [SHAPING] Show teammates' presence? header "Presence"
   - Yes, read-only (Recommended) - reassures captains; uses existing SignalR group
   - No
```

Answers recorded:

```markdown
| # | Question | Answer | Asked by | Date | Affects |
|---|---|---|---|---|---|
| 2 | Who checks in? | Captain for the team | CPO, Creative Lead | 2026-09-30 | AC1, UX spec, RPC |
| 3 | Reminder channels | Push T-30/T-10 + email T-30 | CMO, CTO | 2026-09-30 | Notifications task |
| 5 | Presence | Yes, read-only | Creative Lead | 2026-09-30 | UX spec, frontend |
```

Only the CPO and Creative Lead were re-dispatched (their analyses changed); the CFO's was unaffected.
