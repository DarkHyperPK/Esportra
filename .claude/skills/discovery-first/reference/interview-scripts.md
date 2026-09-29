# Interview scripts by role

Each script is a structured way to find your unknowns. Run the **explore** list first (never ask what you can find), then walk the question themes, keep only what changes the work, and package 3-5 questions (see `question-craft.md`). Scripts are guides, not questionnaires to paste.

Every script uses the same running example so roles can compare notes: **"Captains keep missing check-in. Add reminders and a proper check-in page."**

---

## Creative Lead / UI/UX Designer

**Explore first:** current UI of the area (screenshots at both widths), the design log, the Direction Contracts of neighbouring surfaces, the kit components available, analytics or support notes if any.

| Theme | Questions | Usually |
|---|---|---|
| Audience & moment | Who exactly, where, on what device, under what pressure? | BLOCKING |
| The one takeaway | What must they know in three seconds? | BLOCKING |
| After | What should they do or feel afterwards? | SHAPING |
| Surfaces & formats | Product only, or also push/email/social/venue? | BLOCKING |
| Latitude | Core product (L0) or room to express (L1-L3)? Any co-brand? | SHAPING |
| Fixed elements | Partner logos, legal copy, names, existing links that must keep working | BLOCKING if present |
| Assets | Real photos/crests available, or type only? | SHAPING |
| Failure | What would make this a failure to you? Any past piece loved/hated? | SHAPING |

*Example block (check-in):*
```
### Q1 [BLOCKING] Is the check-in page mainly used on phones during Discord calls?
- Why it matters: decides phone-first layout and sticky thumb-reach action.
- Options: A (Recommended) Yes, phone-first · B Desktop-first · C Equal
- Default: A
### Q2 [SHAPING] Should captains see which teammates are online?
- Why it matters: adds a roster list with live presence (needs SignalR).
- Options: A (Recommended) Yes, read-only list · B No, just the button
- Default: A
```

## CMO

**Explore first:** previous announcements, competitor messaging, the voice guide, partner agreements.

| Theme | Questions | Usually |
|---|---|---|
| Segment | Which segment and market (city, language)? | BLOCKING |
| The shift | What do they believe/do today → after? | SHAPING |
| Proof | What claims and numbers can we use (with permission)? | BLOCKING for claims |
| Volume | Silent, in-product, owned channels, or campaign? | SHAPING |
| Partners | Anyone else's brand involved? Who leads? | BLOCKING if yes |
| Timing | Tied to an event or season? | SHAPING |

## CPO

**Explore first:** the existing feature, support tickets, analytics, previous proposals.

| Theme | Questions | Usually |
|---|---|---|
| Problem owner | Whose problem, today's workaround and cost | BLOCKING |
| Success | Which behaviour change, measured how | SHAPING |
| Scope | Smallest version that proves value; explicitly out | BLOCKING |
| Rules | Business rules that aren't written down (who may check in, until when) | BLOCKING |
| Edge states | Zero, thousands, late changes, cancellations | SHAPING |

## CTO / Architect

**Explore first:** affected layers (migrations, RLS, RPCs, hooks, services, pages, backend endpoints, SignalR hubs), canonical patterns, prior decisions.

| Theme | Questions | Usually |
|---|---|---|
| Canonical pattern | Two patterns exist - which is canonical? | BLOCKING if they conflict |
| Realtime | Needed, or refetch acceptable? | SHAPING |
| Contracts | Desktop agent, mobile, public API consumers affected? | BLOCKING if yes |
| Rollout | Flag, cohort, all at once? | SHAPING |
| Failure UX | What does the user see when X fails? | SHAPING |

## CFO

**Explore first:** payment flows and triggers, running cost of similar features, pricing.

Questions: money movement and risk owner (BLOCKING) · new running costs at 10× volume (SHAPING) · refunds/chargebacks/tax (BLOCKING when money moves) · cheaper path meeting the same criteria (SHAPING).

## COO

**Explore first:** who operates similar features today, support volume, game-day incidents.

Questions: two readings of the objective? (BLOCKING) · who runs it day to day (SHAPING) · new manual steps (SHAPING) · game-day failure plan (BLOCKING for live features).

## CIO / Security QA

**Explore first:** RLS policies, RPC checks, storage policies, protected areas list in `CLAUDE.md`.

Questions: intended authorization per role (BLOCKING if undefined) · data sensitivity and retention (BLOCKING for PII/money) · abuse limits (SHAPING) · audit logging requirements (SHAPING).

## Database / Backend engineers

**Explore first:** migrations, policies, triggers, existing endpoints and DTOs, the hooks that call them.

Questions: row ownership and who may write (BLOCKING) · existing data to backfill (BLOCKING) · uniqueness/immutability rules (SHAPING) · contract shape and error semantics (SHAPING) · idempotency needs (SHAPING).

## Frontend engineer

**Explore first:** the brief, UX spec, Direction Contract, kit, similar pages, hooks and services.

Questions: spec gaps in any state or breakpoint (BLOCKING - never fill with taste) · data availability (BLOCKING) · save/sync model (SHAPING) · routes/links that must keep working (BLOCKING if any).

## QA roles

**Explore first:** acceptance criteria, specs, contracts, hand-offs.

Questions: untestable or ambiguous criteria (BLOCKING) · environments and test accounts per role (BLOCKING) · performance budgets (SHAPING) · known accepted limitations (SHAPING).

## DevOps

**Explore first:** CI config, env vars, deploy scripts, migration order.

Questions: target branch/environment (BLOCKING - default `staging`) · new env vars or secrets (BLOCKING) · deploy window vs live events (SHAPING) · rollback expectations (SHAPING).
