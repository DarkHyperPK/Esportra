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

These six documents govern all work on this project. Read and follow them:

- **[CODING_GUIDELINES.md](./CODING_GUIDELINES.md)** — Performance (query consolidation, N+1 prevention, pagination), security (RLS, triggers, secrets), migrations, code style, naming, commit messages
- **[UI_STYLE_GUIDE.md](./UI_STYLE_GUIDE.md)** — Dark theme (#050505 base, rose-500 accents), typography (Poppins/Inter), glassmorphism, card patterns, animations (Framer Motion), accessibility (4.5:1 contrast, 44px touch targets, reduced motion)
- **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** — E2E mandate (no UI-only changes), 4-phase protocol (DB+RLS → hooks/types → UI → verify), custom hooks for all data fetching, TanStack Query patterns, storage buckets, realtime subscriptions
- **[UX_GUIDELINES.md](./UX_GUIDELINES.md)** — Navigation, loading/error/empty states, forms, feedback, real-time interactions, tournament flow UX, responsive/mobile, accessibility UX
- **[FEATURES_GUIDELINES.md](./FEATURES_GUIDELINES.md)** — Feature scoping, categories (player/organizer/venue/admin), definition of done, delivery checklist, breaking changes, feature flags
- **[CODE_QUALITY_GUIDELINES.md](./CODE_QUALITY_GUIDELINES.md)** — TypeScript standards, error handling, dependency management, code review checklist, performance budgets, testing, git hygiene, security checklist

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

---

## Related repo: Esportra Desktop Suite

Separate repo at `d:\esportra-desktop` → GitHub: `DarkHyperPK/esportra-desktop`

### Tech stack
- **Desktop shell**: `@overwolf/ow-electron` 37 + React 18 + Vite + Zustand + Tailwind
- **Real-time backend**: ASP.NET Core 9 + SignalR (`apps/signalr-hub/`)
- **Station Agent**: .NET 9 WinForms (`apps/station-agent/EsportraAgent/`)
- **Shared types**: `packages/shared-types/` (TypeScript)
- **Monorepo**: Turborepo

### Phase status
| Phase | Status | Deliverable |
|-------|--------|-------------|
| 0 | ✅ Complete | Monorepo, ow-electron shell, SignalR hub skeleton, shared-types |
| 1 | ✅ Complete | Station Agent: lock screen, keyboard hooks, admin gateway (Ctrl+Shift+A + PIN), SignalR client, WMI health monitoring, tray icon |
| 2 | 🔄 In Progress | Venue Management: real-time station grid (desktop), booking system (web), hub agent registry |
| 3 | Not started | Broadcasting Suite: GEP (CS2+Valorant), HUDs, overlays |
| 4 | Not started | Polish: analytics, auto-updater, NDI, stress testing |

### Commands (desktop repo)
```bash
# Desktop app (ow-electron)
cd d:\esportra-desktop
npm run dev

# SignalR hub
cd apps/signalr-hub/EsportraSignalRHub
dotnet run   # needs appsettings.Development.json

# Station agent
cd apps/station-agent/EsportraAgent
dotnet run   # Windows only — needs appsettings.local.json with AccessToken
```

### Key rules (desktop)
- **No CS2 integration** until explicitly requested — it is parked
- Agent auth: 1-year JWT generated via SignalR `GenerateAgentToken` hub method (not HTTP — avoids CORS). Requires an authenticated admin WS connection.
- Agent config: `appsettings.json` (template, committed) + `appsettings.local.json` (gitignored, has real token + AdminPin)
- `appsettings.Development.json` (hub) and `appsettings.local.json` (agent) are gitignored — never commit secrets
- Supabase JWT issuer: self-hosted staging omits `iss` claim — set `"JwtIssuer": ""` in `appsettings.Development.json` to disable issuer validation
- Supabase JWT audience: `authenticated`
- **SignalR connection**: lifted to `StationHubProvider` in `Layout.tsx` — connection persists across page navigation. Never put `useStationHub` inside a page component or the connection will drop on unmount.
- **Hub agent registry**: in-memory `ConcurrentDictionary<string, AgentInfo>` in `StationHub.cs`. New admins receive `CurrentAgents` snapshot on connect. Registry is process-scoped (cleared on hub restart).
- Admin gateway: `Ctrl+Shift+A` on lock screen toggles PIN panel. Tray exit also requires PIN via `AdminPinDialog`. Default PIN is `"0000"` — always change via `appsettings.local.json`.

### Key desktop files
```
apps/desktop/src/renderer/
  contexts/StationHubContext.tsx   # SignalR connection provider (mount at Layout)
  pages/Venue.tsx                  # Real-time station grid, lock/unlock/extend controls
  pages/Settings.tsx               # Hub config + GenerateAgentToken via SignalR
  components/Layout.tsx            # Wraps app with StationHubProvider

apps/signalr-hub/EsportraSignalRHub/
  Hubs/StationHub.cs               # All hub methods + agent registry + CurrentAgents

apps/station-agent/EsportraAgent/
  Forms/LockScreenForm.cs          # Ctrl+Shift+A admin panel
  Forms/AdminPinDialog.cs          # PIN gate for tray exit
  AgentApplicationContext.cs       # Tray icon + lifecycle
  Models/AgentConfig.cs            # HubUrl, StationId, VenueId, AccessToken, AdminPin
```

### Web platform — booking system
- `src/hooks/useVenueBooking.ts` — custom hook for booking flow; NO payments table insert (table doesn't exist); graceful availability check via `maybeSingle`
- `src/components/VenueBooking.tsx` — booking dialog, uses `UseVenueBookingProps`
- `src/pages/venues/VenueDetails.tsx` — Book Now button restored; derives `pricePerHour` from `venue.price_per_hour` or parses `price_range` string
