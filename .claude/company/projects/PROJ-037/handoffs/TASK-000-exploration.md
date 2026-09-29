# TASK-000 — Codebase Exploration: Prize Pool / Entry Fee / Payout Flow

## Backend Prize/Payout Endpoints (PrizeDistributionEndpoints.cs)
- GET/PUT/DELETE `/api/tournaments/{id}/prize-distribution` — full distribution config
- GET `/api/tournaments/{id}/prize-distribution/templates` — format-aware templates
- GET/POST `/api/tournaments/{id}/placements` — live standings + lock placements
- GET/PUT `/api/tournaments/{id}/reward-distributions` — non-cash reward fulfillment
- GET `/api/tournaments/{id}/payouts` — cash payout rows
- PUT `/api/tournaments/{id}/payouts/{payoutId}` — status transitions

Tournament CRUD (TournamentEndpoints.cs) handles: `entry_fee`, `prize_pool`, `payment_instructions`, `payout_method`, `manual_payout_notes`, `currency`

Payment participant endpoints: `approve-payment`, `reject-payment`, `receipt`

## DB Schema
**tournaments**: `prize_pool`, `entry_fee`, `currency`, `prize_distribution` (JSONB), `payment_instructions` (TEXT), `payout_method` CHECK ('gateway','manual'), `manual_payout_notes`

**tournament_participants**: `payment_status` (pending/approved/rejected/not_required), `payment_receipt_url`, `payment_rejection_reason`, `entry_fee_amount`, `entry_fee_paid`

**tournament_placements**: placement, prize_amount, prize_rewards JSONB, is_tied, resolved_at

**tournament_reward_distributions**: placement, reward_index, reward_title, reward_type, status (pending/distributed/claimed/cancelled)

**tournament_cash_payouts**: amount, currency, payment_method, manual_payment_notes, status enum (requested/approved/rejected/paid/failed), gateway_reference

## Frontend Files
- `src/components/organizer/tournament-manage/panels/PrizePayoutsPanel.tsx` — main organizer config panel
- `src/components/organizer/PrizeDistributionTab.tsx` — read-only payout record view embedded in PrizePayoutsPanel
- `src/components/organizer/PaymentManagement.tsx` — entry fee payment approval/rejection (payments tab)
- `src/components/tournament/wizard/StepPrizeDistribution.tsx` — creation wizard step
- `src/components/organizer/tournament-manage/panels/ParticipantsPanel.tsx` — participants grid only (no list view)

## Critical Bugs Found

### BUG-1: Payout method value mismatch (BLOCKING)
PrizePayoutsPanel sends `payout_method: 'escrow'` but DB CHECK constraint only allows `'gateway' | 'manual'`. Selecting "Platform Escrow" causes a DB constraint violation. Wizard correctly uses 'gateway'.

### BUG-2: Field name mismatch in TournamentPayoutsResponse (BLOCKING)
`/src/types/prizeDistribution.ts` defines `payment_method` but API returns `payout_method`. `PrizeDistributionTab` checks `payoutsData?.payment_method === 'gateway'` — always `undefined` → always false. Gateway banner never shows; action buttons always render on gateway tournaments.

### BUG-3: payment_instructions visibility inconsistency
Wizard shows textarea only when `isPaidEntry`. PrizePayoutsPanel shows it always. Should be consistent (show only when entry_fee > 0).

### BUG-4: Ambiguous label in PrizeDistributionTab
`manual_payout_notes` is displayed under "Payment Instructions" label — actually these are winner payout instructions, not entry fee payment instructions. Confusing.

### BUG-5: No payment status in participants grid
OrganizerTeamCard never surfaces `payment_status` or `entry_fee_paid`. Organizers can't see who hasn't paid without leaving participants tab.

## Text Sizing Pattern
- Form labels: `text-xs font-bold uppercase`
- Helper text: `text-xs text-zinc-500`
- Body text: `text-sm text-zinc-300`
- Table cells: `text-sm`
- Section eyebrows: `font-mono text-[9px]` (very small)
- PrizeDistributionTab uses `text-lg` headings — inconsistent with command-surface pattern

## Participants Panel
- Card grid only (1–4 columns responsive), 24/page, OrganizerTeamCard (flip card)
- No list/table view toggle
- No payment status displayed on cards

## payment_instructions Current State
- DB column exists, backend wired, wizard shows it, PrizePayoutsPanel has textarea
- The FIELD EXISTS — the CEO said it's "missing" — likely means either: (a) not visible in the panel UI at the right moment, or (b) not shown to participants during registration in a clear enough way
