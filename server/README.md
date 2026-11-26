# server — Node.js + Express REST API

Handles auth (JWT + roles), reports, locations, repairs, counters, notifications and audit logs.
Calls the FastAPI `ai-service` over HTTP for image verification.

| Folder | Purpose |
|---|---|
| `src/config` | Env loading (`env.js`) and PostgreSQL pool (`db.js`) |
| `src/routes` | Express routers (`/api/auth`, `/api/reports`, `/api/gov`, `/api/admin`, `/api/stats`, ...) |
| `src/controllers` | Request/response handling (`auth`, `report`, `gov`, `admin`, `stats`) |
| `src/services` | Business logic (auth, report lifecycle, state machine, AI HTTP client) |
| `src/repositories` | Parameterized SQL queries against PostgreSQL/PostGIS |
| `src/middleware` | Auth, RBAC role checks, Multer upload handling, rate limiting, Zod validate, errors |
| `src/validation` | Zod input validation schemas (`schemas.js`) |
| `src/utils` | Shared helpers (EXIF reader, geo parser, SSE counter stream, HTTP errors) |
| `tests` | Automated integration tests (`phase2.test.js`, `phase3.test.js`) |
