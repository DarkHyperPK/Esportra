# Season Feature — Phases 1-3 Documentation

> **Feature:** Season System (Tournament Orchestration Layer)
> **Date:** May 5, 2026
> **Status:** Phases 4-6 Complete, Phases 1-3 Documentation

---

## Phase 1: Discovery — Ask the Right Questions

### 1. Scope & Definition

**Q: What exactly does this feature do? What does it NOT do?**

A: A Season is an organizational wrapper that ties multiple individual tournaments together into one competitive circuit. It does NOT have its own matches, brackets, or match rooms. All actual gameplay happens inside the individual linked tournaments.

The feature provides:
- A wizard to create seasons with a planned tournament circuit (nodes)
- A management workspace to structure the season, link tournaments, and configure advancement rules
- A season_tournaments table to track which tournaments belong to a season and their roles
- Advancement connections between tournaments (e.g., "Top 2 from Qualifier advance to Finals")
- Season standings aggregated across all tournaments
- Season audit logs for tracking changes

What it does NOT do:
- Does not host matches directly — matches live in linked tournaments
- Does not auto-create tournaments by default (that's a future enhancement)
- Does not auto-register qualified teams (that's a future enhancement)
- Does not replace the tournament system — it orchestrates it

**Q: Is this a new feature or an extension of something that exists?**

A: This is an extension of the existing tournament system. The season feature builds on top of tournaments, adding a layer of organization. It does not replace tournaments — it links to them.

**Q: What's the minimum viable version vs the full version?**

A: 
- **MVP (Completed):** Create seasons with a node structure, manually link existing tournaments, configure advancement rules, view standings, publish seasons.
- **Full Version (Future):** Auto-generate tournaments from nodes, auto-register qualified teams, season discovery page, rich public season page, enforced staff roles, tournament → season linkage visibility.

---

### 2. Users & Roles

**Q: Who is the primary user of this feature?**

A: The primary user is the **organizer** who creates and manages seasons. They build the tournament circuit, link tournaments, configure advancement rules, and monitor standings.

**Q: Are there secondary users?**

A: Yes:
- **Players:** View public season pages, see standings, track qualification status
- **Season Staff (Co-organizer, Admin):** Help manage the season with delegated permissions
- **System Admin:** Can view and manage all seasons via admin interface

**Q: What permissions does each role need?**

A:
- **Organizer (Owner):** Full CRUD on season, nodes, rules, staff. Can publish, cancel, archive. Can link/unlink tournaments.
- **Co-organizer:** Can edit season structure, nodes, rules. Cannot delete season or revoke owner access.
- **Admin:** Can edit season structure, nodes, rules. Cannot delete season or revoke owner access.
- **Player:** Read-only access to public season data (standings, qualification status, structure). No write access.
- **System Admin:** Full access to all seasons including deletion.

---

### 3. Behavior & Logic

**Q: What are the possible states this feature can be in?**

A: 
- **Season Status:** draft → published → active → completed → archived → cancelled
- **Season Node Status:** draft → scheduled → live → completed → archived
- **Season Tournament Status:** draft → scheduled → live → completed → cancelled
- **Advancement Record Status:** pending → advanced → blocked → removed → manual_override
- **Season Standing Status:** registered → active → qualified → eliminated → champion → disqualified

**Q: What triggers state transitions?**

A:
- **Draft → Published:** Organizer clicks "Publish" in season wizard or management workspace
- **Published → Active:** First linked tournament goes live
- **Active → Completed:** All linked tournaments are completed
- **Any → Archived:** Organizer archives the season
- **Any → Cancelled:** Organizer cancels the season
- **Node Draft → Scheduled:** Node is linked to a tournament
- **Node Scheduled → Live:** Linked tournament goes live
- **Node Live → Completed:** Linked tournament completes

**Q: Is this feature real-time? Does it need live updates?**

A: Partially real-time:
- **Season standings:** Should update in near real-time as tournament results come in (via season_advancement_records and season_standings tables)
- **Qualification status:** Should update when advancement records are created/updated
- **Season structure changes:** Not real-time — organizer saves manually
- **Audit logs:** Should update immediately when changes are made

**Q: Is this feature triggered manually or automatically?**

A: Mixed:
- **Manual:** Season creation, node structure changes, tournament linking, rule configuration, publishing, cancelling, archiving
- **Automatic:** Advancement record creation when tournament results are submitted (future), standings recalculation (future), qualification status updates (future)

---

### 4. Data & Persistence

**Q: What data does this feature create, read, update, or delete?**

A:
- **Create:** seasons, season_nodes, season_tournaments, season_advancement_connections, season_advancement_records, season_standings, season_audit_logs
- **Read:** All of the above for display in UI
- **Update:** seasons (metadata, status), season_nodes (linked_tournament_id, metadata), season_tournaments (sort order), season_advancement_connections (rules), season_standings (points, rank)
- **Delete:** season_nodes (when removed from structure), season_tournaments (when removed from season), season_advancement_connections (when rules are deleted)

**Q: Does this data need to survive page refresh? Session expiry? Account deletion?**

A:
- **Page refresh:** Yes — all data is persisted in database
- **Session expiry:** Yes — data is tied to user account, not session
- **Account deletion:** Yes — seasons should be archived or deleted when owner account is deleted (cascade or soft-delete)

**Q: Does this feature interact with existing data? Which tables?**

A: Yes, interacts with:
- **tournaments:** season_nodes.linked_tournament_id, tournaments.season_id, tournaments.season_role, tournaments.created_via
- **tournament_stages:** season_nodes.linked_stage_id
- **teams/players:** season_advancement_records.entity_id, season_standings.entity_id
- **users:** season.owner_user_id, season_staff.user_id, season_audit_logs.user_id
- **organizations:** season.organization_id

---

### 5. Dependencies

**Q: Does this feature depend on another feature existing first?**

A: Yes:
- **Tournaments:** The season feature requires the tournament system to exist. Seasons link to tournaments, not vice versa.
- **User authentication:** Seasons are owned by users and require auth.
- **Organizations:** Optional, but seasons can be owned by organizations.

**Q: Does another feature depend on this one?**

A: Not currently, but future features may:
- **Season discovery page:** Depends on seasons being public and queryable
- **Auto-registration:** Depends on advancement records and season_tournaments
- **Tournament → season linkage:** Would require tournaments to reference seasons

**Q: Are there external services involved?**

A: No external services for the core season feature. Future enhancements may involve:
- **Resend:** Email notifications for qualified teams
- **RAWG:** Game metadata (already used by tournaments)

---

## Phase 2: Interaction Mapping — Who Touches This and How

### ACTOR: Organizer (Season Owner)

**ACTION: Create season via wizard**
- **PRECONDITION:** User is authenticated, has organizer permissions
- **SYSTEM RESPONSE:** Creates season row, root node, initial nodes from structure builder
- **UI FEEDBACK:** Navigate to season management workspace, success toast
- **SIDE EFFECTS:** Audit log entry created

**ACTION: Edit season basics (name, game, dates, banner)**
- **PRECONDITION:** Season is in draft or published state, user is owner
- **SYSTEM RESPONSE:** Updates seasons row
- **UI FEEDBACK:** Form saves, toast "Season updated"
- **SIDE EFFECTS:** Audit log entry created

**ACTION: Add/remove season nodes (structure builder)**
- **PRECONDITION:** Season is in draft state, user is owner or staff
- **SYSTEM RESPONSE:** Creates/deletes season_nodes rows, updates display_order
- **UI FEEDBACK:** Canvas updates, nodes appear/disappear
- **SIDE EFFECTS:** Audit log entry created, season_tournaments may need reordering

**ACTION: Link a tournament to a node**
- **PRECONDITION:** Node exists, tournament exists and is owned by user, season is draft
- **SYSTEM RESPONSE:** Updates season_nodes.linked_tournament_id, creates/updates season_tournaments row
- **UI FEEDBACK:** Node card shows tournament name and status, "Manage Tournament" link appears
- **SIDE EFFECTS:** Audit log entry created, season_tournaments table updated

**ACTION: Unlink a tournament from a node**
- **PRECONDITION:** Node is linked to tournament, season is draft
- **SYSTEM RESPONSE:** Sets season_nodes.linked_tournament_id to null, soft-deletes season_tournaments row
- **UI FEEDBACK:** Node card shows "Unlinked" state, "Manage Tournament" link removed
- **SIDE EFFECTS:** Audit log entry created

**ACTION: Configure advancement rule between nodes**
- **PRECONDITION:** Two nodes exist, source node is linked to tournament, season is draft
- **SYSTEM RESPONSE:** Creates/updates season_advancement_connections row with placement rules
- **UI FEEDBACK:** Connection line appears between nodes in canvas, rule details in inspector
- **SIDE EFFECTS:** Audit log entry created

**ACTION: Delete advancement rule**
- **PRECONDITION:** Advancement connection exists, season is draft
- **SYSTEM RESPONSE:** Deletes season_advancement_connections row
- **UI FEEDBACK:** Connection line removed from canvas
- **SIDE EFFECTS:** Audit log entry created

**ACTION: Add season staff member**
- **PRECONDITION:** User exists, season is draft or published, user is owner
- **SYSTEM RESPONSE:** Creates season_staff row
- **UI FEEDBACK:** Staff member appears in staff list, email notification (future)
- **SIDE EFFECTS:** Audit log entry created

**ACTION: Remove season staff member**
- **PRECONDITION:** Staff member exists, user is owner
- **SYSTEM RESPONSE:** Deletes season_staff row
- **UI FEEDBACK:** Staff member removed from list
- **SIDE EFFECTS:** Audit log entry created

**ACTION: Publish season**
- **PRECONDITION:** Season is draft, has at least one non-root node, structure is valid
- **SYSTEM RESPONSE:** 
  - Updates seasons.status to 'published'
  - For each node with linked_tournament_id: updates tournaments.season_id, tournaments.season_role, tournaments.created_via
  - Upserts season_tournaments rows with role, region, display_name, sort_order
  - Creates season_audit_logs entry
- **UI FEEDBACK:** Status badge changes to "Published", success toast, wizard closes
- **SIDE EFFECTS:** Season becomes visible to public (if is_public=true), tournaments marked as season-linked

**ACTION: Cancel season**
- **PRECONDITION:** Season is published or active, user is owner
- **SYSTEM RESPONSE:** Updates seasons.status to 'cancelled', seasons.cancelled_at = now
- **UI FEEDBACK:** Status badge changes to "Cancelled", confirmation dialog
- **SIDE EFFECTS:** Audit log entry created, linked tournaments may need handling (future)

**ACTION: Archive season**
- **PRECONDITION:** Season is completed or cancelled, user is owner
- **SYSTEM RESPONSE:** Updates seasons.status to 'archived', seasons.archived_at = now
- **UI FEEDBACK:** Status badge changes to "Archived", season moves to archived section
- **SIDE EFFECTS:** Audit log entry created

**ACTION: Duplicate season**
- **PRECONDITION:** Season exists, user is owner
- **SYSTEM RESPONSE:** Creates new season row with copied metadata, copies season_nodes structure (without linked tournaments)
- **UI FEEDBACK:** New season created, navigate to new season workspace
- **SIDE EFFECTS:** Audit log entry created on new season

**ACTION: Quick-create tournament for node**
- **PRECONDITION:** Node exists and is unlinked, season is draft
- **SYSTEM RESPONSE:** 
  - Calls POST /api/tournaments with defaults from season (game, mode) and node (region, name)
  - Updates season_nodes.linked_tournament_id with new tournament ID
  - Creates season_tournaments row
- **UI FEEDBACK:** Tournament created, node shows linked status, "Manage Tournament" link appears
- **SIDE EFFECTS:** Audit log entry created, tournament is marked as created_via='season'

**ACTION: Delete season tournament**
- **PRECONDITION:** season_tournaments row exists, season is draft
- **SYSTEM RESPONSE:** Deletes season_tournaments row, sets season_nodes.linked_tournament_id to null
- **UI FEEDBACK:** Tournament removed from season list, node unlinked
- **SIDE EFFECTS:** Audit log entry created

**ACTION: Reorder season tournaments**
- **PRECONDITION:** Multiple season_tournaments exist, season is draft
- **SYSTEM RESPONSE:** Updates season_tournaments.sort_order for all affected rows
- **UI FEEDBACK:** Tournaments reorder in list
- **SIDE EFFECTS:** Audit log entry created

---

### ACTOR: Season Staff (Co-organizer, Admin)

**ACTION: Edit season structure (nodes, connections)**
- **PRECONDITION:** Season is draft, user has staff role
- **SYSTEM RESPONSE:** Same as organizer actions for structure
- **UI FEEDBACK:** Same as organizer
- **SIDE EFFECTS:** Audit log entry created

**ACTION: Edit season rules (advancement connections)**
- **PRECONDITION:** Season is draft, user has staff role
- **SYSTEM RESPONSE:** Same as organizer actions for rules
- **UI FEEDBACK:** Same as organizer
- **SIDE EFFECTS:** Audit log entry created

**ACTION: View season audit logs**
- **PRECONDITION:** User has staff role
- **SYSTEM RESPONSE:** Queries season_audit_logs for this season
- **UI FEEDBACK:** Audit log table displayed
- **SIDE EFFECTS:** None

**✗ Cannot:** Delete season, cancel season, archive season, add/remove staff, revoke owner access

---

### ACTOR: Player

**VIEW: Public season page**
- **PRECONDITION:** Season is published and is_public=true
- **SYSTEM RESPONSE:** Queries season, season_nodes, season_tournaments, season_standings
- **UI FEEDBACK:** Season overview, tournament circuit visualization, standings table
- **SIDE EFFECTS:** None

**VIEW: Season standings**
- **PRECONDITION:** Season is published
- **SYSTEM RESPONSE:** Queries season_standings ordered by rank
- **UI FEEDBACK:** Standings table with team/player names, points, rank, status
- **SIDE EFFECTS:** None

**VIEW: Qualification status**
- **PRECONDITION:** Player/team has participated in a season tournament
- **SYSTEM RESPONSE:** Queries season_advancement_records for entity
- **UI FEEDBACK:** Shows qualification status (qualified, wildcard, reserve, etc.)
- **SIDE EFFECTS:** None

**✗ Cannot:** Edit season structure, link tournaments, configure rules, publish, cancel, archive

---

### ACTOR: System (Automated)

**TRIGGER: Tournament result submitted**
- **PRECONDITION:** Tournament is linked to a season, match result recorded
- **SYSTEM RESPONSE:** (Future) Creates season_advancement_records for qualified teams, updates season_standings
- **UI FEEDBACK:** None (background)
- **SIDE EFFECTS:** Qualification status updates, standings recalculate

**TRIGGER: Season published**
- **PRECONDITION:** Organizer clicks publish
- **SYSTEM RESPONSE:** Updates linked tournaments with season linkage, creates season_tournaments rows
- **UI FEEDBACK:** None (background)
- **SIDE EFFECTS:** Tournaments now have season_id and season_role

**TRIGGER: Season cancelled**
- **PRECONDITION:** Organizer clicks cancel
- **SYSTEM RESPONSE:** (Future) May cancel linked tournaments or mark them as standalone
- **UI FEEDBACK:** None (background)
- **SIDE EFFECTS:** Linked tournaments may be affected

---

## Phase 3: Finalized Interaction List + Edge Cases

### Edge Cases

**EDGE CASE: Organizer tries to publish season with no linked tournaments**
- **RESOLUTION:** Block publish. Show error: "Season must have at least one linked tournament to publish."

**EDGE CASE: Organizer tries to publish season with circular advancement connections**
- **RESOLUTION:** Block publish. Validate advancement graph for cycles before allowing publish. Show error: "Advancement connections cannot form a cycle."

**EDGE CASE: Organizer links a tournament that's already linked to another season**
- **RESOLUTION:** Allow it (tournaments can belong to multiple seasons). Show warning: "This tournament is already linked to another season."

**EDGE CASE: Organizer deletes a node that has outgoing advancement connections**
- **RESOLUTION:** Cascade delete the advancement connections. Show confirmation: "Deleting this node will also remove 2 advancement rules."

**EDGE CASE: Organizer tries to link a tournament they don't own**
- **RESOLUTION:** Block it. Show error: "You can only link tournaments you own."

**EDGE CASE: Two organizers edit the same season structure simultaneously**
- **RESOLUTION:** Last write wins. Add optimistic locking or version check on season_nodes updates. Show "Structure was updated by another user" on conflict.

**EDGE CASE: Season is published, then organizer tries to delete a node**
- **RESOLUTION:** Block node deletion if season is published. Show error: "Cannot delete nodes from a published season. Cancel the season first."

**EDGE CASE: Season is published, then organizer tries to unlink a tournament**
- **RESOLUTION:** Block unlink if season is published. Show error: "Cannot unlink tournaments from a published season. Cancel the season first."

**EDGE CASE: Quick-create tournament fails (API error)**
- **RESOLUTION:** Show error toast with details. Do not link the node. Allow retry.

**EDGE CASE: Quick-create tournament succeeds but node update fails**
- **RESOLUTION:** Transaction rollback. Delete the created tournament, show error: "Failed to link tournament. Please try again."

**EDGE CASE: Reorder tournaments with duplicate sort orders**
- **RESOLUTION:** Backend re-indexes all season_tournaments.sort_order sequentially to prevent gaps and duplicates.

**EDGE CASE: Season has 50+ tournaments (large scale)**
- **RESOLUTION:** Paginate season_tournaments list, lazy load nodes in structure builder, virtualize standings table.

**EDGE CASE: Advancement rule has invalid placement range (from > to)**
- **RESOLUTION:** Block save. Show error: "Placement 'from' must be less than or equal to 'to'."

**EDGE CASE: Advancement rule has negative or zero placement values**
- **RESOLUTION:** Block save. Show error: "Placement values must be positive integers."

**EDGE CASE: Season owner account is deleted**
- **RESOLUTION:** Transfer ownership to organization admin or soft-delete season with owner_user_id null. Do not hard-delete seasons with active tournaments.

**EDGE CASE: Linked tournament is deleted while season is active**
- **RESOLUTION:** Set season_nodes.linked_tournament_id to null, mark season_tournaments as deleted. Show warning in season workspace: "Tournament 'X' was deleted. Node is now unlinked."

**EDGE CASE: Player qualifies but tournament has no destination node**
- **RESOLUTION:** Mark advancement record as 'blocked'. Show in qualification panel: "Qualified but no destination tournament configured."

**EDGE CASE: Season has no points rules configured**
- **RESOLUTION:** Allow publish but show warning: "No points rules configured. Standings will be empty."

**EDGE CASE: Organizer adds staff member who is already staff**
- **RESOLUTION:** Block duplicate. Show error: "User is already a staff member."

**EDGE CASE: Organizer removes themselves as staff (via API bypass)**
- **RESOLUTION:** Block removal if user is owner. Show error: "Cannot remove season owner."

**EDGE CASE: Season is public but has no banner/logo**
- **RESOLUTION:** Show default placeholder banner/logo. Do not block publish.

**EDGE CASE: Season dates (start/end) are in the past when created**
- **RESOLUTION:** Allow it (seasons can be retroactive). Show warning: "Season dates are in the past."

**EDGE CASE: Season end date is before start date**
- **RESOLUTION:** Block save. Show error: "End date must be after start date."

**EDGE CASE: Quick-create tournament with region that doesn't match game**
- **RESOLUTION:** Allow it (organizer may have custom regions). No validation.

**EDGE CASE: Node type is 'root' but organizer tries to link a tournament**
- **RESOLUTION:** Block it. Root nodes are organizational only. Show error: "Cannot link a tournament to the root node."

**EDGE CASE: Duplicate season slug**
- **RESOLUTION:** Backend generates unique slug (append random suffix if needed). Show final slug to organizer.

---

### Finalized Interaction List

**SEASON FEATURE — FINALIZED INTERACTIONS**

**Organizer:**
- ✓ Create season via wizard (structure, basics)
- ✓ Edit season basics (name, game, dates, banner)
- ✓ Add/remove season nodes (structure builder)
- ✓ Link tournament to node
- ✓ Unlink tournament from node
- ✓ Configure advancement rule between nodes
- ✓ Delete advancement rule
- ✓ Add season staff member
- ✓ Remove season staff member
- ✓ Publish season (validates structure, links tournaments)
- ✓ Cancel season
- ✓ Archive season
- ✓ Duplicate season
- ✓ Quick-create tournament for node
- ✓ Delete season tournament
- ✓ Reorder season tournaments
- ✗ Cannot publish with no linked tournaments
- ✗ Cannot publish with circular advancement connections
- ✗ Cannot delete nodes from published season
- ✗ Cannot unlink tournaments from published season
- ✗ Cannot link tournaments they don't own
- ✗ Cannot link tournament to root node

**Season Staff (Co-organizer, Admin):**
- ✓ Edit season structure (nodes, connections)
- ✓ Edit season rules (advancement connections)
- ✓ View season audit logs
- ✗ Cannot delete season
- ✗ Cannot cancel season
- ✗ Cannot archive season
- ✗ Cannot add/remove staff
- ✗ Cannot revoke owner access

**Player:**
- ✓ View public season page
- ✓ View season standings
- ✓ View qualification status
- ✗ Cannot edit season in any way

**System:**
- ✓ Auto-create season_tournaments on publish
- ✓ Auto-update tournament season linkage on publish
- ✓ Auto-create audit logs on all mutations
- ✓ Auto-validate advancement graph on publish
- ✗ Auto-create advancement records (future)
- ✗ Auto-recalculate standings (future)

**Edge cases handled:**
- ✓ Publish with no linked tournaments → blocked
- ✓ Circular advancement connections → blocked
- ✓ Tournament linked to multiple seasons → allowed with warning
- ✓ Node deletion with connections → cascade delete with confirmation
- ✓ Linking unowned tournament → blocked
- ✓ Simultaneous edits → last write wins
- ✓ Delete node from published season → blocked
- ✓ Unlink tournament from published season → blocked
- ✓ Quick-create failure → error toast, no link
- ✓ Partial quick-create failure → transaction rollback
- ✓ Duplicate sort orders → re-index
- ✓ Large season (50+ tournaments) → pagination, lazy load
- ✓ Invalid placement range → blocked
- ✓ Invalid placement values → blocked
- ✓ Owner account deleted → transfer or soft-delete
- ✓ Linked tournament deleted → unlink with warning
- ✓ Qualification with no destination → blocked status
- ✓ No points rules → warning, allow publish
- ✓ Duplicate staff → blocked
- ✓ Remove owner staff → blocked
- ✓ Missing banner/logo → placeholder
- ✓ Past dates → allowed with warning
- ✓ End before start → blocked
- ✓ Link to root node → blocked
- ✓ Duplicate slug → auto-generate unique
