---
name: root-cause-diagnosis
description: Multi-angle root-cause diagnosis protocol — understand the intended workflow, trace the full data path (frontend -> API -> database -> back), audit every assumption with evidence, distinguish defects from intended behavior, and validate fixes across every layer before applying them.
---

# Root-Cause Diagnosis Skill

Never pattern-match a symptom to a fix. Find the actual root cause and prove it from multiple angles before touching code.

## When to Use

- User reports a bug, regression, error, or unexpected behavior
- User asks why something fails or behaves a certain way
- Reviewing a change for correctness (adversarial review of your own or others' work)
- Investigating an incident or intermittent failure

**Do not use** for pure informational questions or feature builds with no reported defect — but keep the layer checklists in mind while building.

## Core Principles

### Feature Intent First
Know how the feature is *supposed* to work before judging how it works. Read docs, commit history, tests, and PRs for intent. If the behavior could be a deliberate guard or limit, ask the user instead of declaring a bug.

### Zero Unverified Assumptions
Every hypothesis rests on assumptions. Enumerate them, then confirm or disprove each with code, a repro, or a query. Unverifiable assumptions make the finding conditional — label it as such.

### Trace the Whole Round Trip
A defect is often visible at a different layer than where the data first goes wrong. Trace frontend → API → database → response → re-render.

### Root Cause ≠ Symptom Location
Find where the data first diverges from what should happen. Fixing the symptom without the divergence point is a band-aid.

### Fix = Validated From Every Angle
A fix must hold for the frontend rendering path, the API contract, the DB schema, and the feature intent — and must not break edges the current code already handles.

### Scope Discipline
Fix only genuine correctness/security defects or gaps that block intended behavior. Report adjacent findings separately, without editing them.

### Ask Before Assuming
When the symptom, environment, or expected behavior is ambiguous, ask the user — a wrong diagnosis costs more than a clarifying question.

## Protocol

### 1. Clarify the Symptom
Ask what the user did, what they expected, what they saw, which environment and role, whether it reproduces every time, and whether the behavior might be intended.

### 2. Establish the Intended Workflow
Walk the happy path end-to-end. Read the surrounding code, not just the reported lines. Write down the expected behavior explicitly.

### 3. Trace the Full Data Path
Follow the actual transformation at each layer (see checklist below). Capture exact inputs and outputs at each hop: parsing, validation, normalization, transactions, retries, column types, triggers, defaults, timezones.

### 4. Hypothesis Ledger & Assumption Audit
List every candidate root cause, write the assumptions each rests on, and confirm or disprove each with evidence. If a layer is unreachable (e.g., no backend locally), mark the finding conditional — never assume what that layer does.

### 5. Reproduce With the Smallest Concrete Steps
Reproduce before fixing; capture exact inputs and observed outputs. Prefer an offline harness for isolatable logic (date math, validators, formatters). Never mutate shared/live environments without explicit permission.

### 6. Locate the Root Cause
Identify the first hop where data diverges from the expected workflow. That is the root cause; downstream is where the bug merely becomes visible. Check whether the divergence is a defect or intended workflow before committing to a fix.

### 7. Validate the Fix From Every Angle
Run each candidate fix through the fix validation matrix. Prefer the smallest change that restores intended behavior everywhere.

### 8. Verify and Close
Re-run the original repro, run the project's typecheck and relevant tests, and verify RLS-sensitive behavior as the affected role. State what you checked per layer, the root cause with evidence, what you changed, and what you deliberately did not change.

## Layer Checklist

### Frontend (React/TS)
- Component state: derived, mirrored, or duplicated? Can it drift from server truth?
- Effects: complete dependencies, cleanup, ordering, races, stale closures, StrictMode double-invocation, in-flight guards.
- Validation: does it accept values the rest of the stack can't handle (and vice versa)?
- Payload and response: exact formats, timezones, null vs empty, re-render behavior.

### API Layer (.NET / endpoints)
- Parsing strictness and invalid-input handling.
- Normalization: stored exactly as sent, or transformed?
- Transactions: per-request atomicity — what happens on partial failure?
- Client retries: on which status codes, with what side effects?
- Error responses: accurate, or do they overstate/understate what happened?

### Database (Supabase/Postgres)
- Column types (timestamptz vs timestamp), precision, defaults.
- Constraints, triggers, RLS: anything that transforms or rejects values — does the affected role have the access the feature assumes?
- Check both migrations and runtime-managed schema.

### Cross-Cutting
- Timezone round-trips (input → storage → display), DST gaps, seconds precision.
- Idempotency: what happens if the same operation runs twice?
- Empty/null vs zero-value semantics at every boundary.

## Defect vs Intended Workflow

Before labeling anything a bug, ask: is there a guard, limit, or constraint that is *supposed* to produce this behavior? Does a test, commit message, or PR document it as intended? Would "fixing" it break a documented workflow? When in doubt, present the analysis and ask — do not silently "fix" intended behavior.

## Fix Validation Matrix

For each candidate fix, check: the frontend paths reading this state (including edges the current code handles), the API contract (change authorized or not), DB compatibility (schema, constraints, triggers, RLS), feature intent (no more, no less than intended), and failure modes (partial failure, retry, double-click, stale data, invalid input).

## Final Report Template

1. **Symptom** — what the user reported, in their terms.
2. **What I checked** — per layer, with evidence (code paths read, repros run, queries).
3. **Root cause** — the first hop where data diverged, with the proof.
4. **Fix** — what changed, why it is correct from every angle, what it intentionally does not change.
5. **Out-of-scope findings** — adjacent issues, reported without editing.
6. **Open questions** — anything unverified (e.g., a layer you could not reach).

## Anti-Patterns

- **Pattern-matching**: "I've seen this before, so the fix is X." Symptoms repeat; root causes rarely do.
- **Blaming the last change**: the regression may be recent, but the defect may be older and merely exposed.
- **Single-layer analysis**: concluding from the frontend alone when the value is transformed at the API or DB.
- **Unverified assumptions**: "the backend normalizes this", "this effect refetches" — without reading the code.
- **Fixing the symptom**: patching where the bug is visible instead of where the data diverges.
- **Scope creep**: hardening unrelated code while fixing a bug.
- **Silently "fixing" intended behavior**: changing a deliberate guard because it looked wrong.
- **Skipping verification**: fixing without re-running the repro, typecheck, and tests.
