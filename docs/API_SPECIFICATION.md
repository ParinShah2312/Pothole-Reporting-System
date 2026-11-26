# REST API Specification

> **Base URL:** `http://localhost:5000/api`  
> **Protocol:** HTTP/1.1 / JSON (Multipart for file uploads)  
> **Auth:** Short-lived JWT Access Token (`15m`) via Header `Authorization: Bearer <access_token>` + Rotating Refresh Token (`7d`)

---

## 1. Authentication & Identity

> **Validation & Security Guards:** All JSON auth payloads are validated with `zod` (`400 Bad Request` on validation failure). Auth routes are protected by `express-rate-limit` (`authLimiter`), and repeated invalid logins trigger a `423 Locked` account lockout after `5` failed attempts for `15 minutes`.
>
> **Dev-Mode Email Verification & Password Reset Note:** In local development (without an external SMTP server), `POST /api/auth/register`, `POST /api/auth/resend-verification`, and `POST /api/auth/forgot-password` generate secure single-use SHA-256 hashed `auth_tokens` and surface clickable dev links (`devVerifyUrl` / `devResetUrl` plus server console logs) for convenient 1-click local testing. **Future Production Enhancement:** Integrate outbound SMTP email delivery so users verify accounts and reset passwords via emailed links or OTP codes instead of client-visible dev links.

### 1.1 Register Citizen Account
- **Endpoint:** `POST /api/auth/register`
- **Auth:** Public (`authLimiter`)
- **Request Body:**
  ```json
  {
    "name": "Jane Citizen",
    "email": "jane@example.com",
    "password": "Password123"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5c...",
    "refreshToken": "64-hex-rotating-refresh-token",
    "user": {
      "id": 12,
      "name": "Jane Citizen",
      "email": "jane@example.com",
      "role": "citizen",
      "email_verified": false
    },
    "devVerifyUrl": "http://localhost:5173/verify-email?token=..."
  }
  ```

### 1.2 User Login (All Roles)
- **Endpoint:** `POST /api/auth/login`
- **Auth:** Public (`authLimiter`; increments failed attempts -> `423 Locked` after 5 failures for 15 min)
- **Request Body:**
  ```json
  {
    "email": "citizen@demo.local",
    "password": "Citizen@123",
    "portal": "citizen"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5c...",
    "refreshToken": "64-hex-rotating-refresh-token",
    "user": {
      "id": 1,
      "name": "Demo Citizen",
      "email": "citizen@demo.local",
      "role": "citizen",
      "email_verified": true
    }
  }
  ```

### 1.3 Get Current Profile
- **Endpoint:** `GET /api/auth/me`
- **Auth:** Bearer Token (Any logged-in role)
- **Response (200 OK):**
  ```json
  {
    "user": {
      "id": 1,
      "name": "Demo Citizen",
      "email": "citizen@demo.local",
      "role": "citizen",
      "email_verified": true
    }
  }
  ```

### 1.4 Refresh Access Token
- **Endpoint:** `POST /api/auth/refresh`
- **Auth:** Public (`authLimiter`; requires valid unrevoked `refreshToken`)
- **Request Body:** `{ "refreshToken": "..." }`
- **Response (200 OK):** Returns a fresh `token` (`15m`), rotated `refreshToken` (`7d`, revoking the old one), and `user`.

### 1.5 Logout & Revoke Refresh Token
- **Endpoint:** `POST /api/auth/logout`
- **Auth:** Public / Optional Refresh Token
- **Request Body:** `{ "refreshToken": "..." }`
- **Response (200 OK):** Revokes the stored refresh token hash in `refresh_tokens`.

### 1.6 Verify Email & Resend Verification Link
- **Endpoint:** `POST /api/auth/verify-email` (`{ "token": "..." }`) — Marks `users.email_verified = true` idempotently (safe under double clicks / React StrictMode).
- **Endpoint:** `POST /api/auth/resend-verification` (Bearer Token, `authLimiter`) — Issues a fresh `email_verify` token (`24h` TTL) and returns `devVerifyUrl` in dev mode.

### 1.7 Forgot & Reset Password
- **Endpoint:** `POST /api/auth/forgot-password` (`{ "email": "..." }`, `authLimiter`) — Issues a `password_reset` token (`1h` TTL) and returns `devResetUrl` in dev mode for non-OAuth local testing.
- **Endpoint:** `POST /api/auth/reset-password` (`{ "token": "...", "password": "..." }`, `authLimiter`) — Resets password hash, clears account lockout counters, and revokes active refresh sessions.

### 1.8 Update Citizen Profile & Password
- **Endpoint:** `PATCH /api/auth/profile` (Bearer Token, `{ "name": "..." }`) — Updates display name.
- **Endpoint:** `PATCH /api/auth/password` (Bearer Token, `{ "currentPassword": "...", "newPassword": "..." }`) — Verifies current password before updating hash and revoking other refresh tokens.

---

## 2. Public Endpoints

### 2.1 Live Statistics & Counters
- **Endpoint:** `GET /api/stats/counters`
- **Auth:** Public
- **Response (200 OK):**
  ```json
  {
    "counters": {
      "total": 9,
      "active": 6,
      "solved": 3
    }
  }
  ```
- **Rule:** Invariant `total = active + solved` is strictly preserved.

### 2.2 Public Map Reports
- **Endpoint:** `GET /api/reports/map`
- **Auth:** Public
- **Response (200 OK):**
  ```json
  {
    "reports": [
      {
        "id": 8,
        "lat": 22.3125,
        "lng": 73.1842,
        "status": "active",
        "image_url": "/uploads/1728800000000-pothole.jpg",
        "created_at": "2026-10-13T10:00:00Z"
      }
    ]
  }
  ```

### 2.3 Real-Time Counter Stream (SSE)
- **Endpoint:** `GET /api/stats/stream`
- **Auth:** Public
- **Protocol:** `text/event-stream` (`event: counters`) broadcasting `{ total, active, solved }` immediately whenever report states commit.

### 2.4 Civic Trends & Analytics
- **Endpoint:** `GET /api/stats/trends?from=YYYY-MM-DD&to=YYYY-MM-DD`
- **Auth:** Public
- **Response (200 OK):** Returns `{ range, summary, daily, byStatus, byDepartment }` (including `avg_resolution_hours`).

### 2.5 Public Spatial Threshold Settings
- **Endpoint:** `GET /api/settings/public`
- **Auth:** Public
- **Response (200 OK):** `{ pin_move_flag_m, low_gps_accuracy_m, duplicate_radius_m, repair_radius_m }`

---

## 3. Citizen Endpoints

### 3.1 Submit Pothole Report
- **Endpoint:** `POST /api/reports`
- **Auth:** Bearer Token (`citizen`, requires `email_verified = true`, protected by `uploadLimiter`)
- **Content-Type:** `multipart/form-data`
- **Storage Note:** Files are currently saved on local disk (`server/uploads/`). **Cloudinary cloud upload integration is postponed.**
- **Form Fields:**
  - `images` *(Files, 1–5 required)*: JPEG, PNG, or WebP photos ($\le 8\text{ MB}$ each; also accepts legacy single `image` field). Server parses embedded EXIF GPS via `exifr` into `exif_lat` / `exif_lng` and flags displacement $> 200\text{ m}$ (`exif_mismatch`).
  - `lat` *(Float, required)*: Pin latitude.
  - `lng` *(Float, required)*: Pin longitude.
  - `gps_lat` *(Float, optional)*: Hardware device GPS latitude.
  - `gps_lng` *(Float, optional)*: Hardware device GPS longitude.
  - `gps_accuracy` *(Float, optional)*: Accuracy in meters.
  - `description` *(String, optional)*: Maximum 1000 characters.
- **Response (201 Created):**
  ```json
  {
    "report": {
      "id": 9,
      "status": "pending_verification",
      "lat": 22.3089,
      "lng": 73.1751,
      "exif_lat": 22.3088,
      "exif_lng": 73.1750,
      "location_flags": [],
      "images": [
        { "id": 14, "url": "/uploads/1728800000000-pothole-1.jpg" }
      ],
      "created_at": "2026-10-13T12:00:00Z"
    }
  }
  ```

### 3.2 List Own Reports
- **Endpoint:** `GET /api/reports/mine`
- **Auth:** Bearer Token (`citizen`)
- **Response (200 OK):**
  ```json
  {
    "reports": [
      {
        "id": 9,
        "status": "active",
        "address": "Gotri Road, Vadodara",
        "created_at": "2026-10-13T12:00:00Z"
      }
    ]
  }
  ```

### 3.3 Get Detailed Report History
- **Endpoint:** `GET /api/reports/:id`
- **Auth:** Bearer Token (Report owner, or `government` / `admin`)
- **Response (200 OK):**
  ```json
  {
    "id": 9,
    "status": "active",
    "description": "Deep pothole in left lane",
    "lat": 22.3089,
    "lng": 73.1751,
    "exif_lat": 22.3088,
    "exif_lng": 73.1750,
    "location_flags": [],
    "images": [
      { "id": 14, "url": "/uploads/report-9-1.jpg" },
      { "id": 15, "url": "/uploads/report-9-2.jpg" }
    ],
    "ai": [{ "result": "accepted", "confidence": 0.87 }],
    "timeline": [
      { "status": "pending_verification", "changed_at": "2026-10-13T12:00:00Z" },
      { "status": "active", "changed_at": "2026-10-13T12:00:02Z", "note": "AI pothole check: accepted (confidence 87%)" }
    ]
  }
  ```

> **Deferred Endpoints:** In-app notifications API routes (`/api/notifications`) are postponed; notification persistence remains ready in PostgreSQL for a future milestone.

---

## 4. Government & Municipal Endpoints

### 4.1 Filterable Report Triage List
- **Endpoint:** `GET /api/gov/reports`
- **Auth:** Bearer Token (`government`, `admin`)
- **Query Parameters:** `?status=active|assigned|in_progress|repair_completed|solved&departmentId=1&from=YYYY-MM-DD&to=YYYY-MM-DD&q=Manjalpur&flagged=true`
- **Response (200 OK):**
  ```json
  {
    "reports": [
      {
        "id": 4,
        "status": "repair_completed",
        "department_name": "Road Maintenance - South Zone",
        "location_flags": [],
        "created_at": "2026-10-13T09:30:00Z"
      }
    ]
  }
  ```

### 4.2 Update Report Status & Assignment
- **Endpoint:** `PATCH /api/gov/reports/:id/status`
- **Auth:** Bearer Token (`government`, `admin`)
- **Request Body:**
  ```json
  {
    "status": "assigned",
    "departmentId": 2,
    "note": "Assigned to North Zone road inspection team"
  }
  ```
- **Allowed Transitions:**
  - `active` $\rightarrow$ `assigned` (requires `departmentId`)
  - `assigned` $\rightarrow$ `in_progress`
  - `in_progress` $\rightarrow$ `repair_completed`
  - `repair_completed` $\rightarrow$ `under_review` (requires reason `note`; escalates disputed AI/GPS completion failures to Admin Review Queue)
- **Response (200 OK):** Returns updated report record.

### 4.3 Submit Repair Completion Image
- **Endpoint:** `POST /api/gov/reports/:id/completion`
- **Auth:** Bearer Token (`government`, `admin`)
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `image` *(File, required)*: After-repair photo.
  - `lat` *(Float, optional)*: Completion photo latitude.
  - `lng` *(Float, optional)*: Completion photo longitude.
- **Response (200 OK):**
  ```json
  {
    "result": "accepted",
    "confidence": 0.94,
    "distance_m": 12.4,
    "same_location": true,
    "reasons": [],
    "report": {
      "id": 4,
      "status": "solved",
      "solved_at": "2026-10-13T15:20:00Z"
    }
  }
  ```

---

## 5. Admin Governance Endpoints

> All `/api/admin/*` endpoints strictly require a Bearer token with `role === "admin"` (`403 Forbidden` for citizens and non-admin municipal staff).

### 5.1 Review Queue
- **Endpoint:** `GET /api/admin/review-queue?scope=attention|all`
- **Response (200 OK):** Returns `under_review`, `rejected`, and location-flagged (`exif_mismatch`, `pin_moved_far`, `low_gps_accuracy`, `manual_location`, `possible_duplicate`) reports along with latest AI verification details.

### 5.2 Manual Status Override & Flag Clearance
- **Endpoint:** `PATCH /api/admin/reports/:id/override`
- **Request Body:** `{ "status": "active" | "solved" | "rejected", "clearFlags": true, "note": "Verified on site" }`
- **Behavior:** Executes transition with admin override guard, updates `status_history`, optionally clears `location_flags`, writes `admin.report_override` to `audit_logs`, and broadcasts live counters.

### 5.3 User Management
- **Endpoint:** `GET /api/admin/users?role=citizen|government|admin&q=search` — Returns users and department metadata.
- **Endpoint:** `POST /api/admin/users` — Creates a pre-verified `government` or `admin` user assigned to an optional `departmentId`.
- **Endpoint:** `PATCH /api/admin/users/:id` — Updates `isActive`, `role`, or `departmentId`; suspending a user revokes all active `refresh_tokens`.

### 5.4 Audit Log Viewer
- **Endpoint:** `GET /api/admin/audit-logs?action=...&q=...&limit=150`
- **Response (200 OK):** Returns security, auth, report, and admin events joined with actor metadata.

### 5.5 Threshold Configuration
- **Endpoint:** `GET /api/admin/settings` — Returns active thresholds from `app_settings`.
- **Endpoint:** `PATCH /api/admin/settings` — Validates and persists `ai_accept_threshold`, `ai_reject_threshold`, `pin_move_flag_m`, `low_gps_accuracy_m`, `duplicate_radius_m`, `repair_radius_m`, and `exif_mismatch_m` into `app_settings` (`admin.settings_update` logged).

---

## 6. AI Service Endpoints (Internal)

### 5.1 Pothole Detection
- **Endpoint:** `POST http://localhost:8000/detect/pothole`
- **Payload:** Multipart image upload
- **Response:**
  ```json
  {
    "detected": true,
    "confidence": 0.87,
    "boxes": [[120, 150, 480, 410]],
    "model_version": "yolo11n-pothole-stub-v1"
  }
  ```

### 5.2 Repair Verification
- **Endpoint:** `POST http://localhost:8000/verify/repair`
- **Payload:** Multipart upload of before & after image
- **Response:**
  ```json
  {
    "repaired": true,
    "confidence": 0.91,
    "model_version": "repair-verify-stub-v1"
  }
  ```
