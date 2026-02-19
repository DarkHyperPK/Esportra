# Ad Placement & Management Strategy

## 1. Visual Specification by Tier

### 🟢 Partner Ticker (Homepage)
**Location:** Scrolling marquee below Hero Section.
*   **Platinum:** Large Logo (h-16), Full Opacity, Always visible in loop.
*   **Gold:** Medium Logo (h-12), 80% Opacity.
*   **Bronze:** Small Logo (h-8), 60% Opacity (Grayscale until hover).
*   **Logic:** Auto-populated from active sponsors.

### 🏆 Tournament Cards (Listings)
**Location:** Tournament grids (`/tournaments`, Homepage).
*   **Platinum:** "Title Sponsor" Badge (Top Left, Gold/Rose Color).
    *   *Text:* "Presented by [Logo]"
*   **Gold:** "Sponsored" Badge (Footer, Silver/Amber Color).
    *   *Text:* "Sponsor: [Logo]"
*   **Bronze:** No presence on generic cards.

### 🚩 Tournament Header (Detail Page)
**Location:** Top Hero area of a specific tournament (`/tournaments/:slug`).
*   **Platinum (Title Sponsor):**
    *   **Co-Branding:** Tournament Title becomes "The [Sponsor] Championship".
    *   **Hero Image:** Sponsor Banner is blended with Tournament Banner.
*   **Gold:**
    *   **Sidebar Ad:** "Featured Sponsor" block in the right sidebar.
    *   **Logo:** Visible in the "Match Info" bar.

### 🎥 Stream Overlays
**Location:** Downloadable assets for Organizers/Broadcasters.
*   **Platinum:** "Full Overlay" (Scoreboard frame, Lower Thirds).
*   **Gold:** "Corner Watermark" (Logo placement).

---

## 2. Management Workflow ("The Pipeline")

How a sponsorship goes from **Portal** to **Public**:

### Step 1: Asset Ingestion (Partner Portal)
**User:** Sponsor (Gold/Platinum)
**Page:** `/assets`
*   **Action:** Uploads "Brand Assets".
    *   `Logo_Dark.png` (for light backgrounds)
    *   `Logo_Light.png` (for dark backgrounds)
    *   `Stream_Overlay.png` (Alpha channel transparency)
*   **System:** Validates dimensions and format. Stores in `partner-uploads` bucket.

### Step 2: Assignment (Admin Dashboard)
**User:** Admin / Tournament Organizer
**Page:** `/tournaments/:id/sponsors`
*   **Action:** "Link Sponsor".
    *   Selects Sponsor from list (e.g., "Logitech").
    *   Selects Type: `Title Sponsor` (Platinum) or `Event Sponsor` (Gold).
*   **System:** Updates `tournament_sponsors` table.

### Step 3: Deployment (Public Frontend)
**User:** Gamer / Viewer
**Pages:** Homepage, Tournament Details
*   **Action:** Page loads `useTournament(id)`.
*   **Logic:**
    *   Fetches linked sponsors.
    *   Checks Tier -> Renders appropriate Badge/Header.
    *   *Stats:* Tracks Impressions for the Sponsor's Analytics tab.

---

## 3. Partner Portal Visibility
**Page:** `/campaigns` (Revamped)
*   **View:** "Active Sponsorships"
*   **Content:**
    *   "You are the Title Sponsor for **Winter Major 2024**"
    *   **Stats:** Views on Tournament Page, Clicks on Banner.

---

## 4. Industry Benchmark Comparison

Is this standard? **Yes, but improved.**

| Feature | Legacy Platforms (Battlefy, Toornament) | **Esportra (Proposed)** |
| :--- | :--- | :--- |
| **Ad Management** | Manual (Email assets to admin) | **Self-Service Portal** (Modern SaaS) |
| **Stream Assets** | Email / Google Drive link | **Direct Download** from Tournament Dashboard |
| **Title Sponsors** | Hardcoded by Devs | **Dynamic Linking** via Admin Dashboard |
| **Performance** | Quarterly PDF Reports | **Real-time Analytics** in Partner Portal |

**Verdict:** Most platforms treat sponsorships as a "service" handled manually. By building this into the **Partner Portal**, you are productizing it, allowing you to scale from 5 sponsors to 500 without hiring more account managers.
