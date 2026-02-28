# Esportra

Esports tournament management and venue booking platform built with React, TypeScript, Vite, and Supabase.

## Tech stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui (Radix primitives) + Framer Motion
- **State/Data**: TanStack React Query + React Hook Form + Zod
- **Backend**: Supabase (Postgres, Auth, Storage, Edge Functions, RLS)
- **Deployment**: Coolify (frontend), GitHub Actions (DB migrations + Edge Functions)
- **Mobile**: Capacitor (Android/iOS)

## Project structure

```
src/
  components/   # React components
  contexts/     # React context providers
  hooks/        # Custom hooks
  pages/        # Route-level page components
  types/        # TypeScript interfaces/types
  services/     # API/service layer
  lib/          # Utilities (supabase client, etc.)
  config/       # App configuration
  schemas/      # Zod validation schemas
  utils/        # Helper functions
supabase/
  migrations/   # SQL migration files (auto-deployed to prod on push to main)
```

## Commands

- `npm run dev` — Start dev server
- `npm run build` — Production build (always run before pushing)
- `npm run lint` — ESLint
- `npm run preview` — Preview production build
- `npx vitest` — Run tests
- `supabase db diff -f <name>` — Generate migration from local DB changes

## Mandatory guidelines

These four documents govern all work on this project. Read and follow them:

- **[CODING_GUIDELINES.md](./CODING_GUIDELINES.md)** — Performance (query consolidation, N+1 prevention, pagination), security (RLS, triggers, secrets), migrations, code style, naming, commit messages
- **[UI_STYLE_GUIDE.md](./UI_STYLE_GUIDE.md)** — Dark theme (#050505 base, rose-500 accents), typography (Poppins/Inter), glassmorphism, card patterns, animations (Framer Motion), accessibility (4.5:1 contrast, 44px touch targets, reduced motion)
- **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** — E2E mandate (no UI-only changes), 4-phase protocol (DB+RLS → hooks/types → UI → verify), custom hooks for all data fetching, TanStack Query patterns, storage buckets, realtime subscriptions
- **[DEPLOYMENT_WORKFLOW.md](./DEPLOYMENT_WORKFLOW.md)** — Three deploy systems (Coolify frontend, GH Actions migrations, GH Actions Edge Functions), always `npm run build` before pushing, secrets in GitHub Secrets only

## Key rules (summary)

- **TypeScript only** in `src/`. No `.js` files.
- **E2E implementation** — every feature needs backend (schema + RLS) → logic (hooks + types) → UI → verification.
- **No raw Supabase calls in components** — always through custom hooks in `src/hooks/`.
- **Conventional commits**: `fix:`, `feat:`, `chore:`, `docs:` — first line under 72 chars.
- **Database**: Consolidate queries (use RPCs), use Supabase joins (no N+1), always paginate with `.limit()`.
- **Security**: Every table gets RLS (default deny). Admin ops through `SECURITY DEFINER` RPCs. Never weaken existing security triggers/policies.
- **Migrations**: Via `supabase db diff`. Never edit production DB directly. One migration per concern.
- **Components**: One per file, filename matches component name. Show error states visibly.
- **UI**: Dark base, rose accents, glassmorphism, Framer Motion animations, accessible.
- **Naming**: DB columns `snake_case`, TS `camelCase`, React components `PascalCase`.

## Branches

- `main` — production (auto-deploys frontend, DB, and Edge Functions)
- `staging` — staging environment
