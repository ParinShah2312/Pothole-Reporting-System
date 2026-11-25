# Design System & UI/UX Specification

> **Project:** Smart Civic Road Issue Reporting & AI-Based Pothole Verification System  
> **Target Region:** Vadodara, Gujarat, India  
> **Frontend Stack:** React 19, Vite 8, React-Leaflet, CSS Custom Properties

---

## 1. Visual Foundation & Philosophy

The user interface is designed for public civic engagement and rapid municipal dispatch. It prioritizes clarity, high accessibility under direct sunlight on mobile displays, clear status legibility, and minimal cognitive load during roadside incident reporting.

---

## 2. Typography

The system utilizes clean, modern, native system font stacks for zero layout shifts and instant page rendering:

```css
font-family: 'Segoe UI', system-ui, -apple-system, Roboto, sans-serif;
```

### Hierarchy & Scale

| Token / Element | Font Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| **Display / Hero H1** | `2.2rem` (35px) | `700` Bold | `1.2` | Landing page hero header |
| **Page Head H1** | `1.7rem` (27px) | `700` Bold | `1.25` | Main portal page titles (`Report a pothole`, `Government dashboard`) |
| **Section H2** | `1.1rem` (18px) | `600` Semi-bold | `1.3` | Card headers, form sections, module headings |
| **Eyebrow** | `0.75rem` (12px) | `700` Bold | `1.0` | Uppercase category tags (`CIVIC TECH · VADODARA`) |
| **Body (Default)** | `1.0rem` (16px) | `400` Regular | `1.5` | Standard paragraphs, inputs, instructions |
| **Subtext / Muted** | `0.85rem` – `0.92rem` | `400` / `500` | `1.4` | Table data, hints, timestamps, metadata |
| **Counter Value** | `2.0rem` (32px) | `700` Bold | `1.0` | Live statistic counters (tabular numbers) |

---

## 3. Color Palette & Design Tokens

Defined centrally via CSS custom properties in `client/src/styles/global.css`:

### 3.1 Primary & Neutral Tokens

| Token | Hex Value | Role |
|---|---|---|
| `--primary` | `#1f5f8b` | Deep Civic Blue (buttons, active navigation, brand elements) |
| `--primary-hover` | `#184d72` | Darker blue for hover states |
| `--primary-text` | `#ffffff` | High-contrast text on primary buttons |
| `--accent` | `#f5b83d` | Warm Gold / Accent (action highlights, warnings, alerts) |
| `--bg` | `#f4f6f8` | Neutral soft gray canvas background |
| `--surface` | `#ffffff` | Pure white container & card background |
| `--surface-2` | `#eef2f5` | Secondary surface (table headers, input containers) |
| `--text` | `#17212b` | Near-black high-contrast body text |
| `--muted` | `#5d6b78` | Slate gray for secondary text and hints |
| `--border` | `#dbe2e8` | Subtle border stroke for cards and dividers |

### 3.2 Status & Lifecycle Tokens

The color system clearly communicates the urgency and progress of road repairs on both map markers and badge chips:

| Status Key | Label | Color Token | Hex Code | Visual Meaning |
|---|---|---|---|---|
| `pending_verification` | Pending Verification | Neutral Gray | `#7a8594` | Submitted; awaiting AI initial inspection |
| `under_review` | Under Review | Warning Amber | `#b7791f` | AI confidence borderline; flagged for admin review |
| `rejected` | Rejected | Crimson Red | `#8c3b3b` | AI or admin determined no valid pothole |
| `active` | Active | Bright Red | `#d64545` | Verified genuine pothole; awaiting municipal assignment |
| `assigned` | Assigned | Deep Orange | `#dd6b20` | Assigned to a specific Ward / Zone department |
| `in_progress` | Repair in Progress | Gold / Yellow | `#d69e2e` | Repair crew deployed on site |
| `repair_completed` | Repair Completed | Steel Blue | `#3182ce` | Work finished; awaiting after-photo AI verification |
| `solved` | Solved | Forest Green | `#2f855a` | Verified repaired by AI and GPS; closed |

---

## 4. UI Components & Layout Guidelines

### 4.1 Card & Container System
- **Container Max-Width:** `1180px` centered with `16px` padding.
- **Card Radius:** `12px` (`--radius: 12px;`).
- **Elevation / Shadow:** `0 1px 2px rgba(16, 24, 40, 0.06), 0 1px 3px rgba(16, 24, 40, 0.08)`.

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
