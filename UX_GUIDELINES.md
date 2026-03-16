# Esportra UX Guidelines

> **Version 1.0** — Last Updated: March 2026
> Rules for how the platform should feel, not just how it looks.

---

## Table of Contents
1. [Core UX Principles](#1-core-ux-principles)
2. [Navigation & Routing](#2-navigation--routing)
3. [Loading States](#3-loading-states)
4. [Error Handling UX](#4-error-handling-ux)
5. [Empty States](#5-empty-states)
6. [Forms & Input](#6-forms--input)
7. [Feedback & Notifications](#7-feedback--notifications)
8. [Real-time Interactions](#8-real-time-interactions)
9. [Tournament Flow UX](#9-tournament-flow-ux)
10. [Responsive & Mobile](#10-responsive--mobile)
11. [Accessibility UX](#11-accessibility-ux)
12. [Rules](#12-rules)

---

## 1. Core UX Principles

| Principle | What It Means |
|-----------|--------------|
| **No dead ends** | Every page must have a clear next action. If the user can't do anything, tell them why and what to do instead. |
| **Instant feedback** | Every user action gets a visible response within 100ms. Button press → loading spinner. Form submit → toast. |
| **Progressive disclosure** | Don't dump everything on screen at once. Show the essentials, let users drill down for detail. |
| **Recover gracefully** | Assume things will break. Network drops, expired sessions, stale data. Handle all of it without a blank screen. |
| **Respect the context** | A player mid-match cares about different things than an organizer setting up a tournament. UI adapts to role and state. |

---

## 2. Navigation & Routing

### Page hierarchy
```
Home
├── Tournaments (browse, search, filter)
│   └── Tournament Details (bracket, matches, schedule)
│       └── Match Details (veto, scores, disputes)
├── Teams (browse, manage)
│   └── Team Profile
├── Venues (browse, book)
│   └── Venue Details (availability, booking flow)
├── Player Profile
│   ├── My Tournaments
│   ├── My Teams
│   ├── My Disputes
│   └── Settings
├── Organizer Dashboard
│   ├── Tournament Wizard (create/edit)
│   ├── Match Management
│   └── Disputes
└── Admin Panel
    ├── Dashboard (stats)
    ├── Users / Tournaments / Venues
    ├── Dispute Center
    └── Audit Logs
```

### Rules
- **Breadcrumbs** on every page deeper than level 1. Users must always know where they are.
- **Back navigation** must always work. Never break the browser back button with programmatic redirects that skip history entries.
- **Deep links** must work. Every tournament, match, team, and venue has a shareable URL. If someone pastes a link, it loads the right page — not a redirect to the homepage.
- **Role-based routes**: If a player hits `/admin/dashboard`, redirect to `/` with a toast: "You don't have access to that page." Don't show a blank 403.
- **Auth-gated routes**: If an unauthenticated user hits a protected page, redirect to `/sign-in` with a `returnTo` parameter so they land back where they wanted after login.

### Navigation transitions
- Use Framer Motion `AnimatePresence` for page transitions.
- Keep transitions under 300ms. Users shouldn't wait for animations.
- Never animate on back navigation — it feels slow.

---

## 3. Loading States

### The rule: always show something

A blank white (or black) screen with no indicator is unacceptable. The user should never wonder "is it loading or is it broken?"

### Patterns by context

| Context | Pattern | Example |
|---------|---------|---------|
| **Full page load** | Skeleton screen matching the layout | Tournament details page with skeleton cards |
| **Data refresh** | Keep stale data visible, show subtle spinner | Bracket refreshing after a match update |
| **Button action** | Disable button + show spinner inside it | "Register" → spinner → "Registered" |
| **List loading more** | Spinner at bottom of list | Infinite scroll on tournament browse |
| **Background operation** | Toast with progress | File upload: "Uploading banner... 45%" |

### Skeleton screens
- Match the layout of the real content. A skeleton for a tournament card should be the same size and shape as the real card.
- Use the `animate-shimmer` class from the UI style guide.
- Never show skeletons for more than 3 seconds without additional feedback. If loading takes longer, show a "Still loading..." message.

### TanStack Query loading
```typescript
// Use isLoading for initial load, isFetching for background refresh
const { data, isLoading, isFetching } = useQuery(/* ... */);

// Show skeleton on first load
if (isLoading) return <TournamentSkeleton />;

// Show data immediately, subtle refresh indicator for background fetch
return (
  <div>
    {isFetching && <RefreshIndicator />}
    <TournamentContent data={data} />
  </div>
);
```

---

## 4. Error Handling UX

### The rule: never show a blank page or a raw error

Every error state needs three things:
1. **What happened** — in plain language
2. **Why** — if the user can understand the cause
3. **What to do** — a clear action (retry, go back, contact support)

### Error patterns

| Error Type | UX Treatment |
|-----------|-------------|
| **Network failure** | Banner at top: "Connection lost. Reconnecting..." with auto-retry |
| **401 Unauthorized** | Redirect to sign-in with returnTo parameter |
| **403 Forbidden** | Show "You don't have permission" with a link to go back |
| **404 Not Found** | Show "This page doesn't exist" with search and home links |
| **Form validation** | Inline red text under the specific field |
| **Server error (500)** | "Something went wrong on our end. Try again in a moment." + retry button |
| **Rate limited** | "Too many requests. Please wait a moment." — disable the action temporarily |

### Error boundaries
- Wrap every route-level page in a React Error Boundary.
- The fallback UI shows a message and a "Refresh" button, not a blank screen.
- Log the error to the console with full stack trace for debugging.

### Toast error messages
```typescript
// BAD — tells the user nothing useful
toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' });

// GOOD — tells the user what happened and what to do
toast({ title: 'Registration failed', description: 'This tournament is full. Join the waitlist instead.', variant: 'destructive' });
```

---

## 5. Empty States

### The rule: empty is not blank

Every list, table, and content area must have a designed empty state.

### Pattern
```
┌─────────────────────────────────┐
│                                 │
│        [Relevant Icon]          │
│                                 │
│    No tournaments yet           │   ← What's empty
│                                 │
│    Create your first tournament │   ← What to do about it
│    to get started.              │
│                                 │
│    [ Create Tournament ]        │   ← Primary action
│                                 │
└─────────────────────────────────┘
```

### Empty state rules
| Context | Message | Action |
|---------|---------|--------|
| My Tournaments (player) | "You haven't joined any tournaments yet." | "Browse Tournaments" button |
| My Teams | "You're not on any teams." | "Create a Team" button |
| My Disputes | "No disputes filed." | No action needed — this is good |
| Organizer Tournaments | "You haven't created any tournaments." | "Create Tournament" button |
| Search results | "No results for '{query}'." | Suggest removing filters or broadening search |
| Admin audit logs | "No activity recorded." | No action |
| Tournament participants | "No teams registered yet." | Share link to invite teams |

---

## 6. Forms & Input

### Validation
- **Validate on blur**, not on every keystroke. Typing into a field that's already screaming red is annoying.
- **Validate on submit** as a safety net. Even if blur validation passed, re-validate everything before sending.
- **Show errors inline**, directly below the field. Don't use a separate error summary at the top unless the form is very long.
- **Use Zod schemas** for validation. Define them once in `src/schemas/`, reuse them in forms and API handlers.

### Form patterns
| Pattern | When to Use |
|---------|-------------|
| **Single-page form** | Simple operations (sign in, create team, file dispute) |
| **Multi-step wizard** | Complex flows (tournament creation, venue booking) |
| **Inline edit** | Quick updates (profile bio, team name) |
| **Dialog form** | Secondary actions that don't warrant a full page (invite player, change role) |

### Multi-step wizards (Tournament Wizard)
- Show a progress indicator (steps 1/4, 2/4, etc.).
- Allow going back to previous steps without losing data.
- Validate each step before allowing progression to the next.
- Save draft state so users can come back later.
- Final step is always a review/confirmation screen.

### Autosave
- For long forms (tournament setup), autosave draft state to localStorage every 30 seconds.
- Show a subtle "Draft saved" indicator.
- On page reload, prompt: "You have an unsaved draft. Resume or discard?"

### Disabled vs hidden
- **Disable** a control when the user can see why it's unavailable (e.g., "Register" disabled with tooltip "Registration closes in 2 hours").
- **Hide** a control when the user has no business knowing it exists (e.g., admin-only actions for regular users).

---

## 7. Feedback & Notifications

### Toast notifications
| Type | Duration | Use Case |
|------|----------|----------|
| **Success** | 3 seconds, auto-dismiss | "Team created", "Registered for tournament" |
| **Error** | Persistent until dismissed | "Registration failed: tournament is full" |
| **Warning** | 5 seconds | "Your session expires in 5 minutes" |
| **Info** | 4 seconds | "Match schedule updated" |

### Rules
- One toast at a time. If a new toast fires while one is showing, replace it.
- Never use toasts for information the user didn't ask for. If data loaded successfully, that's normal — don't toast about it.
- Destructive actions (leave team, cancel registration) require a confirmation dialog, not just a toast.

### Confirmation dialogs
Use for irreversible or high-impact actions:
- Leaving a team
- Canceling a tournament registration
- Deleting a tournament (organizer)
- Banning a user (admin)
- Resolving a dispute

Pattern:
```
┌─────────────────────────────────────┐
│  Leave Team?                        │
│                                     │
│  You'll lose access to all team     │
│  tournaments and matches. This      │
│  can't be undone.                   │
│                                     │
│  [ Cancel ]  [ Leave Team ]         │
│               ^^^^^^^^^ red/danger  │
└─────────────────────────────────────┘
```

### Real-time notifications
- Bell icon in navbar with unread count badge.
- Notifications panel shows most recent 20, paginated.
- Click a notification to navigate to the relevant page (match, tournament, dispute).
- Mark as read on click. "Mark all as read" option.

---

## 8. Real-time Interactions

### Where real-time matters
| Feature | Update Frequency | UX Treatment |
|---------|-----------------|--------------|
| **Match scores** | Per round | Animate score change, flash highlight |
| **Map veto** | Per action | Show pick/ban in real-time, disable stale buttons |
| **Tournament bracket** | Per match result | Animate team advancement |
| **Check-in countdown** | Per second | Live timer, pulse when < 60s |
| **Station grid** (desktop) | Per heartbeat | Green/red status dots, live health metrics |

### Rules
- **Optimistic updates** for actions the user takes themselves (veto pick, score report). Show the change immediately, roll back if the server rejects it.
- **Server-authoritative updates** for actions by other users. Wait for the Supabase realtime event before showing changes.
- **Conflict resolution**: If the user is looking at stale data and tries to act on it, show a toast: "This was already updated. Refreshing..." and invalidate the query.
- **Connection loss**: Show a banner "Reconnecting..." and auto-retry. Don't let the user submit actions while disconnected.

### Veto UX (Map Ban/Pick)
- Show whose turn it is clearly. Highlight the active team.
- Disable all buttons for the team that isn't picking.
- Show a countdown timer per pick (if configured).
- Animate banned maps with a strikethrough/fade effect.
- Picked maps highlight with the team's color.

---

## 9. Tournament Flow UX

### The lifecycle a player sees
```
Browse → Register → Check-in → Play Matches → View Results
```

### Each stage has specific UX requirements

**Browse & Register**
- Filter by game, format, region, date, entry fee.
- Tournament card shows: game, date, format, team size, spots remaining.
- "Register" button shows remaining spots. When 90% full, show "X spots left!" urgently.
- After registering, redirect to "My Tournaments" with a success toast.

**Check-in**
- Show check-in window time prominently.
- Push notification (browser) when check-in opens.
- Countdown timer on the tournament page.
- If not checked in and window is closing: red warning banner.
- After check-in closes, show who checked in and who didn't.

**Match Play**
- Show bracket with the user's next match highlighted.
- "Your match is ready" notification.
- Match page shows: opponent, map veto (if applicable), score reporting.
- Score submission requires both teams to agree (or admin override).

**Results**
- Bracket shows final placements.
- Player profile shows tournament history with results.
- Organizer gets a summary (participation rate, disputes filed, completion time).

---

## 10. Responsive & Mobile

### Breakpoints
| Breakpoint | Width | Context |
|-----------|-------|---------|
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large screens |

### Mobile-first rules
- **Touch targets**: minimum 44x44px. No tiny buttons or links.
- **Swipe gestures**: Don't rely on them as the only way to do something. Always provide a tap alternative.
- **Bottom navigation**: On mobile, critical nav moves to the bottom of the screen. Thumbs shouldn't have to reach the top.
- **Tables**: On mobile, collapse tables into card stacks. Don't use horizontal scroll for data tables.
- **Modals**: On mobile, modals become full-screen sheets that slide up from the bottom.

### Capacitor (native app) considerations
- Use `safe-area-inset-*` for iOS notch/home indicator.
- Test touch interactions — hover effects don't exist on mobile.
- Deep links must work from push notifications.
- Back button on Android must navigate correctly (not close the app).

---

## 11. Accessibility UX

### Beyond WCAG compliance
- **Keyboard navigation**: Every interactive element is reachable via Tab. Every action is triggerable via Enter or Space.
- **Focus management**: When a modal opens, focus moves to it. When it closes, focus returns to the trigger element.
- **Screen readers**: Dynamic content updates (new notification, score change) are announced via `aria-live` regions.
- **Color is not the only indicator**: Don't rely solely on red/green to convey status. Add icons or text labels.
- **Reduced motion**: Respect `prefers-reduced-motion`. All Framer Motion animations must check this and fall back to instant transitions.

### Focus trapping
- Modals and dialogs trap focus inside them (shadcn/ui handles this via Radix).
- Dropdown menus trap focus and close on Escape.
- The Tab key should never send focus to invisible elements behind a modal.

---

## 12. Rules

These are non-negotiable. Violating any of these is a bug.

1. **No blank loading screens.** Every page shows a skeleton or spinner while data loads.
2. **No silent errors.** If something fails, the user sees a message explaining what happened.
3. **No dead-end pages.** Every page has a way forward or a way back.
4. **No broken back button.** Browser navigation must always work.
5. **No unprotected destructive actions.** Delete, leave, cancel, ban — all require confirmation.
6. **No role-specific UI leaking.** Players never see admin controls. Organizers never see other organizers' data.
7. **No horizontal scroll on mobile** (except code blocks or bracket views).
8. **No actions without feedback.** Button click → visual response within 100ms.
9. **No toasts for routine success.** Don't toast "Data loaded successfully." Only toast when the user explicitly did something.
10. **No walls of text.** If an explanation needs more than 2 sentences, use progressive disclosure (expand/collapse, tooltip, or "Learn more" link).

---

## Related Documents
- [UI Style Guide](./UI_STYLE_GUIDE.md) — Visual design system
- [Implementation Guide](./IMPLEMENTATION_GUIDE.md) — E2E development protocol
- [Coding Guidelines](./CODING_GUIDELINES.md) — Code standards
- [Features Guidelines](./FEATURES_GUIDELINES.md) — Feature scoping and delivery
- [Code Quality Guidelines](./CODE_QUALITY_GUIDELINES.md) — Quality standards
