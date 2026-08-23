# Esportra Marketing Copy — File Map

Use this when editing website ad copy, hero text, CTAs, or landing narrative.

## Landing page (`src/pages/Index.tsx`)

Composed from:

| File | Copy type |
|------|-----------|
| `src/components/HeroSection.tsx` | Hero H1, primary CTAs (`Jack In`, `Host Tournament`) |
| `src/components/landing/FeaturesSection.tsx` | Role tabs, feature intros, capability bullets |
| `src/components/landing/TheManifesto.tsx` | Problem/solution narrative, player journey steps |
| `src/components/landing/PlatformPromise.tsx` | Trust pillars (transparency, integrity, verified path) |
| `src/components/landing/BrandShowcase.tsx` | Brand/partner presentation |
| `src/components/landing/VenueShowcase.tsx` | Venue booking value prop |
| `src/components/landing/SupportedGames.tsx` | Supported titles, arena CTA |
| `src/components/landing/TheHeartbeat.tsx` | Community/activity framing |
| `src/components/landing/Roadmap.tsx` | Product direction copy |
| `src/components/landing/LogoTicker.tsx` | Partner/game logos (minimal text) |

## Other marketing surfaces

| File | Copy type |
|------|-----------|
| `src/pages/About.tsx` | Company story, mission, CTA sections |
| `src/pages/Partners.tsx` | Sponsor cards, taglines, CTA text |
| `src/components/Footer.tsx` | Nav labels, legal links |
| `src/components/BetaNoticeBanner.tsx` | Beta messaging |
| `src/components/ui/JackButton.tsx` | Platform signature CTA component |
| `src/components/ui/button-variants.ts` | Button size labels (`hero` size for primary CTAs) |

## Admin-managed marketing copy

| Location | Fields |
|----------|--------|
| `src/pages/admin/tools/SponsorManagement.tsx` | `tagline`, `cta_text` per sponsor |

## Skills to use by task

| Task | Skills |
|------|--------|
| Rewrite hero/landing headline | `brand-voice`, `product-lens`, `liquid-glass-design` |
| New landing section | `brand-voice`, `design-system`, `web-design-quality` |
| About/Partners long copy | `article-writing`, `brand-voice` |
| Feature tab intros | `brand-voice`, `product-lens` |
| Social posts from launch | `content-engine` → `crosspost` |
| Pitch deck / investors | `investor-materials`, `investor-outreach` (not website) |
| Competitive positioning | `market-research`, `deep-research` |
| Promo video script | `content-engine`, `remotion-video-creation` |

## UI constraints (do not break)

- Dark base `#050505` / `#0a0a0a`, rose-500 accents on key emphasis
- `font-heading` (Poppins) for headlines
- Framer Motion entrance animations already wired — copy changes only, unless layout requested
- See `project-guidelines/UI_STYLE_GUIDE.md` for full visual system
