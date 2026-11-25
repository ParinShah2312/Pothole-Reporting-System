# server — Node.js + Express REST API

Handles auth (JWT + roles), reports, locations, repairs, counters, notifications and audit logs.
Calls the FastAPI `ai-service` over HTTP for image verification.

| Folder | Purpose |
|---|---|
| `src/config` | Env loading, DB pool, Cloudinary config |
| `src/routes` | Express routers (`/api/auth`, `/api/reports`, `/api/gov`, `/api/admin`, ...) |
| `src/controllers` | Request/response handling |
| `src/services` | Business logic (report lifecycle, counters, AI calls, location checks) |
| `src/repositories` | SQL queries against PostgreSQL/PostGIS |
| `src/middleware` | Auth, role checks, upload handling, rate limiting, errors |
| `src/validators` | Input validation schemas |
| `src/utils` | Shared helpers |
| `tests` | API tests |
