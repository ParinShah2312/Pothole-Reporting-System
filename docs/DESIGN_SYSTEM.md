# Design System & UI/UX Specification

> **Project:** Smart Civic Road Issue Reporting & AI-Based Pothole Verification System  
> **Target Region:** Vadodara, Gujarat, India  
> **Frontend Stack:** React 19, Vite 8, React-Leaflet 5, `leaflet.markercluster` 2.0, CSS Custom Properties

---

## 1. Visual Foundation & Philosophy

The user interface is designed for public civic engagement and rapid municipal dispatch. It prioritizes clarity, high accessibility under direct sunlight on mobile displays, clear status legibility, and minimal cognitive load during roadside incident reporting.

---

## 2. Typography

The system utilizes Google Font **Plus Jakarta Sans** with a clean native fallback stack for crisp legibility and geometric aesthetics:

```css
font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Hierarchy & Scale

| Token / Element | Font Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| **Display / Hero H1** | `2.5rem` – `3.0rem` | `800` Extra-Bold | `1.15` | Landing page hero header |
| **Page Head H1** | `1.85rem` (29px) | `700` Bold | `1.25` | Main portal page titles (`Report a pothole`, `Government dashboard`) |
| **Section H2** | `1.2rem` (19px) | `600` Semi-bold | `1.3` | Card headers, form sections, module headings |
| **Eyebrow** | `0.75rem` (12px) | `700` Bold | `1.0` | Uppercase category tags (`CIVIC TECH · VADODARA`) |
| **Body (Default)** | `1.0rem` (16px) | `400` / `500` | `1.5` | Standard paragraphs, inputs, instructions |
| **Subtext / Muted** | `0.85rem` – `0.92rem` | `400` / `500` | `1.4` | Table data, hints, timestamps, metadata |
| **Counter Value** | `2.2rem` (35px) | `800` Extra-Bold | `1.0` | Live statistic counters (tabular numbers) |

---

## 3. Color Palette & Design Tokens

Defined centrally via CSS custom properties in `client/src/styles/global.css`:

### 3.1 Primary & Neutral Tokens

| Token | Hex Value | Role |
|---|---|---|
| `--primary` | `#2563eb` | Vibrant Civic Blue (buttons, active navigation, brand elements) |
| `--primary-hover` | `#1d4ed8` | Deep blue for hover states |
| `--primary-light` | `#eff6ff` | Soft tinted blue surface for highlights & chips |
| `--accent` | `#f59e0b` | Warm Amber / Alert badge (`#fffbeb` light) |
| `--bg` | `#f8fafc` | Slate-50 soft canvas with subtle radial backdrop glows |
| `--surface` | `#ffffff` | Pure white container & card background |
| `--surface-2` | `#f1f5f9` | Slate-100 secondary surface (table headers, inputs) |
| `--surface-3` | `#e2e8f0` | Slate-200 tertiary surface & borders |
| `--text` | `#0f172a` | Slate-900 high-contrast body text |
| `--muted` | `#64748b` | Slate-500 for secondary text and hints |
| `--border` | `#e2e8f0` | Clean subtle border stroke for cards |

### 3.2 Status & Lifecycle Tokens

The color system clearly communicates the urgency and progress of road repairs on both map markers (`client/src/utils/status.js`) and badge chips:

| Status Key | Label | Color Theme | Hex Code (`status.js`) | Visual Meaning |
|---|---|---|---|---|
| `pending_verification` | Pending verification | Cool Slate | `#7a8594` | Submitted; awaiting AI initial inspection |
| `under_review` | Under review | Warm Ochre | `#b7791f` | AI confidence borderline or flagged for admin review |
| `rejected` | Rejected | Muted Crimson | `#8c3b3b` | AI or admin determined no valid pothole |
| `active` | Active | Urgent Red | `#d64545` | Verified genuine pothole; awaiting municipal assignment |
| `assigned` | Assigned | Burnt Orange | `#dd6b20` | Assigned to a specific Zone department |
| `in_progress` | Repair in progress | Gold / Amber | `#d69e2e` | Repair crew deployed on site |
| `repair_completed` | Repair completed | Civic Blue | `#3182ce` | Work finished; awaiting after-photo AI verification |
| `solved` | Solved | Emerald Green | `#2f855a` | Verified repaired by AI and GPS; closed |

---

## 4. UI Components & Layout Guidelines

### 4.1 Card & Container System
- **Container Max-Width:** `1180px` centered with `16px` padding.
- **Card Radius:** `14px` (`--radius: 14px;`), `20px` for large cards (`--radius-lg: 20px;`).
- **Elevation / Shadow System:** Multi-tier soft shadows (`--shadow-sm`, `--shadow`, `--shadow-md`, `--shadow-lg`, and primary ambient `--shadow-glow`).
- **Analytics & Summary Grids:** `.gov-summary` 4-card workload strip (`.mini-stat`), `.trend-bars` daily Reported (`#2563eb`) vs. Solved (`#059669`) bar chart on `/stats`, and `.settings-grid` 2-column threshold controls.

### 4.2 Interactive Elements
- **Buttons (`.btn`):** `8px` rounded corners, `0.6rem 1.1rem` padding, bold text.
- **Form Controls:** Full width, `8px` border radius, subtle hover stroke, focus ring: `2px solid color-mix(in srgb, var(--primary) 40%, transparent)`.
- **Status & Flag Badges (`.badge`, `.flag-pill`):** Pill-shaped (`999px`) status pills plus amber warning pills for EXIF/location flags.
- **Live Indicator (`.live-pill`):** Subtle emerald `#059669` `● Live` badge on real-time SSE counter cards.

### 4.3 Responsive Breakpoints
- **Desktop (`> 960px`):** Two-column split grids for hero, details page, and government triage view; 4-column `.gov-summary`.
- **Tablet (`641px – 960px`):** Single-column split grids; `.gov-summary` folds to `2×2` and step cards fold to `3` columns.
- **Mobile (`<= 640px`):** Full-width stacked forms, single-column counters and settings forms, optimized tap targets for outdoor phone usage.

---

## 5. Map & Geolocation Design Specs

- **Tile Provider:** OpenStreetMap via Leaflet (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`).
- **Default City Coordinates:** Latitude `22.3072`, Longitude `73.1812` (Vadodara center), default zoom `13`.
- **Marker Clustering & Search:** `leaflet.markercluster` groups nearby issues into density-colored `.cluster-badge` circles (`.cluster-sm` `#2563eb`, `.cluster-md` `#d97706`, `.cluster-lg` `#dc2626`); OpenStreetMap Nominatim search toolbar (`.map-toolbar`, `.map-search`) pans smoothly via `flyTo`.
- **Camera Capture:** Triggered via `<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment">` on completion photos and `1–5` multi-photo picker on citizen reports.
- **Accuracy Feedback & Geo-Fence:** Blue `#3182ce` accuracy ring when `<= 25 m`, shifting to warning amber `#d97706` with weak-GPS alerts above `25 m` / `100 m`; completion map overlays a green dashed `#059669` `50 m` geo-fence circle around the target report pin.
- **Pin Move Warning:** Visual amber alert when manual pin exceeds configured pin-move threshold (`200 m` default) from detected hardware GPS.
