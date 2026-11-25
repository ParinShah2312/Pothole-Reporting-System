# Smart Civic Road Issue Reporting & AI-Based Pothole Verification System

> **Status:** Phase 1 — Requirements & Design (in progress) · **Phase 0 demo built** (see [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) → *Phase 0 Demo Guide*)
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
        repair check (photo ≤ 50 m from report AND AI says repaired)
              ├── passed ──► [Solved]
              └── failed ──► stays [Repair Completed]; gov fixes the issue and uploads a new photo
```

| Status | Meaning | Set by |
|---|---|---|
| Pending verification | Just submitted; AI check running | System |
| Under review | AI result uncertain; an admin must decide | System (AI) |
| Rejected | AI found no pothole (an admin can override) | System (AI) / admin |
| Active | Verified pothole, waiting for action | System (AI) / admin |
| Assigned | Routed to a department | Government |
| Repair in progress | Crew working on site | Government |
| **Repair completed** | Government **says** the work is done; waiting for the completion photo to be **verified** | Government |
| **Solved** | Repair **verified** (photo location and AI check passed); report closed, counters updated | System (AI) |

*Repair completed* and *Solved* are deliberately separate. This is the "verify again" step: a report only closes when the fix is confirmed, not when someone claims it is.

Every transition is written to **Status History**, recording who made the change and when. Significant actions also go to the **Audit Log**.

### Workflows (from Notion)
| ID | Workflow | Summary |
|---|---|---|
| A | Registration / Login | Register (name, email, password), then validation and email verification (TBD); login goes to the dashboard, with a password reset option |
| B | Report a Pothole | Map, then "Report a Problem", then an image (required), GPS or map-pin location, and an optional description. The report is saved as *Pending Verification* |
| C | AI Verification (report) | Above threshold: Verified/Active and Active +1. Below: Rejected. Near threshold: manual review |
| D | Government Review | Gov user opens a verified report, reviews it, and assigns it to a team or department, making it *Assigned* |
| E | Repair | *In Progress*, then *Repair Completed* |
| F | Completion Submission | Gov uploads the after-repair photo, optionally confirms GPS, and submits for AI check |
| G | AI Verification (repair) | (a) Same location as the original? (b) Is the pothole repaired? Uncertain results are flagged |
| H | Resolution | Status becomes *Solved*: Active −1, Solved +1, Total unchanged; the citizen is notified (TBD); the report appears in public history |
| I | Rejected Handling | Admin reviews rejected reports, then overrides (re-verified) or upholds |

---

## 5. Live Counters

```
Total  = COUNT of AI-verified (valid) reports        — cumulative, never decreases
Active = COUNT of verified reports with status ≠ Solved
Solved = COUNT of reports with status = Solved
Invariant: Total = Active + Solved
```
- **Decided:** only AI-verified reports (or reports an admin approved) are counted. Pending Verification, Under Manual Review and Rejected reports are **never** counted, so Total never has to decrease.
- Duplicates must be handled; possible approach: a nearby-report check using PostGIS distance.
- Counter updates must be atomic with the status change to avoid race conditions.
- Update mechanism (WebSockets / SSE / polling) is TBD.

---

## 6. Proposed Technology Stack (from presentation, pending confirmation)

| Layer | Choice |
|---|---|
| Frontend | **React.js** |
| Backend / API | **Node.js + Express** (REST) |
| Database | **PostgreSQL + PostGIS** (geospatial queries, nearby or duplicate detection) |
| Image storage | **Cloudinary** (AWS S3 as alternative) |
| Maps | **Leaflet.js + OpenStreetMap** (free, with marker clustering) |
| AI model | **YOLO-based detection** for potholes |
| AI service | **Python + FastAPI** microservice (decided) |
| Auth | **JWT**, role-based access control |

**AI service (decided):** the YOLO model runs in a separate **Python FastAPI** service with its own **virtual environment (`venv`)**. The Node backend calls it over plain HTTP. We are not running the model inside Node (no ONNX) and not using a message queue.
1. Node saves the report as *Pending Verification* and responds to the citizen immediately.
2. Node then sends the image to FastAPI in the background.
3. FastAPI returns `{ detected, confidence, boxes }`.
4. Node updates the report status, status history and counters.

Until the model is trained in Phase 4, the FastAPI endpoint returns a **stub** result, so the citizen and government flows can be built and tested first.

### High-level architecture (proposed)
```
 ┌──────────────┐     ┌────────────────────┐     ┌──────────────────────┐
 │ React SPA    │────►│ Node/Express API   │────►│ PostgreSQL + PostGIS │
 │ Citizen +    │ JWT │ auth, RBAC, reports│     └──────────────────────┘
 │ Gov + Admin  │◄────│ counters, notifs   │────►  Cloudinary / S3 (images)
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

**Public:** Landing page (counters, map preview, CTAs) · Live Map (markers, status filter, clustering, search) · Statistics dashboard
**Citizen:** Register/Login · Dashboard (My Reports and status badges) · Report Pothole (image, GPS or pin, description) · Report Details (image, location, status timeline, AI result) · Profile
**Government:** Gov Login · Gov Dashboard (filtered list, map, summary, pending actions) · Problem Details (AI result, status controls, assign) · Repair Update · Completion Image Upload
**Admin:** User management · Review queue (rejected and uncertain) · Audit logs · AI settings

---

## 10. Security & Privacy Checklist (summary)

- Passwords hashed with bcrypt or Argon2; JWT with expiry and refresh; account lockout after failed attempts
- RBAC enforced on the server for every endpoint, with a separate Government login
- Image uploads: type and size validation, no executables, stored securely
- HTTPS, CORS, secrets kept in `.env` (never committed), input validation on client and server
- SQL injection, XSS and CSRF protection
- Location is read only after the user grants the browser's location permission; if they deny it, they can place the pin manually. No more location data is collected than needed.
- Rate limiting on auth, report submission and uploads
- Audit logging of logins, submissions and status changes

---

## 11. Timeline (12 months, Agile / Scrum, 2–3 week sprints)

| Phase | Work | Duration |
|---|---|---|
| 1 | Requirements & Design | 1 month (**current**) |
| 2 | Backend, DB & Citizen Portal | 2–3 months |
| 3 | Map & Government Portal | 2 months |
| 4 | AI Dataset, Training & Integration | 2–3 months |
| 5 | Testing & Security Hardening | 1–2 months |
| 6 | Integration, Docs & Deployment | 1 month |

---

## 12. Decisions

### Decided
| Date | Decision |
|---|---|
| 2026-10-13 | **AI service:** a separate Python **FastAPI** microservice in its own `venv`, called by Node over HTTP. No ONNX-in-Node and no message queue. It returns a stub result until the model is trained. |
| 2026-10-13 | **Counters:** count only AI-verified or admin-approved reports. Pending, Under Review and Rejected reports are excluded. |
| 2026-10-13 | **Location:** device GPS at capture time is primary; the user can adjust the pin; a large pin move is flagged, not blocked; EXIF GPS is an optional cross-check only; rule-based checks cover the city boundary, nearness to a road, GPS accuracy and duplicates. |
| 2026-10-13 | **Repair "same location":** the completion photo must be taken live within about 30–50 m of the original report. Image similarity may be added later. |
| 2026-11-26 | **Email verification:** Accounts can register and browse freely, but email verification is required before a citizen can submit a pothole report. |
| 2026-11-26 | **Report images:** Multiple images allowed per report — minimum 1, maximum 5 photos ($\le 8\text{ MB}$ each). |
| 2026-11-26 | **Notifications:** In-app notification center for Phase 2/3 (email delivery deferred). |
| 2026-11-26 | **AI dataset:** Dataset selection and training (Pothole-600 / RDD2022) deferred to Phase 4. |

### Still open
- [ ] Confirm exact AI confidence thresholds after model validation (Phase 4)
- [ ] Multi-department / Ward boundary polygon auto-routing
- [ ] Counter update mechanism (WebSockets vs. SSE vs. Polling for Phase 3)
- [ ] Citizen appeal / dispute process for rejected reports
- [ ] Production hosting platform (Render/Vercel/Supabase)

---

## 13. Repository Layout

```
MAJOR/
├── client/                 # React (Vite) — citizen, government and admin UIs
│   ├── public/
│   └── src/
│       ├── pages/          # public/ auth/ citizen/ government/ admin/
│       ├── components/     # common/ layout/ map/
│       ├── routes/ services/ context/ hooks/ utils/ styles/ assets/
├── server/                 # Node.js + Express REST API
│   ├── src/
│   │   ├── config/ routes/ controllers/ services/
│   │   ├── repositories/   # SQL (PostgreSQL + PostGIS)
│   │   ├── middleware/ validators/ utils/
│   └── tests/
├── ai-service/             # Python FastAPI + YOLO (own venv)
│   ├── app/                # routers/ services/ schemas/ core/
│   ├── training/           # notebooks/ scripts/
│   ├── weights/ datasets/  # not committed
│   └── tests/
├── database/               # migrations/ seeds/ queries/
├── docs/                   # diagrams/ reports/ presentations/
├── .gitignore
└── README.md
```
Each folder has its own `README.md` describing its subfolders. Copy each `.env.example` to `.env` and fill in the values; `.env` files are git-ignored.

## 14. Local Development Setup

### Database (installed locally)
| Item | Value |
|---|---|
| PostgreSQL | **17.11** (Windows service, port **5432**) — `C:\Program Files\PostgreSQL\17` |
| PostGIS | **3.6.2** |
| Database | `pothole_db` (PostGIS extension enabled) |
| Dev user / password | `postgres` / `postgres` (**local dev only**; never use this for a hosted DB) |
| Connection URL | `postgresql://postgres:postgres@localhost:5432/pothole_db` |

`psql` is at `C:\Program Files\PostgreSQL\17\bin\psql.exe`. Add that `bin` folder to PATH to use `psql` directly.
We may move to a hosted PostGIS database (e.g. Neon or Supabase) later; only `DATABASE_URL` needs to change.

### Environment files
Copy each `.env.example` to `.env` in `client/`, `server/` and `ai-service/` and fill in the values.

### First-time install
```bash
npm install                      # root (concurrently)
npm --prefix server install
npm --prefix client install
cd ai-service && python -m venv venv && venv\Scripts\pip install -r requirements.txt
```

### Run everything
```bash
npm run dev          # AI service :8000, API :5000, web app :5173. Open http://localhost:5173
npm run db:reset     # DEV ONLY: wipe the database and reload the demo data
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
