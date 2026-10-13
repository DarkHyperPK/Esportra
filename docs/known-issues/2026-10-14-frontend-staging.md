# Frontend findings for the Air staging rehearsal

Logged on 14 October 2026 at the user's request. These findings are not fixes or proof of a staging incident. The Air integration remains subject to a real staging rehearsal.

## FE-061-01 — Bracket type contracts disagree

Status: open; static-check finding, no reproduced user-facing failure.

The strict TypeScript check reports incompatible team/match definitions between shared bracket types, GroupStageView, SwissView and MatchCard, including optional seeds, null teams and callback score fields. MatchCard already renders missing teams as TBD/BYE, missing scores as a dash and missing seeds without a badge. A diagnostic about a required score field does not prove that stored scores are missing or incorrect.

User impact: no confirmed visible defect from these diagnostics. The mismatched contracts make bracket rendering and organizer actions harder to verify. Rehearse pending matches, byes, group/Swiss brackets, score saving and match-room navigation before classifying a runtime defect.

Evidence: `src/types/bracketTypes.ts`, `src/components/bracket/GroupStageView.tsx`, `src/components/bracket/SwissView.tsx`, `src/pages/tournaments/brackets/MatchCard.tsx`; `npx tsc --noEmit --pretty false` fails in these contracts.

Next action: reconcile the shared contract with actual API data and test the bracket actions. Do not invent scores or teams to suppress the diagnostics.

## FE-061-02 — Payment Review requests unsupported button variants

Status: open; concrete render failure identified in source, not yet reproduced in a browser.

PaymentManagement passes default, outline and destructive to CommandButton. CommandButton supports primary, secondary, ghost, danger, success and warning; it indexes the variant and immediately accesses styles.base/styles.text without a fallback. Rendering an unsupported variant throws.

User impact: the organizer's Payment Review screen can fail to render, preventing payment filtering and approval/rejection controls. This finding does not establish lost payments or a payment-processing failure.

Evidence: `src/components/organizer/PaymentManagement.tsx`, `src/components/management/CommandSurface.tsx`; the strict TypeScript check flags the unsupported variants.

Next action: map the Payment Review buttons to supported variants and verify rendering, filtering and approval/rejection interactions.

## FE-061-03 — Captain match room can dereference a missing active match

Status: open; conditional render failure identified in source, not yet reproduced in a browser.

The showCheckinCard calculation reads activeMatch.team2 and activeMatch.status when agreedScheduledTime is truthy. activeMatch can be null, and the calculation runs before the page's loading guard. A retained/available scheduled time with a missing active match can therefore throw.

User impact: a player can see a page error instead of match-room check-in and controls during a missing/transitional match state. This does not prove every match room fails.

Evidence: `src/pages/tournaments/CaptainMatchPage.tsx`, showCheckinCard calculation; the strict TypeScript check reports possibly null activeMatch accesses.

Next action: guard the missing match before dereferencing it and verify loading, removed/completed match and scheduled check-in states.

## Test configuration

The user's next validation is a local Esportra Air app connected to the staging backend and staging frontend. Signing and production release are separate work. Air defaults to `https://api-staging.esportra.com`; the organizer controls require the newly deployed tournament Broadcast entry and backend endpoints.
