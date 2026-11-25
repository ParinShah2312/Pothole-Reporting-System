# Project Plan, Roadmap & Quality Assurance

> **Project:** Smart Civic Road Issue Reporting & AI-Based Pothole Verification System  
> **Reconciliation:** Merges Notion Roadmap (Phases 1–16) with Agile Implementation Phases (Phases 0–6)

---

## 1. Implementation Roadmap

```
Phase 0 [Demo Slice] ──► Phase 1 [Design & SRS] ──► Phase 2 [Citizen Portal & DB]
      (Completed)               (Active)                     (Next)
                                                               │
Phase 5 [Hardening & UAT] ◄── Phase 4 [YOLO Training] ◄── Phase 3 [Gov Portal & Admin]
            │
Phase 6 [Cloud Deployment & Report]
```

### Phase Mapping Matrix

| Agile Phase | Duration | Notion Tasks Covered | Status | Deliverables |
|---|---|---|---|---|
| **Phase 0: Demo Slice** | 1 Day | Initial prototype, basic routing, seed data | **Completed** | Full end-to-end working loop on localhost |
| **Phase 1: Design & Specs** | ~1 Month | Phases 1–6 (Problem statement, SRS, System Architecture, ER Design, Wireframes) | **Current** | DESIGN_SYSTEM.md, API_SPECIFICATION.md, ARCHITECTURE_AND_SYSTEM_DESIGN.md, SRS.md |
| **Phase 2: Citizen & Database** | 2–3 Months | Phase 7–8 (Citizen portal, JWT auth, Cloudinary integration, PostGIS migrations) | Next | Live citizen registration, verified reports, notifications |
| **Phase 3: Gov Portal & Maps** | 2 Months | Phase 9, 11 (Marker clustering, admin review queue, ward assignment, audit viewer) | Scheduled | Department routing, admin override UI, advanced Leaflet maps |
| **Phase 4: AI/ML Engineering** | 2–3 Months | Phase 10 (Dataset acquisition, YOLO training on Pothole-600/Vadodara images, mAP validation) | Scheduled | Trained model replacing stub, bounding box visualizer |
| **Phase 5: Quality & Security** | 1–2 Months | Phase 13 (Security checklist, rate limiting, helmet, test cases TC-001 to TC-015) | Scheduled | Automated test suite, OWASP security audit |
| **Phase 6: Deployment & Thesis** | 1 Month | Phase 12, 14–16 (Cloud hosting on Vercel/Render/Supabase, final report, presentation) | Scheduled | Production deployment, academic project report |

---

## 2. Risk Management & Mitigation Register

*(Directly sourced from Notion Risks & Issues database)*

| Risk ID | Risk / Issue | Severity | Probability | Impact | Mitigation Strategy |
|---|---|---|---|---|---|
| **RSK-001** | Scope Creep | Major | Medium | High | Maintain strict scope documentation; prioritize MVP vertical slices. |
| **RSK-002** | Insufficient AI Training Data | Critical | Medium | High | Identify public road damage datasets early (Pothole-600, RDD2022); transfer learning. |
| **RSK-003** | Server Downtime | Major | Low | High | Deploy on high-availability container hosts (Render/Railway); health check monitoring. |
| **RSK-004** | Data Privacy Concerns | Critical | Low | High | Collect minimal location data; explicit consent prompt; exclude private residential markers. |
| **RSK-005** | Map / API Limitations | Major | Medium | Medium | Use OpenStreetMap tiles and Leaflet (free, open source, no quota limits). |
| **RSK-006** | Fake / Fraudulent Reports | Major | Medium | Medium | Two-stage AI verification, EXIF and GPS cross-checking, rate limiting on uploads. |
| **RSK-007** | Duplicate Reports | Major | High | Medium | Spatial proximity indexing with PostGIS `ST_DWithin` ($25\text{ m}$ radius). |
| **RSK-008** | GPS Inaccuracies | Major | High | Medium | Show device accuracy circle; permit manual pin drag; flag displacement $> 200\text{ m}$. |
| **RSK-009** | Poor Image Quality | Major | High | High | In-app photo guidance; reject dark/blurry uploads in client before submission. |
| **RSK-010** | Incorrect AI Classification | Critical | High | High | Confidence threshold bands ($\ge 0.6$ accept, $< 0.4$ reject, $0.4\text{--}0.6$ review); admin override queue. |

---

## 3. Test Verification Suite (TC-001 to TC-015)

*(Directly mapped from Notion Testing database)*

| ID | Module | Category | Test Scenario | Expected Outcome |
|---|---|---|---|---|
| **TC-001** | Auth | Functional | User registers with valid email and password | Account created, redirected to login |
| **TC-002** | Auth | Functional | User logs in with correct credentials | JWT token issued, citizen dashboard loads |
| **TC-003** | Auth | Security | Login attempt with incorrect password | Login rejected, error shown |
| **TC-004** | Reporting | Functional | Citizen submits report with valid image + GPS | Report created as `pending_verification` |
| **TC-005** | Reporting | Functional | Citizen submits report without an image | Form validation prevents submission |
| **TC-006** | AI Check | AI | AI processes clear pothole photo | Status updates to `active`, confidence $\ge 0.6$ |
| **TC-007** | AI Check | AI | AI processes smooth road photo | Status updates to `rejected`, confidence $< 0.4$ |
| **TC-008** | Map | Functional | Public map accessed unauthenticated | Map renders with color-coded markers |
| **TC-009** | Gov Portal | Functional | Officer updates status to `in_progress` | Status updated, `status_history` logged |
| **TC-010** | Gov Portal | Functional | Officer uploads after-repair photo $\le 50\text{ m}$ | AI repair check runs, status changes to `solved` |
| **TC-011** | Counters | Functional | Report marked `solved` | Total unchanged, Active $-1$, Solved $+1$ |
| **TC-012** | API | API | `POST /api/reports` with valid payload | HTTP 201 Created with report ID |
| **TC-013** | Security | Security | Citizen token used on `/api/gov/*` | HTTP 403 Forbidden |
| **TC-014** | Reporting | Location | Citizen submits without GPS hardware | Pin manual placement fallback triggered |
| **TC-015** | E2E | UAT | End-to-end flow from citizen report to closure | Closed loop verified across all 3 portals |


---

## 4. Notion Workspace Synchronization

The repository is bidirectionally aligned with the Notion planning workspace. To push current progress, roadmap milestones, API status, and testing outcomes directly to Notion at any time, run:

```bash
npm run sync:notion
```

* Script location: [`scripts/sync_to_notion.mjs`](file:///c:/Parin/Projects/MAJOR/scripts/sync_to_notion.mjs)
* Configuration: Requires `NOTION_API_KEY` in root `.env`.
