# client — React frontend

Citizen, Government and Admin UIs in one React app (Vite), with role-based routes.

| Folder | Purpose |
|---|---|
| `src/pages/public` | Landing page, live map, statistics |
| `src/pages/auth` | Citizen register/login, government login, password reset |
| `src/pages/citizen` | Dashboard, report pothole, report details, profile |
| `src/pages/government` | Dashboard, problem details, repair update, completion upload |
| `src/pages/admin` | User management, review queue, audit logs, AI settings |
| `src/components` | Reusable UI (`common`), page shells (`layout`), Leaflet map pieces (`map`) |
| `src/routes` | Router setup and role-protected routes |
| `src/services` | API client (calls to the Express backend) |
| `src/context` | Auth/user context |
| `src/hooks` | Custom hooks (e.g. geolocation, counters) |
| `src/utils`, `src/styles`, `src/assets` | Helpers, styles, static assets |
