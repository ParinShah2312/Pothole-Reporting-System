# Phase-wise Implementation Plan

> **Project:** Smart Civic Road Issue Reporting & AI-Based Pothole Verification System
> **Status:** Phase 3 Completed (2026-11-27) · Next: Phase 4 (AI Dataset & YOLO Training). Edit freely; record changes in the Change Log at the bottom.
> **Related:** [README.md](README.md) holds the project description and design decisions. This file covers **how and in what order** we build it.

**Approach:** Agile / Scrum with 2–3 week sprints, grouped into the six phases from the guide presentation. We build in **vertical slices**: each feature goes through database → API → UI at once, so something demonstrable exists at every checkpoint.

---

## Overview

| Phase | Name | Duration | Main output |
|---|---|---|---|
| 0 | **Demo Slice** (for the guide demo) | 1 day (**completed**) | End-to-end working loop with stubbed AI |
| 1 | Requirements & Design (finish) | ~1 month (**completed**) | ER diagram, API spec, wireframes, locked SRS/SDS/Report |
| 2 | Backend, Database & Citizen Portal | 2–3 months (**completed**) | Multi-photo + EXIF GPS, hardened JWT auth, lockout, citizen verify/reset/profile *(Cloudinary & Notifications postponed)* |
| 3 | Map & Government Portal (+ Admin) | 2 months (**completed**) | Clustered map, Nominatim search, SSE counters, Gov filters & escalation, Admin portal, `/stats` |
| 4 | AI Dataset, Training & Integration | 2–3 months (**next**) | Trained YOLO model, location and repair verification |
| 5 | Testing & Security Hardening | 1–2 months | Test suite, security checklist complete |
| 6 | Integration, Docs & Deployment | 1 month | Deployed system, final report |

---

## Phase 0: Demo Slice ✅ built 2026-10-13

**Goal:** show the whole loop working once, from citizen report to AI check, government repair, and the counters updating. This is a thin version of the real code, not a throwaway prototype. Later phases build on it.

### Demo storyline
1. The landing page shows the **Total / Active / Solved** counters and a Vadodara map with markers.
2. A citizen registers and logs in, then opens **Report Pothole**. The browser asks for **location permission**, the pin auto-places, and the citizen can drag it. They take or upload a photo and submit.
3. The report goes **Pending → AI check (stub) → Active**. The marker appears and the counters update.
4. A government user logs in, sees the report on their dashboard, and moves it **Assigned → In Progress → Repair Completed**.
5. The government user uploads a completion photo, the repair AI check runs (stub), and the report becomes **Solved**. The counters update: Active −1, Solved +1.

### Tasks
- [x] **Database:** migrations for `users`, `departments`, `reports` (with PostGIS location), `report_images`, `ai_verifications`, `repairs`, `completion_images`, `status_history` (plus `notifications`, `audit_logs`); seed one user per role, 4 departments and 8 reports
- [x] **Server (Express):**
  - [x] project setup, DB pool and error handling
  - [x] auth: register and login with JWT and roles
  - [x] create report with image upload
  - [x] list reports for the map (public)
  - [x] list own reports (citizen)
  - [x] counters endpoint
  - [x] government endpoints: list reports, update status, upload completion image
  - [x] HTTP call to the AI service, with status history written on every change
- [x] **AI service (FastAPI, in a venv):** `/health`, `/detect/pothole`, `/verify/repair`, returning **stub** results (configurable)
- [x] **Client (React + Vite):**
  - [x] landing page with counters and map
  - [x] register and login
  - [x] report form: geolocation permission, draggable Leaflet pin, camera or file input
  - [x] citizen "My Reports" with status badges
  - [x] government dashboard with status controls and completion upload
- [x] **Demo data:** a few seeded reports around Vadodara so the map isn't empty

### Shortcuts taken for the demo (fix in later phases)
| Shortcut | Proper version (phase) |
|---|---|
| Images saved to local `server/uploads/` | Cloudinary (Phase 2) |
| AI returns stub results | Trained YOLO model (Phase 4) |
| No email verification or password reset | Phase 2 |
| Basic validation only | Full validation, rate limiting and security (Phases 2 and 5) |
| Counters refresh every 15 s (simple polling) | Live update (polling or SSE), Phase 3 |
| Location checks are basic (pin and GPS stored) | Full rule-based location verification (Phase 4) |
| No admin UI (admin can log in to the Government portal) | Phase 3 |
| Initial AI check is called in the background with no retry; repair check runs while the user waits | Retry and review-queue handling (Phase 3) |

**Exit criteria:** the five-step storyline runs on `localhost` without errors. ✅ Backend flow tested end to end.

### Phase 0 Demo Guide (what's built and how to show it)

#### A. Start the system
Run these from `C:\Parin\Projects\MAJOR`:

| Step | Command | What it does |
|---|---|---|
| 1 | *(nothing)* | PostgreSQL runs as a Windows service and starts with Windows |
| 2 | `npm run db:reset` | **DEV ONLY.** Wipes the database and reloads the demo data. Run it before every demo for a clean start |
| 3 | `npm run dev` | Starts all three services in one terminal (see below). **Ctrl+C** stops all of them |
| 4 | Open **http://localhost:5173** | The web app |

| Service | URL | Log prefix |
|---|---|---|
| Web app (React + Vite) | http://localhost:5173 | `[web]` |
| API (Node + Express) | http://localhost:5000/api | `[api]` |
| AI service (FastAPI, stub) | http://localhost:8000 (API docs at http://localhost:8000/docs) | `[ai]` |

If you get "port already in use", an old run is still open. Close it, or run `Get-Process node, python | Stop-Process` in PowerShell. That command stops **every** Node and Python process on your machine, so close any other Node or Python programs first.

#### B. Demo accounts

| Role | Email | Password | Log in at |
|---|---|---|---|
| Citizen | `citizen@demo.local` | `Citizen@123` | `/login` (navbar → **Log in**) |
| Government (East Zone officer) | `gov@demo.local` | `Gov@12345` | `/gov/login` (footer → **Government login**) |
| Admin | `admin@demo.local` | `Admin@1234` | `/gov/login` (no admin screens yet; sees the government portal) |

- Each portal only accepts its own roles. A citizen on the government login gets *"This login is for government staff only"*, and staff on the citizen login are told to use the Government portal.
- You can also register a new citizen at `/register` (password: at least 8 characters, with a letter and a number).

#### C. Demo data after `db:reset`
- **4 departments:** Road Maintenance – North, South, East and West Zone.
- **8 reports**, all filed by the demo citizen:

| Area | Status |
|---|---|
| Alkapuri, Gotri Road, Karelibaug | Active |
| Fatehgunj | Assigned |
| Akota | Repair in progress |
| Manjalpur | Repair completed (needs a completion photo) |
| Sayajigunj, Waghodia Road | Solved |

- Starting counters: **Total 8 · Active 6 · Solved 2**.
- The seed photos are grey placeholder images labelled "seed data".

#### D. Screens

| Page | URL | Who | What it shows |
|---|---|---|---|
| Landing | `/` | Everyone | Counters, city map with colour-coded markers, "How it works" in 6 steps |
| Live map | `/map` | Everyone | Full map, filter by status, marker popups (photo, status, date) |
| Register / Log in | `/register`, `/login` | Citizens | Account creation (with field errors) and login |
| Report a pothole | `/citizen/report` | Citizen | 1. Location (permission prompt, GPS pin, drag to adjust, manual fallback) · 2. Photo (opens the camera on phones) · 3. Description |
| My reports | `/citizen` | Citizen | Own reports with status badges and counters |
| Report details | `/citizen/reports/:id` | Citizen (own reports) | Photo, location map, AI result, status timeline; shows "AI is checking…" until the result arrives |
| Government login | `/gov/login` | Staff | Separate login for staff |
| Government dashboard | `/gov` | Staff | Counters, tabs (Needs action / each status / All), report table and map |
| Government report details | `/gov/reports/:id` | Staff | Everything above plus location flags, the **Next step** action, and the completion-photo upload |

**Map colours:** 🔴 Active · 🟠 Assigned · 🟡 In progress · 🔵 Repair completed · 🟢 Solved

#### E. Step-by-step demo walkthrough

**Part 1: Public view (about 1 minute)**
1. Open `/`. Show the **Total 8 / Active 6 / Solved 2** counters and the markers across Vadodara.
2. Open **Live map** and switch status filters on and off. Click a marker to show its popup.

**Part 2: Citizen reports a pothole (about 3 minutes)**
3. **Log in** as `citizen@demo.local` / `Citizen@123`. You land on **My reports** with the 8 seeded reports.
4. Click **Report a pothole**. Explain the location card: the app asks before reading your location.
5. Click **Use my current location** and choose **Allow** in the browser prompt.
   - The pin drops at your GPS position, with a blue accuracy circle.
   - Drag the pin, or click the map, to the exact spot. It shows how far the pin is from your GPS.
   - If you move it more than 200 m, a warning appears, and the report is flagged for review but not blocked.
   - *(Optional)* Click **Place pin manually** instead, to show what happens if location is refused.
6. Choose a photo (any JPG or PNG; on a phone this opens the camera), add a description, and click **Submit report**.
7. The details page shows **"🤖 AI is checking your photo…"**. About 1.5 s later the status becomes **Active**. The AI card says *Accepted · 87%*, and the timeline shows *Pending verification → Active (by system, AI)*.
8. Go back to `/`. The counters are now **Total 9 · Active 7**.

**Part 3: AI rejection (optional, about 1 minute)**
9. Submit another report with a photo whose **file name contains `reject`** (e.g. `road-reject.jpg`). It becomes **Rejected** with a low confidence, and the counters **don't change**: rejected reports are never counted.
   - A file name containing `review` gives 50% and **Under review** instead.

**Part 4: Government repairs it (about 3 minutes)**
10. **Log out**, then open **Government login** in the footer. Log in as `gov@demo.local` / `Gov@12345`.
11. On the dashboard, open your new report from **Needs action** (the table row or its map marker). The government view also shows location flags, such as "Pin moved far from GPS location".
12. Work through **Next step**:
    - Choose a department, then **Assign to department**: status becomes **Assigned**.
    - **Start repair**: status becomes **Repair in progress**.
    - **Mark repair completed**: status becomes **Repair completed**, and the completion-photo form appears.
    - Each step adds a timeline entry with the officer's name.

**Part 5: Repair verification (about 2 minutes)**
13. The completion map shows the **red dot** (the original report) and a draggable pin, which starts on the red dot.
14. **Show the location check failing:** drag the pin more than 50 m away, choose a photo, and submit. The result is **"Repair not verified: Photo was taken N m from the report (limit 50 m)"**, and the status stays **Repair completed**.
15. Drag the pin back onto the red dot and submit again. The result is **"Repair verified… Report marked solved"**, and the status is **Solved**.
16. Open `/`. The counters are **Total 9 · Active 6 · Solved 3**: Active went down, Solved went up, and Total didn't change.
17. *(Optional)* Log in as the citizen again. The report shows **Solved**, with the full timeline and both photos.

**Shortcut:** to demo only the repair check, use the seeded **Manjalpur** report. It's already at *Repair completed*.

#### F. What happens behind the scenes (for questions)
- **AI call:** after a citizen submits, the API saves the report as `pending_verification` and replies straight away. It then sends the photo to the FastAPI service in the background.
- **AI thresholds:** confidence ≥ 0.6 makes the report **Active**, < 0.4 makes it **Rejected**, and anything in between goes to **Under review**. Both values can be changed in `server/.env`.
- **Status rules:** every status change goes through one function (`server/src/services/statusService.js`). It blocks invalid jumps (e.g. Active → In progress), writes **status history**, and creates a **notification** for the citizen. Logins and actions go to the **audit log**.
- **Location flags** on each report:
  - `manual_location`: no GPS was used;
  - `pin_moved_far`: the pin is more than 200 m from GPS;
  - `low_gps_accuracy`: GPS accuracy was worse than 100 m;
  - `possible_duplicate`: an open report already exists within 25 m (checked with PostGIS `ST_DWithin`).
- **Repair check:**
  - the completion photo's distance from the report is measured with PostGIS;
  - it must be within 50 m, **and** the AI must say "repaired";
  - only then does the report become **Solved**, with `solved_at` recorded.
- **Counters:** Total counts verified reports (`verified_at` is set), Solved counts `status = 'solved'`, and Active = Total − Solved.

#### G. Implemented API (Phase 0)

| Method | Path | Role |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | Public |
| GET | `/api/auth/me` | Logged in |
| GET | `/api/stats/counters`, `/api/reports/map` | Public |
| POST | `/api/reports` (multipart: `image`, `lat`, `lng`, `gps_lat`, `gps_lng`, `gps_accuracy`, `description`) | Citizen |
| GET | `/api/reports/mine` | Citizen |
| GET | `/api/reports/:id` | Owner citizen, staff (verified reports) |
| GET | `/api/gov/reports?status=`, `/api/gov/departments` | Government, admin |
| PATCH | `/api/gov/reports/:id/status` (`status`, `departmentId`, `note`) | Government, admin |
| POST | `/api/gov/reports/:id/completion` (multipart: `image`, `lat`, `lng`) | Government, admin |
| GET / POST | AI service: `/health`, `/detect/pothole`, `/verify/repair` | Internal |

#### H. Where the code lives

| Area | Path |
|---|---|
| Database schema | `database/migrations/001_initial_schema.sql` |
| Migrate / seed / reset scripts | `server/scripts/` |
| API routes → controllers → services → repositories | `server/src/` |
| Uploaded photos (Phase 0, local) | `server/uploads/` (git-ignored) |
| Stub AI logic | `ai-service/app/services/detector.py` |
| React pages | `client/src/pages/` (public, auth, citizen, government) |
| Map components | `client/src/components/map/` |
| Settings | `server/.env`, `client/.env`, `ai-service/.env` (copies of the `.env.example` files) |

#### I. Known limitations of the demo
- The AI is a **stub**. It doesn't look at the image; the result depends only on the file name (see Part 3).
- **No admin screens yet:** rejected and under-review reports can't be overridden from the UI.
- Notifications are stored but **not shown** in the UI yet.
- Photos are stored locally rather than on Cloudinary, and there's no email verification or password reset.
- On a laptop, browser GPS can be off by hundreds of metres (Wi-Fi based). That's why the completion pin starts on the report location.

---

## Phase 1: Requirements & Design ✅ completed

**Goal:** close the open design decisions so later phases aren't blocked.

- [x] Finalise the **status list** and allowed transitions (README §4)
- [x] Final **database schema**: tables, columns, types, constraints and indexes, including the PostGIS geography index
- [x] **ER diagram**, exported to `docs/diagrams/`
- [x] **System architecture diagram**
- [x] **API specification**: every endpoint with method, path, role and request/response shape
- [x] **Wireframes** and UI screenshots in `docs/diagrams/`
- [x] Decided: multiple images (1–5) per report, 4 Vadodara zone departments, email verification gate on reporting *(in-app notifications UI & Cloudinary postponed)*
- [ ] Verify the **pothole dataset**: size, label format and licence *(scheduled for Phase 4)*
- [x] Write the locked **SRS**, **SDS**, and **Project Report** (in `docs/reports/`)

**Exit criteria:** Schema, API spec, wireframes, and formal SRS/SDS/Project Report completed.

---

## Phase 2: Backend, Database & Citizen Portal ✅ built 2026-11-27

**Goal:** the complete citizen side on a production-quality backend.

### Backend
- [x] SQL migrations set up (`001_initial_schema.sql` + `002_auth_hardening.sql` with `refresh_tokens` and `auth_tokens`)
- [x] Auth:
  - [x] register, login, logout (token revocation via `refresh_tokens`)
  - [x] JWT short-lived access tokens (`15m`) and rotating refresh tokens (`7d`)
  - [x] bcrypt password hashing (`bcryptjs`)
  - [x] email verification & password reset (`POST /api/auth/verify-email`, `resend-verification`, `forgot-password`, `reset-password`) — *currently issues dev-mode tokenized clickable links (`devVerifyUrl` / `devResetUrl` + console logs) for local testing; **future production enhancement:** integrate outbound SMTP email with OTP code or emailed verification/reset links*
  - [x] account lockout after repeated failed logins (`5` failed attempts -> `423 Locked` for `15 minutes`)
- [x] Role-based access middleware (citizen / gov / admin) + verified-email guard on citizen submission
- [x] Report API: create, get, list own, public list for the map (only verified reports)
- [x] Multi-photo upload (1–5 photos via Multer) + EXIF GPS extraction (`exifr`, `exif_lat`, `exif_lng`, `exif_mismatch` flag) — *(Note: **Cloudinary cloud upload is postponed**; photos remain stored locally in `server/uploads/`)*
- [x] Status machine in one service: every change writes `status_history` and the `audit_log`
- [x] AI client: non-blocking call to FastAPI after the report is saved; updates status and counters
- [x] Counters: computed with a SQL `COUNT` query, with the Total = Active + Solved invariant tested
- [x] Duplicate check with `ST_DWithin` (200 m radius)
- [ ] In-app notifications table and API *(Schema created in PostgreSQL; **notifications API & Notification Center UI postponed** for now)*
- [x] Input validation (`zod` schemas), rate limiting (`express-rate-limit` `authLimiter` / `uploadLimiter`), and central error handling

### Citizen portal
- [x] Landing page (counters, map preview, call-to-action buttons)
- [x] Register, login, verify email (`/verify-email`), forgot/reset password (`/forgot-password`, `/reset-password`), silent refresh rotation
- [x] Report Pothole page (live camera capture, 1–5 multi-photo preview, location permission flow, manual-pin fallback, description)
- [x] Citizen dashboard (My Reports, status badges, email-verification status banner)
- [x] Report details (multi-photo gallery, map location, EXIF & spatial flags, status timeline, AI result)
- [x] Profile (`/citizen/profile` — edit display name & change password)
- [ ] Notifications list *(Postponed alongside notifications API)*

**Exit criteria:** Citizen reporting, EXIF cross-check, auth hardening, and `npm --prefix server test` (`server/tests/phase2.test.js`) pass cleanly.

---

## Phase 3: Map & Government Portal (+ Admin) ✅ built 2026-11-27

### Map
- [x] Live map: colour-coded markers by status, **marker clustering** (`leaflet.markercluster`), popup summary, status filter, location search (OpenStreetMap Nominatim)
- [x] Live counters (`GET /api/stats/stream` SSE + 15 s fallback polling)
- [x] GPS accuracy circle (amber alert highlight) and weak-signal warning banner (`> 25 m` / `> 100 m`)

### Government portal
- [x] Separate government login (rejects citizen accounts)
- [x] Dashboard: report list with filters (status, department/zone, date range, area/#ID search, `flagged` filter), synchronized map view, workload summary cards
- [x] Problem details: images, location, AI result, status controls, assign to department/team, repair notes
- [x] Completion image upload: **live capture** (`capture="environment"`), preview thumbnail, visual `50 m` geo-fence circle, retry & Admin escalation (`under_review`)

### Admin
- [x] User management (`/admin/users` — list/filter users, create government/admin officers, suspend or activate accounts with refresh-token revocation)
- [x] **Review queue** (`/admin/review` — `under_review`, `rejected`, and location-flagged reports with override to `active`/`solved`/`rejected` & flag clearance)
- [x] Audit log viewer (`/admin/audit-logs`)
- [x] Settings (`/admin/settings` — `003_admin_settings.sql` `app_settings` table for live AI thresholds & spatial radii)

### Stats
- [x] Statistics dashboard (`/stats` + `GET /api/stats/trends` — time-series daily Reported vs. Solved chart, date range presets, status & zone workload breakdowns)

**Exit criteria:** Complete multi-role Citizen → Gov → Admin loop runs end-to-end and `npm --prefix server test` (`phase2.test.js` + `phase3.test.js` `6/6`) passes; only the AI weights remain stubbed for Phase 4.

---

## Phase 4: AI Dataset, Training & Integration

### Pothole detection
- [ ] Gather and clean the dataset (candidate dataset plus local Vadodara photos if possible); split into train/val/test
- [ ] Train YOLO with Ultralytics in the `ai-service` venv; notebooks and scripts go in `training/`
- [ ] Evaluate precision, recall, F1 and mAP@0.5; record the results
- [ ] Choose the **accept / reject / manual-review** thresholds from the validation curves
- [ ] Load the model in FastAPI (`/detect/pothole`) and turn off stub mode

### Location verification (rule-based)
- [ ] Vadodara boundary check (polygon in PostGIS)
- [ ] Near-road check against OpenStreetMap road data
- [ ] Pin-moved distance and GPS accuracy checks
- [ ] EXIF GPS cross-check, when the photo has GPS data
- [ ] Combine into a location confidence score and list of flags, sent to the review queue

### Repair verification
- [ ] Same location: completion GPS within the configured radius of the report
- [ ] Repaired: the detector finds no pothole in the completion image
- [ ] (Optional) image-similarity score between the before and after photos
- [ ] Uncertain or failed results go to manual review

**Exit criteria:** the real model is live, with documented metrics and thresholds.

---

## Phase 5: Testing & Security Hardening

- [ ] Unit tests (services, status machine, counters) and API integration tests
- [ ] Frontend tests for the main flows; end-to-end test of the full loop (e.g. Playwright)
- [ ] AI service tests (stub mode and model mode)
- [ ] Work through the README §10 security checklist:
  - [ ] rate limiting, CORS, security headers (`helmet`)
  - [ ] upload hardening, SQL injection / XSS / CSRF review
  - [ ] secrets kept out of the code
- [ ] Concurrency test of the counters (no race conditions)
- [ ] Usability testing with a few real users; fix the issues found
- [ ] Performance check of the map with many markers

**Exit criteria:** all tests pass; checklist complete; no known high-severity issues.

---

## Phase 6: Integration, Docs & Deployment

- [ ] Choose hosting (e.g. frontend on Vercel or Netlify; API and AI service on Render or Railway; PostGIS on Neon or Supabase)
- [ ] Production `.env` files, HTTPS (required for browser geolocation), production CORS
- [ ] Migrate the data to the hosted database
- [ ] Final README and API docs; user guide for citizens and government users
- [ ] Project report: Implementation, Testing, Results, Limitations, Future Scope, Conclusion, References
- [ ] Final presentation and demo

---

## Appendix A: API Endpoints

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | public | Citizen registration (`authLimiter`) + issues verify token |
| POST | `/api/auth/login` | public | Login (`authLimiter`, 5-attempt `423` lockout) |
| POST | `/api/auth/refresh` | public | Rotate refresh token & issue new 15m access token |
| POST | `/api/auth/logout` | public | Revoke refresh token session |
| POST | `/api/auth/verify-email` | public | Verify citizen email via `auth_tokens` |
| POST | `/api/auth/resend-verification` | any | Issue fresh verification link (`authLimiter`) |
| POST | `/api/auth/forgot-password` | public | Request password reset link (`authLimiter`) |
| POST | `/api/auth/reset-password` | public | Complete password reset & clear lockout |
| GET | `/api/auth/me` | any | Current user profile |
| PATCH | `/api/auth/profile` | any | Update current user name |
| PATCH | `/api/auth/password` | any | Change password & revoke prior refresh sessions |
| GET | `/api/stats/counters` | public | Total / Active / Solved |
| GET | `/api/stats/stream` | public | Real-time SSE counter stream |
| GET | `/api/stats/trends` | public | Daily trends, status & department breakdowns |
| GET | `/api/settings/public` | public | Active spatial radius thresholds |
| GET | `/api/reports/map` | public | Verified reports for the map |
| POST | `/api/reports` | verified citizen | Submit report (1–5 images + EXIF GPS + location) |
| GET | `/api/reports/mine` | citizen | Own reports |
| GET | `/api/reports/:id` | owner / gov / admin | Report details, multi-photo gallery and history |
| GET | `/api/gov/reports` | gov | Filterable report list (`status`, `departmentId`, `from`, `to`, `q`, `flagged`) |
| PATCH | `/api/gov/reports/:id/status` | gov | Assign, update progress, or escalate (`under_review`) |
| POST | `/api/gov/reports/:id/completion` | gov | Upload completion image |
| GET | `/api/admin/review-queue` | admin | Flagged, `under_review`, or rejected reports |
| PATCH | `/api/admin/reports/:id/override` | admin | Override status & clear flags |
| GET / POST / PATCH | `/api/admin/users` | admin | User management & officer provisioning |
| GET | `/api/admin/audit-logs` | admin | Audit trail |
| GET / PATCH | `/api/admin/settings` | admin | Runtime AI & spatial thresholds (`app_settings`) |

**AI service (internal):** `GET /health`, `POST /detect/pothole`, `POST /verify/repair`

## Appendix B: Report Statuses

`pending_verification` → `active` → `assigned` → `in_progress` → `repair_completed` → `solved`

Side states: `rejected`, `under_review` (uncertain AI, location flags, or officer escalation).

---

## Change Log

| Date | Change |
|---|---|
| 2026-10-13 | v1 drafted: added Phase 0 demo slice for the guide demo |
| 2026-10-13 | Phase 0 built: schema, Express API, FastAPI stub, React app, seed data, root `npm run dev`. Location stored on `reports` (1-to-1). |
| 2026-10-13 | Added the Phase 0 Demo Guide (start-up, accounts, seed data, screens, walkthrough, API, code map, limitations) |
| 2026-11-27 | Phase 2 completed: `002_auth_hardening.sql`, Zod validation, `exifr` EXIF GPS check, 1–5 multi-photo upload, JWT refresh rotation, logout revocation, 5-attempt `423` lockout, rate limiting, `/verify-email`, `/forgot-password`, `/reset-password`, `/citizen/profile`, and `npm --prefix server test` (`phase2.test.js`). Documented deferred Cloudinary upload, deferred In-App Notifications, and dev-mode email/reset links vs future outbound SMTP/OTP delivery. |
| 2026-11-27 | Phase 3 completed: `003_admin_settings.sql`, `leaflet.markercluster`, OpenStreetMap Nominatim search, weak-GPS warnings, SSE `/api/stats/stream`, `/stats` analytics dashboard, multi-filter Gov dashboard + `50 m` geo-fence + escalation, full `/admin/*` portal (review queue, user management, audit logs, live threshold settings), and `phase3.test.js` (`6/6` backend tests passing). |
