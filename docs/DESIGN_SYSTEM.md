# Design System & UI/UX Specification

> **Project:** Smart Civic Road Issue Reporting & AI-Based Pothole Verification System  
> **Target Region:** Vadodara, Gujarat, India  
> **Frontend Stack:** React 19, Vite 8, React-Leaflet, CSS Custom Properties

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

The color system clearly communicates the urgency and progress of road repairs on both map markers and badge chips:

| Status Key | Label | Color Token | Hex Code | Visual Meaning |
|---|---|---|---|---|
| `pending_verification` | Pending Verification | Neutral Gray | `#64748b` | Submitted; awaiting AI initial inspection |
| `under_review` | Under Review | Warning Amber | `#f59e0b` | AI confidence borderline; flagged for admin review |
| `rejected` | Rejected | Crimson Red | `#ef4444` | AI or admin determined no valid pothole |
| `active` | Active | Urgent Red | `#ef4444` | Verified genuine pothole; awaiting municipal assignment |
| `assigned` | Assigned | Deep Orange | `#f97316` | Assigned to a specific Ward / Zone department |
| `in_progress` | Repair in Progress | Gold / Amber | `#eab308` | Repair crew deployed on site |
| `repair_completed` | Repair Completed | Tech Blue | `#3b82f6` | Work finished; awaiting after-photo AI verification |
| `solved` | Solved | Emerald Green | `#10b981` | Verified repaired by AI and GPS; closed |

---

## 4. UI Components & Layout Guidelines

### 4.1 Card & Container System
- **Container Max-Width:** `1180px` centered with `16px` padding.
- **Card Radius:** `14px` (`--radius: 14px;`), `20px` for large cards (`--radius-lg: 20px;`).
- **Elevation / Shadow System:** Multi-tier soft shadows (`--shadow-sm`, `--shadow`, `--shadow-md`, `--shadow-lg`, and primary ambient `--shadow-glow`).

### 4.2 Interactive Elements
- **Buttons (`.btn`):** `8px` rounded corners, `0.6rem 1.1rem` padding, bold text.
- **Form Controls:** Full width, `8px` border radius, subtle hover stroke, focus ring: `2px solid color-mix(in srgb, var(--primary) 40%, transparent)`.
- **Status Badges (`.badge`):** Pill-shaped (`999px`), light color-mix background, circular status indicator dot.

### 4.3 Responsive Breakpoints
- **Desktop (> 900px):** Two-column split grids for hero, details page, and government triage view.
- **Tablet (561px – 900px):** Single-column dashboard layouts; step cards fold into 2-column grids.
- **Mobile ($\le$ 560px):** Full-width stacked forms, single-column counters, optimized tap targets ($\ge 44\text{px}$) for outdoor phone usage.

---

## 5. Map & Geolocation Design Specs

- **Tile Provider:** OpenStreetMap via Leaflet (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`).
- **Default City Coordinates:** Latitude `22.3072`, Longitude `73.1812` (Vadodara center), default zoom `12`.
- **Camera Capture:** Triggered via `<input type="file" accept="image/*" capture="environment">` ensuring direct native camera activation on iOS and Android devices.
- **Accuracy Feedback:** Blue semi-transparent radius circle indicating GPS margin of error ($\pm X\text{ meters}$).
- **Pin Move Warning:** Visual amber notification when manual pin exceeds $200\text{ meters}$ from detected hardware GPS.
