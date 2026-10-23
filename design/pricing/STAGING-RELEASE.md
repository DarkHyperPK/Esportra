# Pricing staging release

Scope: the current pricing page, its components, motion hook and six active images. Homepage experiments and earlier pricing concepts are excluded.

The page preserves existing Free and per-event Organizer Pro plans and prices. Pro is arranged through the contact route; this change adds no payment checkout or backend behavior.

## Local checks

Run `npm run build`, `npm run lint` and `npm run check:app-routes` against a checkout containing the release files. Asset provenance is in `public/pricing/ASSETS.md`.

For the actual-component, signed-out preview:

1. Run `design\pricing\preview.bat`.
2. Run `node design/pricing/verify-v9.mjs` from the repository root.

The browser checks cover synchronized prices, comparison filtering, keyboard FAQs, modal focus and dismissal, game routes, responsive overflow, the hosting-experience switch, reduced motion and emulated touch. They save local screenshots and `interaction-checks-v9.json`; these generated outputs are not release inputs.

The fixture supplies an auth context and does not prove full-app API, authentication or payment integration. Staging deployment health must be checked separately after the push.
