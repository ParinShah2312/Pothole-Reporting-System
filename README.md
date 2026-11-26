# Smart Civic Road Issue Reporting & AI-Based Pothole Verification System

> **Status:** Phases 0–3 Completed (Full Public, Citizen, Gov & Admin Portals Live) · Next: Phase 4 (YOLO Dataset & Training)
> **City:** Vadodara, Gujarat, India
> **Team:** Parin Shah (23001091) · Ujjaval Rathod (23001113)

A full-stack web platform that gives citizens a direct, verifiable channel to report potholes and track their repair. AI checks both ends of the process: when a citizen reports a pothole, and when the government says it has been fixed. A report closes only after the repair has been confirmed.

---

## 1. The Problem

- Road damage is widespread across Vadodara and affects commutes, vehicle safety and travel time.
- No dedicated channel links the citizen who spots a pothole to the authority responsible for fixing it.
- The only official complaint process is slow and manual, and citizens can't see whether or when a report leads to a repair.
- Similar apps exist for cities in the US and UK. None target Indian cities, and none exist for Vadodara.

## 2. The Solution: a Closed Loop

```
 Citizen reports ──► AI verifies image ──► Authority assigns & repairs ──► AI verifies repair ──► Solved
 (photo + GPS)       (genuine pothole?)    (department / repair team)      (same place? fixed?)    (counters update)
```

Uncertain AI results at either stage go to manual review by an administrator. The loop never closes on a guess.

### Objectives
1. Reduce the time it takes to report a road problem.
2. Automate verification so genuine reports move faster.
3. Show citizens the repair status of each report, area by area.

### Scope (what we build)
- **Citizen portal:** registration and login, report submission, status tracking, live map
- **Government/Municipal portal:** problem management, assignment, repair updates, completion images
- **Two-stage AI verification:** the report image (is there a pothole?) and the completion image (same location, and repaired?)
- **Live counters:** Total, Active and Solved problems
- **Admin tools:** user management, audit logs, status override, AI threshold configuration

### Out of scope (for now)
- Mobile app (possible future work)
- Real-time hardware integration (sensors, dashcams, etc.)

---

## 3. User Roles

| Role | Can do | Can see |
|---|---|---|
| **Citizen** | Register, log in, submit reports with image and location, track own reports | Own reports, public map, live counters, own profile |
| **Government / Municipal user** | Log in to the separate Government portal, view verified reports, assign to teams or departments, update status (Assigned, In Progress, Completed), upload completion images, review AI repair results | All verified reports, report details (location, images, AI status), repair history, dashboard stats |
| **Administrator** | Manage all accounts including Government users, suspend or remove users, override report status, review rejected or uncertain reports, configure AI thresholds, view audit logs | Everything: all users, all reports, system logs, audit trail |

Rules: citizens can never reach the Government portal, Government users cannot modify citizen accounts, and admin access is tightly restricted.

---

## 4. Report Lifecycle (State Machine)

This combines the Notion workflows (A–I) into one status model.

```
[Pending Verification] ──AI: pothole (≥ 0.6)──► [Active] ──gov assigns──► [Assigned]
        │                                          ▲
        ├──AI: no pothole (< 0.4)──► [Rejected] ───┤ admin override
        │                                          │
        └──AI: uncertain──► [Under Review] ────────┘ admin approves (or rejects)

[Assigned] ──gov──► [Repair In Progress] ──gov──► [Repair Completed] ──gov uploads completion photo──►
        repair check (photo ≤ 50 m default [configurable] from report AND AI says repaired)
              ├── passed ──► [Solved]
              ├── escalated (gov note) ──► [Under Review] ──► admin override (Active / Solved / Rejected)
              └── failed ──► stays [Repair Completed]; gov fixes the issue, retries, or escalates
```

| Status | Meaning | Set by |
|---|---|---|
| Pending verification | Just submitted; AI check running | System |
| Under review | AI result uncertain, or officer escalated repair check; admin must decide | System (AI) / Gov |
| Rejected | AI found no pothole (an admin can override) | System (AI) / Admin |
| Active | Verified pothole, waiting for action | System (AI) / Admin |
| Assigned | Routed to a department | Government |
| Repair in progress | Crew working on site | Government |
| **Repair completed** | Government **says** the work is done; waiting for the completion photo to be **verified** | Government |
| **Solved** | Repair **verified** (photo location and AI check passed, or admin override); report closed, counters updated | System (AI) / Admin |

*Repair completed* and *Solved* are deliberately separate. This is the "verify again" step: a report only closes when the fix is confirmed, not when someone claims it is.

Every transition is written to **Status History**, recording who made the change and when. Significant actions also go to the **Audit Log**.

### Workflows (from Notion)
| ID | Workflow | Summary |
|---|---|---|
| A | Registration / Login | Register (name, email, password), Zod validation & email verification (dev links now; SMTP/OTP planned for production); login with 15m JWT + 7d refresh rotation & 5-attempt lockout |
| B | Report a Pothole | Map, then "Report a Problem", 1–5 photos, EXIF + GPS or map-pin location, and optional description. Report saved as *Pending Verification* |
| C | AI Verification (report) | Above accept threshold (`0.60`): *Active* (+1 Active). Below reject (`0.40`): *Rejected*. In between: *Under Review* |
| D | Government Review | Gov user filters verified reports, reviews details/flags, and assigns to a zone department (*Assigned*) |
| E | Repair | *In Progress*, then *Repair Completed* |
| F | Completion Submission | Gov captures after-repair photo within the visual `50 m` geo-fence circle and submits for AI check |
| G | AI Verification (repair) | (a) Same location as the original (`<= 50 m` default)? (b) Is the pothole repaired? Failed checks allow retry or escalation to *Under Review* |
| H | Resolution | Status becomes *Solved*: Active −1, Solved +1, Total unchanged; notification persisted in DB (*notification UI postponed*); report appears in public history |
| I | Rejected / Review Handling | Admin reviews flagged, rejected, or escalated reports in `/admin/review`, then overrides (`active`/`solved`/`rejected`) or clears flags |

---

## 5. Live Counters

```
Total  = COUNT of AI-verified (valid) reports        — cumulative, never decreases
Active = COUNT of verified reports with status ≠ Solved
Solved = COUNT of reports with status = Solved
Invariant: Total = Active + Solved
```
- **Decided:** only AI-verified reports (or reports an admin approved) are counted. Pending Verification, Under Manual Review and Rejected reports are **never** counted, so Total never has to decrease.
- Duplicates are flagged via PostGIS `ST_DWithin` (`25 m` default, configurable in `/admin/settings`).
- Counter updates are computed directly from PostgreSQL and pushed live over Server-Sent Events (`GET /api/stats/stream`) with `15 s` polling fallback.

---

## 6. Technology Stack

| Layer | Choice |
|---|---|
| Frontend | **React 19 + Vite 8 + React Router 7** |
| Backend / API | **Node.js + Express 5 + Zod + `exifr` + `express-rate-limit`** |
| Database | **PostgreSQL + PostGIS** (geospatial queries, nearby/duplicate detection, `app_settings`) |
| Image storage | **Local Disk (`server/uploads/` via Multer)** *(Cloudinary postponed)* |
| Maps | **Leaflet.js + OpenStreetMap + `leaflet.markercluster` + Nominatim search** |
| AI model | **YOLO-based detection** *(stub active until Phase 4 training)* |
| AI service | **Python + FastAPI** microservice |
| Auth | **JWT (15m) + rotating refresh tokens (7d)**, RBAC, lockout |

**AI service (decided):** the YOLO model runs in a separate **Python FastAPI** service with its own **virtual environment (`venv`)**. The Node backend calls it over plain HTTP. We are not running the model inside Node (no ONNX) and not using a message queue.
1. Node saves the report as *Pending Verification* and responds to the citizen immediately.
2. Node then sends the image to FastAPI in the background.
3. FastAPI returns `{ detected, confidence, boxes }`.
4. Node updates the report status, status history and counters.

Until the model is trained in Phase 4, the FastAPI endpoint returns a **stub** result, so the citizen and government flows can be built and tested first.

### High-level architecture
```
 ┌──────────────┐     ┌────────────────────┐     ┌──────────────────────┐
 │ React SPA    │────►│ Node/Express API   │────►│ PostgreSQL + PostGIS │
 │ Citizen +    │ JWT │ auth, RBAC, reports│     └──────────────────────┘
 │ Gov + Admin  │◄────│ SSE stats, admin   │────►  server/uploads/ (local; Cloudinary postponed)
 │ Leaflet/OSM  │     └─────────┬──────────┘
 └──────────────┘               │ HTTP
                       ┌────────▼──────────┐
                       │ Python AI service │  YOLO pothole detection
                       │ (venv)            │  + repair verification
                       └───────────────────┘
```

---

## 7. AI / ML Module

| Task | Input | Output | Notes |
|---|---|---|---|
| **A. Pothole detection** | Citizen image | Detected / Not detected and confidence | YOLO candidate; dataset identified but **not yet verified** (Pothole-600 or public road-damage sets are options) |
| **B. Location verification** | Device GPS and accuracy, final pin, photo EXIF GPS (if present) | Location confidence and list of flags | **Rule-based**, no ML (see 7.1) |
| **C. Repair verification** | Completion image, original image, coords | Confirmed / Not confirmed and confidence | (a) same location: the completion photo must be taken live within about **30–50 m** of the report location, with image similarity possibly added later; (b) repaired: the detector finds no pothole. Lighting, angle and weather affect accuracy |

Risks: false positives (fake or unrepaired accepted) and false negatives (real potholes rejected). Both are handled by manual review and an appeal path. Thresholds are configurable by the admin.

### 7.1 Location capture & verification (decided)

**Primary source: device GPS at the moment the photo is taken.** Photo EXIF location is only a secondary cross-check, because:
- browsers (Android Chrome, iOS Safari) often strip GPS data from photos uploaded through a web form;
- photos shared through apps such as WhatsApp lose it;
- many users have camera location turned off;
- it is easy to fake.

**Flow:**
1. **Live capture:** the upload button opens the camera directly (`<input type="file" accept="image/*" capture="environment">`), so the photo is taken at the pothole.
2. **Location permission & auto-detect:** when the citizen starts a report, the app asks for the browser's location permission (the standard "Allow location?" prompt) through `navigator.geolocation`.
   - The app first shows a short message explaining why location is needed, then triggers the browser prompt.
   - **Allowed:** the browser Geolocation API (`enableHighAccuracy: true`) reads `lat`, `lng` and `accuracy` in metres when the photo is taken.
   - **Denied or unavailable:** the citizen can still report by placing the pin manually on the map. The report is marked `location_source = manual` and gets a lower location confidence, which may send it to review. The app also shows how to turn location back on in browser settings.
   - Browsers only allow location access on **HTTPS** (or `localhost` during development), so the deployed site must use HTTPS.
3. **Adjustable pin:** a map pin is placed at the GPS point, and the user can drag it to the exact spot. If the pin moves more than about **100–200 m** from the GPS point, the report is **flagged** for review, not blocked.
4. **EXIF cross-check (bonus):** if the photo has GPS data and it is close to the pin, location confidence goes up. If it is far from the pin, the report is flagged. If there is no GPS data, nothing happens.
5. **Rule checks:**
   - inside the Vadodara boundary;
   - near a road on OpenStreetMap;
   - GPS accuracy within the limit;
   - existing reports within about **20–30 m** become a possible **duplicate**, found with a PostGIS `ST_DWithin` query.

The output is a **location confidence score with reasons**, for example "pin moved 400 m from GPS" or "EXIF mismatch". Flagged reports go to the same admin manual-review queue as uncertain AI results. Exact distance thresholds are configurable by the admin and will be tuned during testing.

**Report storage needs:** location_source (gps / manual), device GPS lat/lng and accuracy, final pin lat/lng, EXIF lat/lng (nullable), pin-moved distance, location flags, and capture timestamp.

---

## 8. Data Model (draft)

| # | Entity | Key fields (draft) |
|---|---|---|
| 1 | **User** | id, name, email, password_hash, role (citizen/gov/admin), department_id?, created_at |
| 2 | **Problem Report** | id, citizen_id, description, status, created_at |
| 3 | **Location** | report_id, latitude, longitude (PostGIS geography point), address, city; geospatial index |
| 4 | **Report Image** | id, report_id, url, uploaded_at |
| 5 | **AI Verification** | id, report_id, image_id, type (initial/completion), result, confidence, verified_at |
| 6 | **Department** | id, name, jurisdiction_area, contact |
| 7 | **Repair** | id, report_id, assigned_to, started_at, completed_at, notes |
| 8 | **Completion Image** | id, repair_id, url, uploaded_at |
| 9 | **Status History** | id, report_id, old_status, new_status, changed_by, changed_at |
| 10 | **Notification** | id, user_id, report_id, message, type, is_read, created_at |
| 11 | **Audit Log** | id, user_id, action, entity_type, entity_id, ip_address, timestamp |

Relationships: User 1–N Report · Report 1–1 Location · Report 1–N Images · Report 1–1 Repair · Repair 1–N Completion Images · Image 1–1 AI Verification · Report 1–N Status History · User 1–N Notifications · Department 1–N Gov Users. Gov-to-report handling is possibly N–N (TBD).

---

## 9. Screens (UI/UX plan)

**Public:** Landing page (live SSE counters, map preview, CTAs) · Live Map (clustered markers, status filter, Nominatim search) · Statistics dashboard (`/stats`)
**Citizen:** Register/Login · Verify Email (`/verify-email`) · Forgot/Reset Password (`/forgot-password`, `/reset-password`) · Dashboard (My Reports and status badges) · Report Pothole (1–5 images, GPS warning or pin, description) · Report Details (gallery, location, EXIF/spatial flags, status timeline, AI result) · Profile (`/citizen/profile`)
**Government:** Gov Login · Gov Dashboard (`/gov` — filtered list, summary cards, map) · Problem Details (AI result, status controls, assign, live `50 m` completion capture & Admin escalation)
**Admin:** Review queue (`/admin/review` — override / uphold) · User management (`/admin/users`) · Audit logs (`/admin/audit-logs`) · AI & spatial settings (`/admin/settings`)

---

## 10. Security & Privacy Checklist (summary)

- Passwords hashed with bcryptjs; JWT short-lived access tokens (`15m`) with rotating refresh tokens (`7d`) and logout revocation; `5`-attempt `423 Locked` account lockout (`15 min`)
- `zod` request validation, `express-rate-limit` (`authLimiter` & `uploadLimiter`), and server-enforced RBAC with a separate Government login
- Image uploads: type and size validation ($\le 8\text{ MB}$, 1–5 images via Multer), stored locally in `server/uploads/` *(Cloudinary upload postponed)*
- HTTPS, CORS, secrets kept in `.env` (never committed), input validation on client and server
- SQL injection (100% parameterized `pg` queries), XSS and CSRF protection
- Location is read only after the user grants the browser's location permission; if they deny it, they can place the pin manually. Embedded photo EXIF GPS is cross-checked (`exifr`) without blocking valid manual pins.
- Audit logging of logins, submissions and status changes

---

## 11. Timeline (12 months, Agile / Scrum, 2–3 week sprints)

| Phase | Work | Status / Duration |
|---|---|---|
| 1 | Requirements & Design | 1 month (**completed**) |
| 2 | Backend, DB & Citizen Portal | 2–3 months (**completed**) |
| 3 | Map & Government Portal (+ Admin) | 2 months (**completed**) |
| 4 | AI Dataset, Training & Integration | 2–3 months (**next**) |
| 5 | Testing & Security Hardening | 1–2 months |
| 6 | Integration, Docs & Deployment | 1 month |

---

## 12. Decisions

### Decided & Phase 2 Scope Notes
| Date | Decision |
|---|---|
| 2026-10-13 | **AI service:** a separate Python **FastAPI** microservice in its own `venv`, called by Node over HTTP. No ONNX-in-Node and no message queue. It returns a stub result until the model is trained. |
| 2026-10-13 | **Counters:** count only AI-verified or admin-approved reports. Pending, Under Review and Rejected reports are excluded. |
| 2026-10-13 | **Location:** device GPS at capture time is primary; the user can adjust the pin; a large pin move is flagged, not blocked; EXIF GPS is extracted server-side (`exifr`) as a cross-check (`exif_mismatch`); rule-based checks cover the city boundary, nearness to a road, GPS accuracy and duplicates (`ST_DWithin`). |
| 2026-10-13 | **Repair "same location":** the completion photo must be taken live within `50 m` default (`REPAIR_RADIUS_M`, configurable in `/admin/settings`) of the original report (`ST_Distance`). Image similarity may be added later. |
| 2026-11-26 | **Email verification:** Accounts can register and browse freely, but `email_verified = true` is required before submitting a pothole report (`POST /api/reports`). |
| 2026-11-26 | **Report images & storage:** Multiple images supported per report (1–5 photos, $\le 8\text{ MB}$ each). **Cloudinary cloud storage is postponed** — uploads remain stored on local `server/uploads/` disk for now. |
| 2026-11-26 | **In-app notifications (postponed):** The `notifications` table exists in PostgreSQL, while notification API endpoints and UI Notification Center are postponed. |
| 2026-11-26 | **AI dataset:** Dataset selection and training (Pothole-600 / RDD2022) deferred to Phase 4. |
| 2026-11-27 | **Dev-mode verification & reset links vs. future SMTP/OTP:** Local builds issue single-use `auth_tokens` via clickable dev links (`devVerifyUrl` / `devResetUrl` and server logs) so 1-click verification and password reset work without external email credentials. **Future improvement:** Send real outbound emails via SMTP containing either an OTP code or an emailed verification/reset link. |
| 2026-11-27 | **Real-time counters & configurable thresholds:** Live KPI cards stream via Server-Sent Events (`GET /api/stats/stream` + `15 s` polling fallback), and AI/spatial thresholds persist dynamically in `app_settings` (`/admin/settings`). |

### Still open
- [ ] Confirm exact AI confidence thresholds after model validation (Phase 4)
- [ ] Multi-department / Ward boundary polygon auto-routing
- [ ] Citizen appeal / dispute process for rejected reports
- [ ] Production hosting platform (Render/Vercel/Supabase)

---

## 13. Repository Layout

```
MAJOR/
├── client/                 # React (Vite) — public, citizen, government and admin UIs
│   ├── public/
│   └── src/
│       ├── pages/          # public/ auth/ citizen/ government/ admin/
│       ├── components/     # common/ layout/ map/ report/
│       ├── routes/ services/ context/ hooks/ utils/ styles/ assets/
├── server/                 # Node.js + Express REST API
│   ├── src/
│   │   ├── config/ routes/ controllers/ services/
│   │   ├── repositories/   # SQL (PostgreSQL + PostGIS)
│   │   ├── middleware/ validation/ utils/
│   └── tests/              # phase2.test.js, phase3.test.js
├── ai-service/             # Python FastAPI + YOLO (own venv)
│   ├── app/                # routers/ services/ schemas/ core/
│   ├── training/           # notebooks/ scripts/
│   ├── weights/ datasets/  # not committed
│   └── tests/
├── database/               # migrations/ (001–003), queries/
├── scripts/                # sync_to_notion.mjs, notion.mjs
├── docs/                   # diagrams/ reports/ presentations/
├── .gitignore
└── README.md
```
Each folder has its own `README.md` describing its subfolders. Copy each `.env.example` to `.env` and fill in the values; `.env` files are git-ignored.

## 14. Local Development Setup

### Database (installed locally)
| Item | Value |
|---|---|
| PostgreSQL | **17.x** (Windows service, port **5432**) — `C:\Program Files\PostgreSQL\17` |
| PostGIS | **3.x Bundle** |
| Database | `pothole_db` (PostGIS extension enabled) |
| Dev user / password | `postgres` / `postgres` (**local dev only**; never use this for a hosted DB) |
| Connection URL | `postgresql://postgres:postgres@localhost:5432/pothole_db` |

> **Windows PostGIS Note:** If `postgis-3.dll` fails to load with module not found, ensure `libwinpthread-1.dll` (from Git `C:\Program Files\Git\mingw64\bin\`) is copied to `C:\Program Files\PostgreSQL\17\bin\` and restart the `postgresql-x64-17` service.

`psql` is at `C:\Program Files\PostgreSQL\17\bin\psql.exe`. Add that `bin` folder to PATH to use `psql` directly.
We may move to a hosted PostGIS database (e.g. Neon or Supabase) later; only `DATABASE_URL` needs to change.

### Environment files
Ensure `.env` exists in `server/`, `client/` and `ai-service/` (or copy from `.env.example`).

### First-time install
```bash
npm install                      # root (concurrently)
npm --prefix server install
npm --prefix client install
cd ai-service && python -m venv venv && venv\Scripts\pip install -r requirements.txt
```

### Run everything
```bash
npm run dev          # Starts AI service :8000, API :5000, web app :5173. Open http://localhost:5173
npm run db:reset     # DEV ONLY: wipe the database, run migrations, and reload the demo data
npm --prefix server test  # Run automated backend tests (Phase 2 & 3 suites, 6/6 passing)
npm run sync:notion  # Syncs latest project status, modules, APIs & tests directly to Notion
```

For the full step-by-step demo walkthrough, screens list and API list, see **[IMPLEMENTATION_PLAN.md → Phase 0 Demo Guide](IMPLEMENTATION_PLAN.md)**.

### Demo accounts (seed data)
| Role | Email | Password | Login page |
|---|---|---|---|
| Citizen | `citizen@demo.local` | `Citizen@123` | `/login` |
| Government | `gov@demo.local` | `Gov@12345` | `/gov/login` |
| Admin | `admin@demo.local` | `Admin@1234` | `/gov/login` |

**Stub AI (demo only):** until the model is trained, the AI accepts every photo with 87% confidence. To show the other paths, use an image file whose name contains `reject` (low confidence, so it's rejected) or `review` (50%, so it goes to manual review).

**Design note:** a report's location is stored as columns on the `reports` table (a PostGIS point plus GPS, pin and EXIF fields), not in a separate Location table, because the relationship is 1-to-1.

### Git
The `docs/` folder is kept local only (git-ignored), along with `.env` files, `node_modules/`, the Python `venv/`, datasets and model weights.

## 15. Project Documents (tracked in Notion)
Synopsis · SRS · Literature Review · System Design · Implementation · Testing · Results · Limitations · Future Scope · Conclusion · References (all not started)
