# Pricing staging release

Scope: the current pricing page, PKR earnings calculator, event booking/invoice/private-proof UI and related admin request queue/payment settings. Existing active imagery and brand direction are retained. Homepage and competitive experiments are excluded.

The page preserves existing Free and per-event Organizer Pro plans and prices. The calculator supports exact counts from 2 to 10,000, defaults to 32 teams on Free, and shows full-registration potential after the prize pool and matched pass. Sponsorship/overhead controls and break-even planning are removed. Calculator booking retains the exact team count.

Pricing Pro actions open the event booking dialog. Standard events require the new backend request/invoice/proof endpoints and the Pro Payments settings from migration 20261024120000_pro_event_requests.sql. Configure verified seller/payee details before enabling instant invoices. The backend implementation is outside this frontend-only release; until deployed/configured, invoice creation is unavailable and the form reports the API error. Proof submission never verifies funds or grants Pro automatically. No gateway, entry-fee deduction or recurring subscription was introduced.

## Local checks

Run `npm run build`, `npm run lint` and `npm run check:app-routes` against a checkout containing the release files. Asset provenance is in `public/pricing/ASSETS.md`.

For the actual-component, signed-out preview:

1. Run `design\pricing\preview.bat`.
2. Run `node design/pricing/verify-v9.mjs` and `node design/pricing/verify-conversion.mjs` from the repository root.

The browser checks cover synchronized prices, comparison filtering, keyboard FAQs, modal focus and dismissal, game routes, responsive overflow, the hosting-experience switch, reduced motion and emulated touch. They save local screenshots and `interaction-checks-v9.json`; these generated outputs are not release inputs.

The fixture supplies an auth context and does not prove full-app API, authentication or payment integration. Staging deployment health must be checked separately after the push.
