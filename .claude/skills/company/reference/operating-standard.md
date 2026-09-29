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
