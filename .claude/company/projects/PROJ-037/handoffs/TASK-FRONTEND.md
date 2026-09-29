# PROJ-037 Frontend Handoff

**Status:** HANDOFF

---

## Files Changed

### `src/types/prizeDistribution.ts`
- **BUG-2:** Renamed `payment_method` → `payout_method` on `TournamentPayoutsResponse` interface. Correct field name aligns with backend contract and unblocks gateway detection everywhere.

### `src/components/organizer/PrizeDistributionTab.tsx`
- **BUG-2:** Updated `isGateway` derivation: `payoutsData?.payment_method` → `payoutsData?.payout_method`.
- **BUG-4:** Renamed display label "Payment Instructions:" → "Prize Payout Method:" in the manual payouts callout block.
- **GAP-3:** Loading state text `text-sm text-gray-500` → `text-base text-zinc-400` (config loading, payouts loading, empty payout state, empty distribution state). All three `<table className="w-full text-sm">` changed to `text-base` so value cells inherit larger size; `<th>` elements already have explicit `text-xs` overrides and are unaffected.

### `src/components/organizer/tournament-manage/panels/PrizePayoutsPanel.tsx`
- **BUG-1:** `PAYOUT_METHODS` array: `value: 'escrow'` → `value: 'gateway'`.
- **BUG-3:** `payment_instructions` textarea wrapped in `{Number(form.entry_fee) > 0 && (...)}` gate. `manual_payout_notes` condition updated from `form.payout_method === 'manual'` to `form.payout_method === 'manual' && Number(form.entry_fee) > 0`.
- **BUG-4:** `payment_instructions` label changed from "Payment Instructions" → "Prize Payout Method"; textarea placeholder updated to "How winners will receive their prize (e.g. bank transfer, PayPal, on-site cash)".
- **GAP-3:** "Set 0 for free entry." helper `text-xs text-zinc-500` → `text-sm text-zinc-400`. Payout method card description `text-xs leading-relaxed text-zinc-500` → `text-sm leading-relaxed text-zinc-400`.
- **Lint fix:** Added `// eslint-disable-next-line react-hooks/exhaustive-deps` on the form-reset `useEffect` (intentional dep array — pre-existing warning, not introduced by this session).

### `src/components/organizer/tournament-manage/panels/ParticipantsPanel.tsx`
- **BUG-5:** `renderStatusBadge` extended to emit payment status pill when `tournament.entry_fee > 0`: amber "Payment Pending" (pending), emerald "Paid" (approved), red "Payment Rejected" (rejected). When both check-in and payment badges apply, they're wrapped in `<div className="flex flex-wrap gap-1">`.
- **GAP-2:** Added `viewMode: 'grid' | 'list'` state (default `'grid'`). Added `LayoutGrid`/`List` icon imports from lucide-react. Search section updated: Input wrapped in a flex row with two toggle buttons (active: `bg-white/10 text-white`, inactive: `text-zinc-500 hover:text-zinc-300`). List view renders a `<table>` with columns: Team/Player (24px logo + name), Members (parsed from `team_members` JSON or solo=1), Check-in Status, Payment Status (only when `hasFee`), Registered date. Row height `h-12 text-sm`. Table header: `font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500`. Added `getMemberCount` helper. Grid view is unchanged.
- **GAP-3:** Stat bar value spans `text-sm font-bold` → `text-base font-bold` (Registered count, Capacity, Checked In count, Mock Teams count). Pagination range text and "Page X of Y" text `text-xs` → `text-sm`.

### `src/components/TournamentRegistration.tsx`
- **GAP-1:** `paymentInstructions` callout box (already rendered above receipt upload, already gated by `showReceiptUpload` which requires `isPaid`) restyled from plain `bg-[#0a0a0c] border border-white/10` to amber-accented `border border-amber-500/30 bg-amber-500/[0.06]`. Icon and label text changed from `text-zinc-400` to `text-amber-400`. Body text upgraded from `text-zinc-300` to `text-zinc-200` for better contrast. No logic changes — gating was already correct (only shown when entry_fee > 0 via `showReceiptUpload` state).

### `d:/frag-and-book-main/.claude/company/projects/PROJ-037/handoffs/TASK-SECURITY-RECEIPT-BUCKET.md`
- Created per spec: documents the receipt bucket public→private Supabase flip requirement and post-flip audit obligation for `resolvePaymentReceiptUrl` call sites.

---

## Deviations from Plan

None. All items implemented as specified.

---

## Lint Result

```
npx eslint src/types/prizeDistribution.ts src/components/organizer/PrizeDistributionTab.tsx \
  src/components/organizer/tournament-manage/panels/PrizePayoutsPanel.tsx \
  src/components/organizer/tournament-manage/panels/ParticipantsPanel.tsx \
  src/components/TournamentRegistration.tsx --max-warnings=0
```

Exit 0. No errors. No warnings.
