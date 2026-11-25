# REST API Specification

> **Base URL:** `http://localhost:5000/api`  
> **Protocol:** HTTP/1.1 / JSON (Multipart for file uploads)  
> **Auth:** Bearer Token via Header `Authorization: Bearer <jwt_token>`

---

## 1. Authentication & Identity

### 1.1 Register Citizen Account
- **Endpoint:** `POST /api/auth/register`
- **Auth:** Public
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
    "user": {
      "id": 12,
      "name": "Jane Citizen",
      "email": "jane@example.com",
      "role": "citizen"
    }
  }
  ```

### 1.2 User Login (All Roles)
- **Endpoint:** `POST /api/auth/login`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "email": "citizen@demo.local",
    "password": "Citizen@123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5c...",
    "user": {
      "id": 1,
      "name": "Demo Citizen",
      "email": "citizen@demo.local",
      "role": "citizen"
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
      "role": "citizen"
    }
  }
  ```

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

---

## 3. Citizen Endpoints

### 3.1 Submit Pothole Report
- **Endpoint:** `POST /api/reports`
- **Auth:** Bearer Token (`citizen`)
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `image` *(File, required)*: JPEG, PNG, or WebP photo ($\le 8\text{ MB}$).
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
      "location_flags": [],
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
    "images": [{ "id": 14, "url": "/uploads/report-9.jpg" }],
    "ai": [{ "result": "accepted", "confidence": 0.87 }],
    "timeline": [
      { "status": "pending_verification", "changed_at": "2026-10-13T12:00:00Z" },
      { "status": "active", "changed_at": "2026-10-13T12:00:02Z", "note": "AI pothole check: accepted (confidence 87%)" }
    ]
  }
  ```

---

## 4. Government & Municipal Endpoints

### 4.1 Filterable Report Triage List
- **Endpoint:** `GET /api/gov/reports`
- **Auth:** Bearer Token (`government`, `admin`)
- **Query Parameters:** `?status=active|assigned|in_progress|repair_completed|solved`
- **Response (200 OK):**
  ```json
  {
    "reports": [
      {
        "id": 4,
        "status": "repair_completed",
        "department_name": "Road Maintenance - South Zone",
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

## 5. AI Service Endpoints (Internal)

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
