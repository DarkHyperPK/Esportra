# PKR pricing conversion changes

24 October 2026. Implemented locally for review; no commit, push or deployment in this pass.

## Confirmed scope

The user paused regional pricing, retained PKR and excluded Riot API changes. The user explicitly chose immediate invoices using configured payment details, rather than waiting for staff to confirm a standard quote. Pay-from-entry-fees remains unavailable without a gateway.

## Implemented

- Earnings calculator revised after user feedback: independent exact team counts from 2 to 10,000, a keyboard slider starting at 2, eight quick sizes, and a 32-team Free default. Only entry fee and prize share are financial inputs; sponsorship, other-cost inputs and break-even planning are removed. The main figure shows potential organizer earnings at full paid registration, after prizes and the automatically matched Free/Pro pass, before tax and other expenses. Default example: 32 teams × PKR1,000, 60% prize pool, PKR0 pass = PKR12,800 potential earnings. Existing PKR rates are unchanged; custom quotes stay unknown and negative results stay visible. Calculator bookings preserve the exact team count; the separate Pro price selector remains independent.
- All pricing Pro CTAs open the event modal instead of `/contact`. Standard brackets issue a server-priced Pro forma invoice with a server reference and a snapshot of the configured business payee. Custom sizes save a quote request without fabricating an invoice amount.
- Invoice details can be downloaded. An optional QR image uses the configured business asset; no payment QR or bank information is invented. Invoices expire after seven days. Idempotent retries return the original invoice and payee snapshot.
- Payment proof uploads remain private. A separate random capability token is hashed server-side. Only that capability can resume the invoice or submit proof; staff proof reads require the license-view permission. Images are decoded, bounded and re-encoded as JPEG to discard metadata and reject arbitrary files. Proof cannot overwrite an already submitted image.
- An invoice can resume after refresh within the same browser tab. Only the request ID and capability token live in sessionStorage; event/email/bank data is restored from the protected API. The token never appears in the URL or downloaded invoice details.
- Staff can view the paginated request queue and private proofs under Admin → Licenses, with permission checks and an audit trail for request-status changes. Submitted proof does not verify funds or activate a license. Payment reconciliation and event activation remain staff operations; no new payment gateway or automatic capacity grant is claimed.

## Configuration before live use

Apply backend migration `20261024120000_pro_event_requests.sql`. Under **Admin → Settings → Pro Payments**, set the verified seller name, bank/provider, account title, account/IBAN, instructions and optional HTTPS QR image. Enable instant invoicing only after the details and operational fulfillment path are verified.

Settings are intentionally blank and disabled by default. Standard invoice creation returns 503 until the required details are configured. No real bank details were supplied, configured or tested in this session. Staff must verify cleared funds and arrange the purchased capacity and Pro features through the appropriate operational process. The request/proof endpoints do not grant entitlements.

Backend and frontend need coordinated deployment. The previous authorization to push pricing was completed earlier; this pass makes no additional git/deployment claim.

## Verification

- Pricing-only source snapshot: production build and chunk/button/JSX checks, full lint and route-symbol audit pass. This excludes other sessions' untracked homepage and competitive-feature work.
- Previous conversion snapshot: 580 tests in 96 files passed. After the earnings revision, 25 focused tests pass (20 earnings/tier-boundary cases and five booking-hook cases). The revised pricing snapshot passes production build/checks and full lint; the earlier full-suite count is historical.
- Backend Core: 12 price-boundary tests pass. API: 16 tests pass, including eight real PostgreSQL integration cases and eight boundary/manifest cases. Each API attempt used a fresh disposable database. The admin date mapping was corrected after an integration failure; final run passes.
- Migration and production-shaped table-reference linters pass. Backend compiles; four existing fake-DB nullability warnings remain in the test project.
- Browser automation: five updated conversion groups and eight existing pricing interaction groups pass. Calculator checks now cover the Free default/CTA, 2-team keyboard minimum, exact counts, automatic Pro tiers, custom quote through 10,000 teams, deficits, removal of sponsorship/cost fields and transfer of exact counts into booking. Booking checks retain error/retry, private proof, download, recovery and focus behavior. Page/dialog overflow checks cover 320–1920px. Controlled payment fixtures are not live payment/fulfillment evidence.
- Desktop/mobile calculator and invoice screenshots were inspected. Captures: `budget-conversion-desktop.png`, `budget-conversion-mobile.png`, `invoice-conversion-desktop.png`, `invoice-conversion-mobile.png`. Run `node design/pricing/verify-conversion.mjs` with the local preview at port5178.
- Full existing TypeScript check still has unrelated diagnostics, starting in `GroupStageView.tsx`; none were reported in the changed pricing/booking files. Main mixed-checkout build encounters the unrelated untracked homepage `PlatformProgression` Icon symbol; isolated release sources pass.

## Main source paths

Frontend: `src/components/pricing/PricingBudget.tsx`, `PricingBookingDialog.tsx`, `PricingInvoice.tsx`; `src/hooks/useProEventRequest.ts`, `useProEventProof.ts`; `src/components/admin/ProEventRequestQueue.tsx`, `ProEventProofPreview.tsx`; existing admin Settings category and Licenses page.

Backend: `Endpoints/ProEventRequestEndpoints.cs`, `ProEventProofEndpoints.cs`, `ProEventPaymentConfiguration.cs`, `ProEventRequestRules.cs`; Contracts/Licensing request/receipt types; Core/Licensing/EventPassPricing. Routes are registered from the existing EventLicenseEndpoints and added to the authorization manifest. No unrelated dirty Program/Admin/Integration/Competitive sources were changed.

## Remaining limits

Real business configuration, coordinated deployment, live bank reconciliation and final user acceptance are outstanding. This work improves affordability visibility and the booking path; it does not remove the upfront cash requirement or implement entry-fee deductions, automatic disbursement, automated bank verification, refunds or automatic event-capacity fulfillment.
