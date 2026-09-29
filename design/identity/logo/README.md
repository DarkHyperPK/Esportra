# Logo files

The Esportra mark is **not** stored in this repo yet. The app loads it from Supabase storage:

```
bucket: system.assets.website
path:   eSportra-Logo/eSPORTRA-white-transparent.png
code:   getWebsiteAssetUrl("eSportra-Logo/eSPORTRA-white-transparent.png")  (src/lib/storage.ts)
```

`public/logo.svg` is the old Vite/React placeholder icon, not the Esportra mark. Never use it as the brand.

## Add the real mark to the dataset

1. Download the exports from the storage bucket (or from the designer's source files).
2. Save them here with these exact names:
   - `esportra-logo-white.png`: white mark on transparent, for dark grounds (≥ 1200 px wide)
   - `esportra-logo-dark.png`: dark (#09090B) mark on transparent, for paper and Daylight
   - optionally `esportra-logo-white.svg` and `esportra-logo-dark.svg` if vector sources exist
3. Rebuild the dataset: `node design/source/build.mjs`

Every board and template that shows a dashed `LOGO` slot will composite the real mark, and `design/manifest.json` records it.

## Rules (proposed until the brand owner confirms)

See `design/identity/logo/usage.png`:
- **Clear space:** the wordmark's cap height (x) on every side.
- **Minimum size:** 24 px high on screens, 20 px absolute minimum; 8 mm in print.
- **Grounds:** white on stage black or panel; dark version on paper.
- **Never:** gradients or tints (including the old violet/blue), rotation, effects, outlines, placing it on rose fills, or redrawing it.
