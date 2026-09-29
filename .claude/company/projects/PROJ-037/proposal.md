# PROPOSAL: PROJ-037 — Prize Pool Flow Audit & Polish

**Created:** 2026-09-28
**Status:** CEO_ACCEPTED

## Objective

Full audit and polish pass on the tournament prize pool and entry fee flows. Three organizer-reported gaps (missing payment instructions visibility, no list view in participants panel, text too small) turned into a wider audit that surfaced 5 blocking bugs, a HIGH security issue (receipt bucket is public), and labeling confusion throughout the payout UI. This project closes every gap in both the organizer journey (create prize pool → approve payments → distribute prizes) and the participant journey (register → pay entry fee → view prize → receive payout).

## Scope

**In scope:**
- BUG-1: Fix `payout_method: 'escrow'` → `'gateway'` in PrizePayoutsPanel (DB constraint violation)
- BUG-2: Fix TypeScript type field `payment_method` → `payout_method` in `TournamentPayoutsResponse` (gateway check always false)
- BUG-3: Gate `payment_instructions` textarea behind `entry_fee > 0` in PrizePayoutsPanel (inconsistent with wizard)
- BUG-4: Rename misleading "Payment Instructions" label → "Prize Payout Method" in PrizeDistributionTab
- BUG-5: Add payment status badge to participants grid cards (pending/approved/rejected)
- GAP-1: Show `payment_instructions` to participants in the registration flow (above receipt upload UI)
- GAP-2: List/grid view toggle in ParticipantsPanel with payment status column in list view
- GAP-3: Text size pass — scale body text and stat values up; preserve intentional design tokens
- SECURITY: Flip receipt bucket (`tournaments.payment.receipts`) from public to private in Supabase; deprecate/remove direct `resolvePaymentReceiptUrl` usage for receipt paths

**Out of scope:**
- At-rest encryption of `payment_instructions` (requires DB migration — deferred; see conflicts section)
- Participants list view sorting/filtering
- Payment gateway integration

## Architecture (CTO Analysis)

All 9 items are frontend-only or Supabase config changes. No DB migrations required — all needed columns exist.

**BUG-1** (S): `PrizePayoutsPanel.tsx` line 36 — change `value: 'escrow'` to `value: 'gateway'` in the `PAYOUT_METHODS` array. One line.

**BUG-2** (S): `src/types/prizeDistribution.ts` — rename `payment_method` → `payout_method` on `TournamentPayoutsResponse`. Update ~5 downstream usages in `PrizeDistributionTab.tsx` (`isGateway` derivation and 3 conditional renders). Full-repo grep for `payment_method` on this type required before commit.

**BUG-3** (S): `PrizePayoutsPanel.tsx` — wrap `payment_instructions` textarea in `{Number(form.entry_fee) > 0 && (...)}`. Same guard for `manual_payout_notes` (currently gated on payout_method=manual only; add `&& Number(form.entry_fee) > 0`).

**BUG-4** (S): `PrizeDistributionTab.tsx` line 150 — rename label text to "Prize Payout Method".

**BUG-5** (S): `ParticipantsPanel.tsx` — extend `renderStatusBadge` prop to emit a second payment pill when `tournament.entry_fee > 0`: amber for `pending`, green for `approved`, red for `rejected`. No changes to `OrganizerTeamCard.tsx` (already accepts `renderStatusBadge` prop).

**GAP-1** (S): `src/components/TournamentRegistration.tsx` — read `tournament.payment_instructions`, render highlighted callout box above receipt upload UI when `!= null && entry_fee > 0`. ~15 lines.

**GAP-2** (M): `ParticipantsPanel.tsx` — add `viewMode: 'grid' | 'list'` state (default `'grid'`). Add `LayoutGrid` / `List` icon toggle in header row. List view renders an inline `<table>` with columns: Team/Player, Members, Status, Payment Status, Registered. Card view unchanged. ~80 lines.

**GAP-3** (S): Targeted text class changes across `PrizeDistributionTab.tsx`, `PrizePayoutsPanel.tsx`, `ParticipantsPanel.tsx`. Body helper text: `text-xs` → `text-sm`. Stat bar values: `text-sm font-bold` → `text-base font-bold`. Table cell values in PrizeDistributionTab: scale to `text-base` on value cells. Keep `font-mono text-[9px]` eyebrows (intentional design language). ~10 targeted class changes.

**SECURITY** (S/infra): Backend `receipt` endpoint already proxies bytes via `apiClient.getBlob` — bucket can be flipped to private in Supabase dashboard with zero backend code changes. Also: deprecate `resolvePaymentReceiptUrl` in `storage.ts` for receipt paths; ensure all receipt access goes through the backend proxy endpoint. Coordinate infra change with deployment.

**Implementation order:** BUG-2 → BUG-1 → BUG-3+BUG-4 → BUG-5+GAP-1 → GAP-2 → GAP-3 → SECURITY (bucket flip on deploy).

## Product Requirements (CPO Analysis)

**User stories:**
1. As an organizer, I can enter bank/PayPal/JazzCash payment instructions when I set an entry fee, so participants know exactly how to pay before registering.
2. As a participant, I can see payment instructions on the registration confirmation screen and in my participant dashboard, so I never have to hunt for them.
3. As an organizer, I can switch the participants panel between card grid and list/table view, so I can quickly scan payment statuses across many registrants.
4. As an organizer, I can see each participant's payment status badge directly in the participants grid without opening their card.
5. As a participant, I can view prize payout instructions after the event, so I know how and when I'll receive my winnings.
6. As an organizer, I can trust that uploaded payment receipts are private and only accessible via time-limited signed URLs.

**Acceptance criteria** (abridged — full list in handoffs):
- AC1-5: payment_instructions shown only when entry_fee > 0 (wizard + panel), shown to participants in registration flow above receipt upload, hidden after approval
- AC6-7: PrizeDistributionTab relabeled "Prize Payout Method" with updated placeholder
- AC8-13: List/grid toggle in participants panel; list has Team, Members, Status, Payment Status, Registered columns; cards default; responsive
- AC14-15: Payment status badge on flip cards in grid view
- AC16-19: Body text minimum text-sm; stat values text-base; no text-[Npx] in prize panels; eyebrows unchanged
- AC20-24: All 5 bugs fixed (verified by save → check DB, check button rendering by payout_method)
- AC25-29: Receipt bucket private; all receipt URLs are signed (TTL ≤ 15 min); direct public URL access returns 403; only organizer or receipt owner can retrieve

## Executive Insights

**Security (CIO):** The prize pool flow carries material financial-data risk this pass must address. The receipt bucket being public is HIGH severity — receipts contain bank transfer screenshots with account numbers and full names accessible to anyone with a URL. The bucket must be private before this ships. The gateway/manual button mismatch (BUG-2) is also HIGH — wrong action buttons on a gateway tournament allow organizers to manually mark payouts as paid without confirming fund receipt, bypassing financial verification. Both must be treated as blocking, not cosmetic. The `payment_instructions` field storing bank account numbers as plain TEXT is a medium-term compliance risk (PCI-DSS, GDPR/PDPA); addressed separately in the conflict below.

**Cost (CFO):** The two blocking bugs carry disproportionate financial data integrity risk. The `'escrow'` value violation could corrupt the `tournament_cash_payouts` ledger (no external ledger to cross-reference — this table is the only source of truth). The field name mismatch can cause manual "mark as paid" buttons to appear on gateway tournaments, creating fraudulent payout records. All changes are frontend/type fixes with no new infrastructure. Estimated 1–2 dev-days. ROI strongly positive given audit trail protection.

## Conflicts Requiring CEO Decision

**CONFLICT-1 — at-rest encryption for `payment_instructions`**

CIO flags that storing bank account numbers / PayPal emails as plain TEXT in `tournaments.payment_instructions` violates the spirit of PCI-DSS and GDPR/PDPA obligations on financial identifiers. Encryption would require a DB migration.

**Option A (recommended):** Defer encryption to a dedicated security sprint. In this PR: document the field as sensitive in code comments, confirm RLS SELECT policy limits `payment_instructions` to organizer + registered participants only, and verify the receipt bucket fix closes the largest exposure surface. Encryption added in a follow-on migration.

**Option B:** Add application-layer AES-256 encryption in this PR. Requires a DB migration (adding `payment_instructions_iv` column or switching to `pgcrypto`). Adds scope but closes the compliance gap now.

Recommendation: Option A. The receipt bucket (currently fully public) is a larger exposure. This PR closes that. Encryption follow-on is lower risk than a migration bundled with UI fixes.

## Agent Assignments
- Senior Frontend Engineer → implement BUG-1 through GAP-3 (all frontend/type changes)
- Creative Lead → review GAP-2 (list view design) and GAP-3 (text sizing) before handoff
- QA Lead → verify all 29 ACs
- Senior Security QA → verify receipt bucket, BUG-2 gateway fix, and access control on payment_instructions
- Senior DevOps Engineer → coordinate Supabase receipt bucket policy flip on deploy

## Risks
- BUG-2 type rename: grep full repo for `TournamentPayoutsResponse.payment_method` usages before commit. CTO confirms only `PrizeDistributionTab.tsx` uses it.
- Receipt bucket flip: audit all call sites of `resolvePaymentReceiptUrl` — any direct usage would 403 post-flip. Backend proxy is already the correct path.
- List view (GAP-2): `DashboardParticipant` type must expose `payment_status` — confirmed referenced in `PaymentManagement.tsx`.
- Text sizing (GAP-3): Changes are targeted classes only. Preserve `font-mono text-[9px]` eyebrows — CPO AC17 proposing to change them is overridden by CTO; they are intentional design language.

## Success Criteria
1. Zero `payout_method` DB constraint violations on save (BUG-1 + BUG-2).
2. Participants with `pending_payment` status can locate payment instructions without leaving the tournament page.
3. All receipt object URLs in the bucket return AccessDenied without a valid signed token.
4. A tournament with 50+ registrants can be scanned for unpaid entries in list view without opening any card.
5. No gateway tournaments show manual "Mark Paid" action buttons.

## Acceptance Criteria (Full List)

AC1: Payment instructions field in wizard shown only when entry_fee > 0.
AC2: Payment instructions field in PrizePayoutsPanel shown only when entry_fee > 0.
AC3: Payment instructions shown to participant in registration flow above receipt upload.
AC4: Payment instructions shown on participant's dashboard when status is pending_payment.
AC5: Payment instructions hidden from participants who are already approved.
AC6: PrizeDistributionTab field relabeled "Prize Payout Method".
AC7: Updated placeholder "How winners will receive their prize (e.g. bank transfer, PayPal, on-site cash)".
AC8: List/grid toggle icons in participants panel header.
AC9: Grid view (flip cards) is default.
AC10: List view renders table: Team/Player, Members, Status, Payment Status, Registered.
AC11: Payment status column badges — approved: green, pending: amber, rejected: red.
AC12: Toggle selection persists for the session.
AC13: List view scrolls horizontally on small viewports.
AC14: Grid view cards show payment status badge (top area).
AC15: Badge colors match list view convention.
AC16: Body text minimum text-sm throughout prize pool panels.
AC17 (revised): Stat bar values scale to text-base; eyebrow tokens unchanged.
AC18: Panel headings use consistent scale; no regression to text-[Npx].
AC19: No hardcoded pixel font sizes remain in PrizeDistributionTab or PrizePayoutsPanel.
AC20: PrizePayoutsPanel sends payout_method 'gateway' (not 'escrow').
AC21: Gateway check uses payout_method field correctly; correct buttons shown.
AC22: payment_instructions textarea hidden when entry_fee is 0 or null.
AC23: Manual_payout_notes relabeled "Prize Payout Method".
AC24: Payment status badge present on participants grid cards.
AC25: Receipt bucket configured as private in Supabase.
AC26: Receipt URLs are short-lived signed URLs (TTL ≤ 15 min), server-side.
AC27: Public URL references replaced with signed URL fetches.
AC28: Expired receipt URL returns 400/403.
AC29: Only organizer or receipt owner can retrieve signed URL.
