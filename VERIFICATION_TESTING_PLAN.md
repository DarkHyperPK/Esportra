# Esportra Extended Verification & Testing Plan

This document provides exact, step-by-step "how-to" testing instructions for the 16 migrated domains. You must follow the numbered steps exactly to validate the .NET 9 + Redis migration.

---

## 🟢 DOMAIN 1: Authentication & Authorization

### 1.1 Complete Login Flow
- [ ] **Standard Login Success:**
    1. Open your browser to the local frontend (`http://localhost:5173/auth/login`).
    2. Enter a registered test email (e.g., `test1@esportra.com`) and password.
    3. Click **"Sign In"**.
    4. **Verification:** Ensure the page redirects to `/` or the player dashboard. Open Chrome DevTools (`F12`) -> **Application** tab -> **Local Storage**. Verify `sb-[YOUR_PROJECT_ID]-auth-token` exists and contains a valid JWT.

- [ ] **Login Failure Scenarios:**
    1. Navigate to `/auth/login`. Enter a valid email but an intentionally wrong password (`wrongpass123`).
    2. Click **"Sign In"**.
    3. **Verification:** Ensure a red error toast appears saying "Invalid login credentials". Ensure the URL remains `/auth/login`.
    4. Repeat the test with a non-existent email. Verify the same error behavior.

- [ ] **Sign Out Flow:**
    1. While logged in, click your avatar in the top-right navigation bar to open the user menu.
    2. Click **"Log out"**.
    3. **Verification:** Ensure you are redirected to `/`. Open DevTools Local Storage and verify the Supabase auth token has been completely removed.

### 1.2 Role & Claims Enforcement (Backend Validation)
- [ ] **Platform Role Protection:**
    1. Log in with a standard `casual` user account.
    2. Manually change the browser URL to `http://localhost:5173/organizer/dashboard`.
    3. **Verification:** Ensure the React frontend intercepts the route and immediately redirects you back to `/` or `/auth/unauthorized`, displaying an "Access Denied" toast.
- [ ] **API Strict Auditing (Postman):**
    1. Open Postman. Copy your standard user JWT from the browser DevTools.
    2. Set up a `POST` request to `http://localhost:5031/api/tournaments`.
    3. Add Header: `Authorization: Bearer <Your_JWT>`. Add a dummy JSON body.
    4. Click Send.
    5. **Verification:** Ensure the .NET API returns a strict `403 Forbidden` because the JWT does not contain the `Organizer` role claim.

---

## 🟢 DOMAIN 2: Profiles & Connected Accounts

### 2.1 Profile Updation
- [ ] **Edit Bio & Region:**
    1. Navigate to `http://localhost:5173/player/profile`.
    2. Click **"Edit Profile"**.
    3. Change the Bio text to "Testing Bio 123" and select a new Country (e.g., "Canada").
    4. Click **"Save Changes"**.
    5. **Verification:** Check the Network tab to ensure `PUT /api/profiles/{id}` was sent and responded with `200 OK`. Refresh the page (`F5`) and verify "Testing Bio 123" persists.

### 2.2 Connected Accounts
- [ ] **Link Riot Games:**
    1. On the profile page, scroll to **Connected Accounts**.
    2. Click **"Connect Riot Account"**.
    3. Complete the mock or real OAuth flow, or manual Riot ID entry (e.g., `Player#NA1`).
    4. **Verification:** Ensure `POST /api/profiles/me/riot` returns `200 OK`. Verify the UI now shows a green "Connected" badge next to Riot Games.
    5. Check the database (`profiles` table): Ensure the `riot_tag` column reflects the updated value.

---

## 🟢 DOMAIN 3: Teams & Roster Management

### 3.1 Team Creation
- [ ] **Creating a New Team:**
    1. Navigate to `/player/teams`. Click **"Create Team"**.
    2. Fill out the wizard: Name = "Alpha Squad", Tag = "ALP", Game = "Valorant".
    3. Click **"Create"**.
    4. **Verification:** Ensure `POST /api/teams` fires. Verify redirection to `/teams/[team-id]`. In pgAdmin/DBeaver, query `SELECT * FROM teams WHERE tag = 'ALP'` and ensure the row exists and `owner_id` matches your User ID.

### 3.2 Invites & Roster Constraints
- [ ] **Sending an Invite:**
    1. As team captain, go to the team roster page.
    2. Click **"Invite Member"**. Enter the username/email of a second test account.
    3. Click **"Send"**.
    4. **Verification:** Ensure `POST /api/teams/{id}/invite` succeeds.
- [ ] **Accepting an Invite:**
    1. Open an incognito window. Log in as the second test account.
    2. Check the notifications bell in the top right.
    3. Click the "You have been invited" notification. Navigate to the invites page.
    4. Click **"Accept"**.
    5. **Verification:** Ensure `POST /api/teams/{id}/invite/{id}/accept` succeeds. Look at the `team_members` table in the DB and ensure a new row exists connecting this user to the team.

---

## 🟢 DOMAIN 4: Tournaments

### 4.1 Tournament Wizard
- [ ] **Tournament Generation:**
    1. Log in with an Organizer account. Navigate to `/organizer/tournaments/create`.
    2. Fill out Step 1 (Basic Info): Name="Test Tourney", Game="Valorant".
    3. Fill out Step 2 (Format): Select "Single Elimination", Team Size="5v5".
    4. Fill out Step 3 (Schedule): Set Registration Close and Start dates to 1 hour from now.
    5. Click **"Publish"**.
    6. **Verification:** Ensure `POST /api/tournaments` succeeds. Navigate to the public `/tournaments` page and verify "Test Tourney" is visible and the status is "Published".

### 4.2 Registration
- [ ] **Team Registration Validation:**
    1. Log in as a Team Captain. Go to the "Test Tourney" public page.
    2. Click **"Register Team"**. Select "Alpha Squad".
    3. **Verification:** Ensure `POST /api/tournaments/{id}/register` succeeds. Verify the UI updates to "Registered". Open the DB `tournament_participants` table and ensure the row exists.

---

## 🟢 DOMAIN 5: Bracket Engine

### 5.1 Single Elimination Scaffold
- [ ] **Generating the Bracket:**
    1. Log in as the Organizer. Go to "Test Tourney" -> **Manage Bracket**.
    2. Ensure at least 4 teams are registered (mock this via DB if necessary).
    3. Click **"Generate Bracket"**.
    4. **Verification:** Ensure the visual bracket tree renders. Look at the Network tab for `POST /api/brackets/generate`. In the DB, check the `matches` table and ensure exactly 3 matches were created (2 semi-finals, 1 final) for a 4-team bracket, and the `next_match_id` pointers are correctly linked to the final.

### 5.2 Realtime Match Advancement
- [ ] **Advancing the Tree:**
    1. In the Bracket Manager UI, open the first semi-final match.
    2. Click **"Force Win"** for Team A.
    3. **Verification:** Ensure `POST /api/brackets/advance` completes. The bracket UI should instantly redraw, moving Team A into the Final node. Verify another observer's screen (if testing parallel browsers) updates seamlessly via `BracketHub` WebSocket without needing a page refresh.

---

## 🟢 DOMAIN 6: Match System

### 6.1 Match Reporting & Disputes
- [ ] **Submitting Results:**
    1. As Team A's captain, go to the active match page.
    2. Click **"Report Score"**. Enter Team A: 2, Team B: 0. Submit.
    3. As Team B's captain (incognito), go to the active match page.
    4. Click **"Report Score"**. Enter Team A: 2, Team B: 0. Submit.
    5. **Verification:** Once both scores match, ensure `POST /api/matches/{id}/report` triggers the `.NET` result processor. The match should automatically advance the bracket to the next round.
- [ ] **Dispute Workflow:**
    1. In a new match, have Team A report 2-0, and Team B report 0-2.
    2. **Verification:** Ensure the system detects the mismatch. Verify the match status changes to `Disputed`. Verify an alert drops into the Organizer's Dispute Center (`/organizer/disputes`).

---

## 🟢 DOMAIN 7: Map Veto

### 7.1 Real-Time Veto Simulation
- [ ] **Executing a Veto:**
    1. Have Team A and Team B captains open the Match page simultaneously.
    2. Click **"Start Map Veto"**.
    3. **Verification:** Ensure both connect to `VetoHub`. Verify the UI coin tosses to pick who goes first (e.g., Team A).
    4. Team A clicks "Ban Ascent".
    5. **Verification:** Team B's screen should immediately cross out Ascent and say "Your Turn".
    6. Wait 30 seconds on Team B's turn.
    7. **Verification:** Ensure the `.NET MapVetoEngine` automatically executes a random ban for Team B when the timer hits zero, pushing the event to both clients.

---

## 🟢 DOMAIN 8: Venues & Bookings

### 8.1 Geo Location Search
- [ ] **Find Venues:**
    1. Navigate to `/venues`. Allow browser location prompts.
    2. Ensure the network fires `GET /api/venues?lat=[YOUR_LAT]&lng=[YOUR_LNG]`.
    3. **Verification:** View the list. Venues closest to your mocked/detected location should appear at the top.

### 8.2 Booking Simulation
- [ ] **Booking Concurrency Guard:**
    1. Open Postman. Prepare a POST request to `http://localhost:5031/api/venues/1/bookings` requesting 5 PCs at 2:00 PM.
    2. Prepare an identical request in a second Postman tab.
    3. Fire them simultaneously.
    4. **Verification:** Ensure the first request returns `200 OK` and the second request returns `409 Conflict: Not enough available stations for this timeslot.` This validates the `.NET` database locking mechanism.

---

## 🟢 DOMAINS 9-16 (Admin, Email, Sponsors, Orgs)

### 9.1 Organization Management & Roles
- [ ] **Staff Invite:** Org owner navigates to `/org-settings/staff`, invites `test3@email.com` as "Moderator".
- [ ] **Check Audit Log:** Query `SELECT * FROM staff_audit_log` in the DB. Verify the action `INVITE_STAFF` was logged.

### 10.1 Notifications (Websockets)
- [ ] **Check-In Push:** As an organizer, trigger the "Ready Check" for a match. Verify participants instantly receive an on-screen toast notification. Ensure DevTools Network -> WS shows the incoming payload from `NotificationHub`.

### 11.1 Emails (.NET Resend SDK)
- [ ] **Delivery Test:** Force a password reset. **Verification:** Check the test inbox (e.g., Mailtrap or live Resend logs) to ensure the `.NET EmailService` successfully compiled and sent the HTML email template.

### 12.1 Storage Signatures
- [ ] **Private Uploads:** Attempt to upload a team logo. **Verification:** Check the Network tab. Ensure a call to `POST /api/storage/upload-url` fetches a secure token BEFORE the file is actually pushed to Supabase Storage.

### 14.1 Admin Suspension
- [ ] **Ban Hammer:** Log into the Admin Panel. Find a test user. Click "Suspend", enter reason "Cheating", click Confirm.
- [ ] **Verification:** Try to log back in or navigate the site as the suspended user. Ensure strict 403 or immediate redirect to `/auth/suspended`.

### 15.1 Realtime Leaderboards
- [ ] **Redis Validation:** Complete a ranked match. Navigate to `/leaderboards`. **Verification:** Ensure the rankings instantly reflect the match outcome (validating that the `.NET` worker successfully updated the Redis sorted set).
