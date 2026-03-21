# Ad Placement Inventory & Specifications

## Summary of Available Inventory

| Placement Type | Total Slots | Size (Pixels) | Size (Inches) @96dpi | Dimensions (Mobile) |
| :--- | :--- | :--- | :--- | :--- |
| **Tournament Sidebar** | 2 | 300 x 600 px | 3.1" x 6.2" | Hidden |
| **Tournament Wide** | 4 | 800 x 400 px | 8.3" x 4.2" | 400 x 200 px |
| **Logo Ticker** | Multiple | ~150 x 40 px | ~1.5" x 0.4" | Responsive |
| **Partners Showcase** | 1 / Partner | 1200 x 800 px | 12.5" x 8.3" | 600 x 400 px |
| **Stream Overlay** | Custom | 1920 x 1080 px | 20.0" x 11.2" | N/A |

---

## Detailed Allowable Placements

### 1. Homepage & Global (`Index.tsx`)
*   **Logo Ticker:**
    *   **Status:** **ACTIVE**
    *   **Logic:** A clean row of partner logos that appears on the homepage and potential global footers.
    *   **Dimensions:** Logos are scaled to a fixed height (**40px**) with variable width.
    *   **Format:** Transparent PNG (white/monochrome preferred for ticker).

### 2. Tournament Details (`OverviewTab.tsx`)
*   **Mission Brief Sidebar (Left):** 2 Slots (300x600 px) - **DYNAMIC READY** (Slots available in code, placeholders removed)
*   **Mission Brief Grid (Right):** 4 Slots (800x400 px) - **DYNAMIC READY** (Slots available in code, placeholders removed)

### 3. Partners Page (`Partners.tsx`)
*   **Partner Showcase Image:**
    *   **Type:** `landscape` (Large)
    *   **Logic:** high-impact visual representing the brand (e.g., product shot, brand art).
    *   **Dimensions:** Optimized at **1200 x 800 px**.
*   **Brand Logo:** 
    *   **Dimensions:** **h-16** (64px) height.
*   **Notes:** This is the most detailed placement, supporting gallery images, custom taglines, and "Visit Partner" CTAs.

### 4. Global Elements (Potential Expansion)
*   **Footer:** Currently **0** slots.
    *   *Opportunity:* A small "Powered by [Sponsor]" logo near the copyright.
*   **Navigation:** Currently **0** slots.

---

## Technical Implementation Guide

To place an ad in any of these slots manually, use the `StaticAd` component:

```tsx
import { StaticAd } from "@/components/StaticAd";

// 1. Standard Banner
<StaticAd 
    imageUrl="https://..." 
    linkUrl="https://sponsor.com" 
    alt="Sponsor Name" 
/>

// 2. Sidebar / Vertical Ad
<StaticAd 
    variant="sidebar"
    imageUrl="https://..." 
    linkUrl="https://sponsor.com" 
    alt="Sponsor Name" 
/>

// 3. Box / Square Ad
<StaticAd 
    variant="box"
    imageUrl="https://..." 
    linkUrl="https://sponsor.com" 
    alt="Sponsor Name" 
/>
```
