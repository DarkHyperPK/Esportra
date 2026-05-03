# Season System Enhancements & End-to-End Flow

This document outlines the end-to-end flow of the season system, identifies current gaps, and details the implementation plan to make seasons self-contained packages.

---

## What IS a Season?

A Season is an **organizational wrapper** that ties multiple individual tournaments together into one competitive circuit. It does NOT have its own matches, brackets, or match rooms. All actual gameplay happens inside the individual linked tournaments.

Think of it like:
- **Season** = Premier League (the overall competition)
- **Season Nodes** = Match Day 1, Match Day 2, Playoffs, etc.
- **Linked Tournaments** = The actual events with brackets, match rooms, registrations

### Example Setup: Pakistan Valorant Circuit (4 Regions)

```
Season: "Pakistan Valorant Circuit"
├── Sindh Qualifier         → linked to Tournament "Sindh Open Q1"
│   └── Sindh Finals        → linked to Tournament "Sindh Regional Finals"
├── Punjab Qualifier        → linked to Tournament "Punjab Open Q1"
│   └── Punjab Finals       → linked to Tournament "Punjab Regional Finals"
├── KPK Qualifier           → linked to Tournament "KPK Open Q1"
│   └── KPK Finals          → linked to Tournament "KPK Regional Finals"
├── Islamabad Qualifier     → linked to Tournament "Islamabad Open Q1"
│   └── Islamabad Finals    → linked to Tournament "Islamabad Regional Finals"
└── Grand Finals            → linked to Tournament "Pakistan Grand Finals"
```

That's **9 separate tournaments**, each with their own brackets, registrations, and match rooms.

---

## Current Identified Gaps (Quality Updates needed)

1. **No Season Discovery Page**: There's no `/seasons` browse page for players to discover seasons (like the tournament discovery page).
2. **Manual Tournament Creation Burden**: Currently, creating a season requires making empty nodes, then manually creating 9 tournaments, then manually linking them. This is terrible UX.
3. **No Auto-Registration for Qualified Teams**: When a team qualifies, they still need to manually register for the next tournament.
4. **Points Rules UX is Confusing**: The current rule builder uses raw fields (source node, placement from/to, points). It needs pre-built templates per game and a simpler visual UX.
5. **No Tournament → Season Linkage Visibility**: You can only link from Season → Tournament, but players cannot discover "this tournament is part of Season X" from the tournament page.
6. **Season Public Page Needs Work**: The `/seasons/:slug` page is very basic. It needs a rich UI with bracket visualization, qualification tracking, and team journeys.
7. **Staff Roles Not Enforced**: Season staff roles exist (Co-organizer, Admin) but aren't strictly enforced for permissions yet.

---

## Action Plan: Self-Contained Seasons (Auto-Generate Tournaments)

Based on the goal to provide an efficient, modular, and easy-to-access system, we will implement an "Auto-Generate Tournaments" feature. A season should feel like a package deal.

### 1. Structure Tab: "Generate Tournaments" Flow
- **Explicit Control**: Add a **"Generate Unlinked Tournaments"** button at the top of the Season Structure tab. This allows the organizer to tweak the tree first before generating everything.
- **Action**: When clicked, it will iterate through all unlinked nodes.
- **Client-Side Orchestration**:
  1. For each node, it will call `POST /api/tournaments` using defaults from the season (game, mode) and the node (region, name).
  2. **Format defaults**: Qualifiers = Swiss/Round Robin, Events = Single Elimination, Finals = Double Elimination.
  3. Collect the created tournament IDs and update the nodes to link them.
- **Progress UI**: Show a loading state/progress bar as the tournaments are created.

### 2. Node Cards & Separate Tournament Pages
- **Convenience**: Generated tournaments will live on their own pages for modularity and detailed bracket management (`/organizer/tournaments/:id`).
- **Quick Access**: The season workspace will act as the command center. Once a node is linked to a tournament, its card will display:
  - A status badge (e.g., Draft, Open, Live, Completed).
  - A quick "Manage Tournament" link button that opens the specific tournament in a new tab.

### 3. Points Rules: Auto-Registration Toggle
- To solve the manual registration gap, we will add an option to the advancement rules.
- When creating an advancement rule (e.g., "Top 2 qualify to Finals"), organizers will see a toggle: `[x] Auto-register qualified participants to destination stage`.
- The platform will provide the option, but the organizer has the final say on how they want to run it.

---

## Implementation Steps (Next Phase)

1. Create a `useGenerateTournaments` hook that orchestrates the API calls.
2. Update `SeasonBuilderCanvas` to include the "Generate Unlinked Tournaments" button.
3. Update `SeasonBuilderNode` cards to show the external link and tournament status.
4. Add the Auto-register toggle to the Points Rules schema and UI.
