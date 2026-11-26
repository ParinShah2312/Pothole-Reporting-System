import {
  notionRequest,
  queryDatabase,
  updatePageProperties,
  createDatabasePage,
  replacePageContent,
  uploadImage,
} from './notion.mjs';

// -------------------------------------------------------------
// Notion Block Builders
// -------------------------------------------------------------
const rt = (content, opts = {}) => ({
  type: 'text',
  text: { content: String(content).slice(0, 1950) },
  ...(opts.bold || opts.code ? { annotations: { bold: !!opts.bold, code: !!opts.code } } : {}),
});

const h1 = (text) => ({ object: 'block', type: 'heading_1', heading_1: { rich_text: [rt(text)] } });
const h2 = (text) => ({ object: 'block', type: 'heading_2', heading_2: { rich_text: [rt(text)] } });
const h3 = (text) => ({ object: 'block', type: 'heading_3', heading_3: { rich_text: [rt(text)] } });
const p = (text) => ({ object: 'block', type: 'paragraph', paragraph: { rich_text: [rt(text)] } });
const bp = (label, text) => ({
  object: 'block',
  type: 'paragraph',
  paragraph: { rich_text: [rt(label, { bold: true }), rt(text)] },
});
const bullet = (label, text) => ({
  object: 'block',
  type: 'bulleted_list_item',
  bulleted_list_item: {
    rich_text: text ? [rt(label, { bold: true }), rt(text)] : [rt(label)],
  },
});
const callout = (emoji, text) => ({
  object: 'block',
  type: 'callout',
  callout: { icon: { type: 'emoji', emoji }, rich_text: [rt(text)] },
});
const divider = () => ({ object: 'block', type: 'divider', divider: {} });
const codeBlock = (code, language = 'plain text') => ({
  object: 'block',
  type: 'code',
  code: { rich_text: [rt(code)], language },
});
const imgBlock = (fileUploadId, captionText) => ({
  object: 'block',
  type: 'image',
  image: {
    type: 'file_upload',
    file_upload: { id: fileUploadId },
    caption: captionText ? [rt(captionText)] : [],
  },
});
const tableBlock = (headers, rows) => ({
  object: 'block',
  type: 'table',
  table: {
    table_width: headers.length,
    has_column_header: true,
    has_row_header: false,
    children: [
      {
        object: 'block',
        type: 'table_row',
        table_row: { cells: headers.map((h) => [rt(h, { bold: true })]) },
      },
      ...rows.map((r) => ({
        object: 'block',
        type: 'table_row',
        table_row: { cells: r.map((cell) => [rt(cell)]) },
      })),
    ],
  },
});

function getTitle(row) {
  for (const val of Object.values(row.properties || {})) {
    if (val.type === 'title') {
      return (val.title || []).map((t) => t.plain_text).join('').trim();
    }
  }
  return '';
}

// -------------------------------------------------------------
// 1. Update Core Databases (Modules, Roadmap, API, Testing, Tasks)
// -------------------------------------------------------------
async function updateDatabases() {
  console.log('\nUpdating Notion databases...');

  // System Modules
  const modRows = await queryDatabase('441eb160-4714-48cc-8b25-92b84c3329c4');
  const modMap = {
    'Authentication & User Management': { status: 'Complete', notes: 'JWT (15m) + rotating refresh_tokens (7d), logout revocation, 5-attempt 423 lockout, email verify/reset & /citizen/profile active' },
    'Citizen Portal': { status: 'Complete', notes: 'React 19 + Vite 8 + React Router 7: Dashboard, ReportPothole (1-5 photos), CitizenReportDetails, /verify-email, /reset-password, /citizen/profile' },
    'Interactive Map': { status: 'Complete', notes: 'Leaflet 1.9 + leaflet.markercluster + OpenStreetMap Nominatim search & status filters' },
    'Pothole Reporting': { status: 'Complete', notes: '1-5 multi-photo upload, exifr EXIF GPS cross-check (exif_mismatch), GPS accuracy warnings & manual pin fallback; Cloudinary postponed (local server/uploads/)' },
    'Live Statistics / Counters': { status: 'Complete', notes: 'GET /api/stats/counters + SSE /api/stats/stream + /stats trends dashboard' },
    'Problem Management': { status: 'Complete', notes: 'Strict status state machine + admin override, 13-table schema (001-003 migrations), immutable status_history audit trail' },
    'Government Portal': { status: 'Complete', notes: 'GovDashboard summary KPIs, search/zone/date/flagged filters + 50m geo-fence & Admin escalation' },
    'Repair Verification': { status: 'Complete', notes: 'PostGIS ST_Distance (<= 50 m default, configurable in app_settings) geo-fence + Stage 2 verify & retry/escalation' },
    'Database': { status: 'Complete', notes: 'PostgreSQL 17.11 + PostGIS 3 + migrations 001-003 (refresh_tokens, auth_tokens, app_settings)' },
    'AI Verification': { status: 'In Progress', notes: 'FastAPI (:8000) active with heuristic stub (dynamic accept/reject gates); YOLO training in Phase 4' },
    'Security': { status: 'Complete', notes: 'zod validation, express-rate-limit, 423 lockout, parameterized pg SQL, RBAC, automated phase2 & phase3 test suites (6/6) passing' },
    'Notifications': { status: 'In Progress', notes: 'notifications table active in PostgreSQL; in-app notifications API & Notification Center UI postponed' },
    'Administration': { status: 'Complete', notes: '/admin/review, /admin/users, /admin/audit-logs & /admin/settings live & verified' },
  };
  for (const row of modRows) {
    const t = modMap[getTitle(row)];
    if (t) {
      await updatePageProperties(row.id, {
        Status: { select: { name: t.status } },
        Notes: { rich_text: [rt(t.notes)] },
      });
    }
  }
  console.log('  Synced System Modules');

  // Project Roadmap (fixed Status property shape: { status: { name } })
  const roadRows = await queryDatabase('b92b9ba4-2094-4cdc-ae45-6c0f86dc6926');
  const roadMap = {
    'Define project topic and title': { status: 'Done', progress: 100 },
    'Write Problem Statement': { status: 'Done', progress: 100 },
    'Identify target users and stakeholders': { status: 'Done', progress: 100 },
    'Gather and document functional requirements': { status: 'Done', progress: 100 },
    'Document non-functional requirements': { status: 'Done', progress: 100 },
    'Define system modules': { status: 'Done', progress: 100 },
    'Design system architecture': { status: 'Done', progress: 100 },
    'Create system workflow diagrams': { status: 'Done', progress: 100 },
    'Design database schema (ER diagram)': { status: 'Done', progress: 100 },
    'Review and finalize ER diagram': { status: 'Done', progress: 100 },
    'Create wireframes for all screens': { status: 'Done', progress: 100 },
    'Review and finalize UI/UX designs': { status: 'Done', progress: 100 },
    'Set up backend project structure': { status: 'Done', progress: 100 },
    'Implement authentication module': { status: 'Done', progress: 100 },
    'Implement report submission API': { status: 'Done', progress: 100 },
    'Implement problem management API': { status: 'Done', progress: 100 },
    'Set up frontend project structure': { status: 'Done', progress: 100 },
    'Build Citizen Portal UI': { status: 'Done', progress: 100 },
    'Build Government Portal UI': { status: 'Done', progress: 100 },
    'Integrate map provider': { status: 'Done', progress: 100 },
    'Implement report markers and clustering': { status: 'Done', progress: 100, notes: 'leaflet.markercluster + OpenStreetMap Nominatim search live on /map' },
    'Implement AI verification service': { status: 'In progress', progress: 65, notes: 'FastAPI (:8000) active with stub weights & dynamic app_settings gates; YOLO training in Phase 4' },
    'Build Government Portal features': { status: 'Done', progress: 100 },
    'Implement completion image upload and verification': { status: 'Done', progress: 100 },
    'Write and run functional test cases': { status: 'In progress', progress: 80, notes: '6/6 automated Phase 2-3 tests + TC-001..TC-017 passing; Phase 4/5 E2E remaining' },
    'Perform security testing': { status: 'In progress', progress: 65, notes: 'Zod, 423 lockout, rate limit, refresh rotation & RBAC automated; Phase 5 full E2E audit remaining' },
    'End-to-end integration testing': { status: 'In progress', progress: 70, notes: 'Citizen -> AI stub -> Gov -> Admin E2E verified; final Phase 4 YOLO E2E pending' },
    'Write SRS and technical documentation': { status: 'Done', progress: 100 },
    'Collect and review research papers': { status: 'Done', progress: 100 },
    'Write literature review document': { status: 'Done', progress: 100 },
    'Prepare final presentation and demo': { status: 'Not started', progress: 25, notes: 'Baseline .pptx on disk; refresh with Phases 2-4 results planned next' },
  };
  for (const row of roadRows) {
    const t = roadMap[getTitle(row)];
    if (t) {
      await updatePageProperties(row.id, {
        Status: { status: { name: t.status } },
        Progress: { number: t.progress },
        ...(t.notes !== undefined ? { Notes: { rich_text: [rt(t.notes)] } } : {}),
      });
    }
  }
  console.log('  Synced Project Roadmap');

  // API Design (sync all metadata + upsert Phase 2/3 endpoints)
  const API_DB = 'e7a3b4b7-270d-406b-980c-eb155ad37f6c';
  const apiRows = await queryDatabase(API_DB);
  const existingApiById = new Map(apiRows.map((r) => [getTitle(r), r]));
  const apiSpec = {
    'API-001': { method: 'POST', role: 'Public', auth: 'No', endpoint: '/api/auth/register', purpose: 'Register a new citizen account & issue verify token', status: 'Implemented', notes: 'Zod validated, bcryptjs, returns 15m JWT + 7d refresh + devVerifyUrl in dev' },
    'API-002': { method: 'POST', role: 'Public', auth: 'No', endpoint: '/api/auth/login', purpose: 'Authenticate user and issue JWT + refresh token', status: 'Implemented', notes: 'authLimiter, 5-attempt 423 lockout, portal role check' },
    'API-003': { method: 'POST', role: 'Citizen', auth: 'Yes', endpoint: '/api/auth/logout', purpose: 'Revoke refresh session cleanly', status: 'Implemented', notes: 'Revokes SHA-256 hash inside refresh_tokens' },
    'API-004': { method: 'POST', role: 'Citizen', auth: 'Yes', endpoint: '/api/reports', purpose: 'Submit pothole report (1-5 photos + GPS/EXIF)', status: 'Implemented', notes: 'uploadLimiter, verified email gate, exifr EXIF GPS check, ST_DWithin duplicate check' },
    'API-005': { method: 'GET', role: 'Public', auth: 'No', endpoint: '/api/reports/map', purpose: 'Get list of public verified reports for the map', status: 'Implemented', notes: 'Public verified Vadodara markers for leaflet.markercluster' },
    'API-006': { method: 'GET', role: 'Citizen', auth: 'Yes', endpoint: '/api/reports/{id}', purpose: 'Get details, gallery, EXIF flags & timeline of a report', status: 'Implemented', notes: 'Owner citizen or verified-report gov/admin staff' },
    'API-007': { method: 'PATCH', role: 'Government', auth: 'Yes', endpoint: '/api/gov/reports/{id}/status', purpose: 'Assign zone, update progress, or escalate to review', status: 'Implemented', notes: 'assigned | in_progress | repair_completed | under_review' },
    'API-008': { method: 'POST', role: 'Government', auth: 'Yes', endpoint: '/api/gov/reports/{id}/completion', purpose: 'Upload completion photo & run Stage 2 geo-fence verify', status: 'Implemented', notes: '50 m default geo-fence (configurable in app_settings) + AI check' },
    'API-009': { method: 'GET', role: 'Public', auth: 'No', endpoint: '/api/stats/counters', purpose: 'Get Total / Active / Solved KPIs, SSE stream & trends', status: 'Implemented', notes: 'GET /counters, SSE /stream, /trends & /settings/public live' },
    'API-010': { method: 'GET', role: 'Citizen', auth: 'Yes', endpoint: '/api/auth/me', purpose: 'Get & update current profile or change password', status: 'Implemented', notes: 'GET /auth/me, PATCH /auth/profile, PATCH /auth/password' },
    'API-011': { method: 'GET', role: 'Citizen', auth: 'Yes', endpoint: '/api/reports/mine', purpose: 'List citizen own reports & gov filtered triage queue', status: 'Implemented', notes: 'GET /reports/mine & multi-filtered GET /gov/reports' },
    'API-012': { method: 'GET', role: 'Admin', auth: 'Yes', endpoint: '/api/admin/users', purpose: 'Admin: list, provision & suspend/activate users', status: 'Implemented', notes: 'GET/POST/PATCH /api/admin/users with refresh token revocation' },
    'API-013': { method: 'POST', role: 'Public', auth: 'No', endpoint: '/api/auth/refresh', purpose: 'Rotate 7d refresh token & issue new 15m JWT', status: 'Implemented', notes: 'Single-use token rotation in refresh_tokens table' },
    'API-014': { method: 'POST', role: 'Public', auth: 'No', endpoint: '/api/auth/verify-email', purpose: 'Verify citizen email & forgot/reset password tokens', status: 'Implemented', notes: 'POST /verify-email, /resend-verification, /forgot-password, /reset-password (dev links in dev; SMTP/OTP planned)' },
    'API-015': { method: 'PATCH', role: 'Admin', auth: 'Yes', endpoint: '/api/admin/reports/{id}/override', purpose: 'Admin review queue & manual report override / flag clear', status: 'Implemented', notes: 'GET /admin/review-queue & PATCH /admin/reports/:id/override' },
    'API-016': { method: 'PATCH', role: 'Admin', auth: 'Yes', endpoint: '/api/admin/settings', purpose: 'Admin audit logs & live AI/spatial thresholds', status: 'Implemented', notes: 'GET /admin/audit-logs & GET/PATCH /admin/settings (app_settings)' },
  };
  for (const [apiId, spec] of Object.entries(apiSpec)) {
    const props = {
      'API ID': { title: [rt(apiId)] },
      Endpoint: { rich_text: [rt(spec.endpoint)] },
      'HTTP Method': { select: { name: spec.method } },
      'User Role': { select: { name: spec.role } },
      'Auth Required': { select: { name: spec.auth } },
      Purpose: { rich_text: [rt(spec.purpose)] },
      Status: { select: { name: spec.status } },
      Notes: { rich_text: [rt(spec.notes)] },
    };
    const row = existingApiById.get(apiId);
    if (row) {
      await updatePageProperties(row.id, props);
    } else {
      await createDatabasePage(API_DB, props);
    }
  }
  console.log('  Synced API Design');

  // Testing (sync existing TC-001..TC-015 + ensure TC-016 & TC-017 exist)
  const TEST_DB = '9948a527-aa6b-4e5b-acfb-cb3143dd7f2f';
  const testRows = await queryDatabase(TEST_DB);
  const existingTestById = new Map(testRows.map((r) => [getTitle(r), r]));
  const testUpdates = {
    'TC-010': { module: 'Government Portal', category: 'Functional', status: 'Pass', priority: 'High', notes: 'Verified with 50 m configurable geo-fence & preview' },
    'TC-014': { module: 'Pothole Reporting', category: 'Location', status: 'Pass', priority: 'Medium', notes: 'Browser geolocation + manual pin fallback + EXIF check verified' },
    'TC-016': {
      module: 'Authentication',
      category: 'Security',
      status: 'Pass',
      priority: 'High',
      scenario: 'Verify email idempotency, refresh rotation replay block, 5-attempt 423 lockout & reset',
      input: 'phase2.test.js automated lifecycle requests',
      expected: 'Replay rejected 401, 5th bad login locked 423, password reset clears lock',
      actual: 'All assertions pass via npm --prefix server test (phase2.test.js)',
      notes: 'Dev-mode tokenized links used locally; SMTP/OTP planned for production',
    },
    'TC-017': {
      module: 'Security',
      category: 'Functional',
      status: 'Pass',
      priority: 'High',
      scenario: 'Admin RBAC (403 non-admin), staff suspend, review queue override & live settings',
      input: 'phase3.test.js automated admin & stats requests',
      expected: 'Gov denied 403 on /admin/*, suspended user blocked, override + app_settings saved',
      actual: 'All assertions pass via npm --prefix server test (phase3.test.js)',
      notes: 'SSE /stats/stream, /stats/trends & /gov/reports filters also verified',
    },
  };
  for (const [tcId, spec] of Object.entries(testUpdates)) {
    const row = existingTestById.get(tcId);
    const props = {
      'Test Case ID': { title: [rt(tcId)] },
      Module: { select: { name: spec.module } },
      Category: { select: { name: spec.category } },
      Status: { select: { name: spec.status } },
      Priority: { select: { name: spec.priority } },
      Notes: { rich_text: [rt(spec.notes)] },
      ...(spec.scenario ? { 'Test Scenario': { rich_text: [rt(spec.scenario)] } } : {}),
      ...(spec.input ? { Input: { rich_text: [rt(spec.input)] } } : {}),
      ...(spec.expected ? { 'Expected Result': { rich_text: [rt(spec.expected)] } } : {}),
      ...(spec.actual ? { 'Actual Result': { rich_text: [rt(spec.actual)] } } : {}),
    };
    if (row) {
      await updatePageProperties(row.id, props);
    } else {
      await createDatabasePage(TEST_DB, props);
    }
  }
  console.log('  Synced Testing DB');

  // Sync Task Board with clear real milestones (update existing rows & archive stale duplicates)
  const TASK_DB = '27e0b4c8-7488-4918-bd91-49efe5acad09';
  const existingTasks = await queryDatabase(TASK_DB);
  const existingByTitle = new Map(
    existingTasks.map((r) => [getTitle(r), r]).filter(([k]) => Boolean(k)),
  );
  const desiredTasks = [
    ['Align PostgreSQL/PostGIS schema & Vadodara seed data (001-003 migrations)', 'Completed', 'High', 'PostgreSQL 17 + PostGIS 3 running 13 tables across 001-003 migrations with 4 zones, 3 roles, 8 seeded complaints'],
    ['Complete SRS, SDS, and Project Report (.docx & .pdf)', 'Completed', 'High', 'Formal NUV documentation locked (SRS 30p, SDS 19p, Project Report 33p)'],
    ['Phase 2: EXIF GPS reader, multi-photo (1-5) & Auth Hardening', 'Completed', 'High', 'exifr GPS check, 1-5 Multer upload, zod validation, 15m/7d rotating refresh tokens, 5-attempt 423 lockout, rate limit, /verify-email, /reset-password, /citizen/profile, phase2.test.js passing', 'Phase 2: Integrate Cloudinary cloud storage & EXIF GPS reader'],
    ['Deferred Phase 2 Items: Cloudinary, SMTP/OTP Emails & Notification UI', 'To Do', 'Medium', 'Media remains local (server/uploads/); devVerifyUrl/devResetUrl used in dev until outbound SMTP/OTP is added; notifications DB table ready for future UI', 'Phase 2/3: Multi-photo upload (1-5) & Notification Center UI'],
    ['Phase 3: Admin Review Queue & Department Governance UI', 'Completed', 'High', 'Clustered Leaflet map, Nominatim search, SSE counters, Gov multi-filter triage + 50m geo-fence, /admin/* (review/users/audit/settings), /stats dashboard & phase3.test.js passing'],
    ['Phase 4: Train Ultralytics YOLO weights on RDD2022 & Pothole-600', 'Backlog', 'High', 'Replace FastAPI heuristic stub while preserving POST /detect/pothole and POST /verify/repair endpoints'],
    ['Phase 5-6: E2E Playwright/Pytest verification & Cloud deployment', 'Backlog', 'Medium', '6/6 backend integration tests (phase2 & phase3) already passing; E2E browser suite & cloud deploy remaining'],
    ['Refresh Document #4: Final Project Presentation (.pptx)', 'To Do', 'High', 'Update docs/presentations/Smart Civic Pothole System - Presentation.pptx with Phases 2-3 & final results', 'Create Document #4: Final Project Presentation (.pptx)'],
  ];
  const matchedIds = new Set();
  let blankRow = existingTasks.find((r) => !getTitle(r));
  for (const [title, status, priority, notes, legacyTitle] of desiredTasks) {
    const existingRow = existingByTitle.get(title) || (legacyTitle ? existingByTitle.get(legacyTitle) : null);
    const props = {
      Task: { title: [rt(title)] },
      Status: { status: { name: status } },
      Priority: { select: { name: priority } },
      Description: { rich_text: [rt(notes)] },
    };
    if (existingRow) {
      await updatePageProperties(existingRow.id, props);
      matchedIds.add(existingRow.id);
    } else if (blankRow) {
      await updatePageProperties(blankRow.id, props);
      matchedIds.add(blankRow.id);
      blankRow = null;
    } else {
      const created = await createDatabasePage(TASK_DB, props);
      if (created?.id) matchedIds.add(created.id);
    }
  }
  for (const row of existingTasks) {
    if (!matchedIds.has(row.id)) {
      await notionRequest(`/pages/${row.id}`, { method: 'PATCH', body: JSON.stringify({ archived: true }) });
    }
  }
  console.log('  Synced Task Board');
}

// -------------------------------------------------------------
// 2. Upload Diagrams & Live App Screenshots to Notion
// -------------------------------------------------------------
async function uploadAllDiagrams() {
  console.log('\nUploading diagrams & UI screenshots to Notion...');
  const files = {
    arch: 'docs/diagrams/sds_system_architecture.png',
    er: 'docs/diagrams/srs_er_diagram.png',
    state: 'docs/diagrams/sds_state_machine.png',
    uinav: 'docs/diagrams/sds_ui_navigation.png',
    usecase: 'docs/diagrams/srs_use_case_diagram.png',
    cls: 'docs/diagrams/srs_class_diagram.png',
    dfd0: 'docs/diagrams/srs_dfd_level_0.png',
    dfd1: 'docs/diagrams/srs_dfd_level_1.png',
    actCitizen: 'docs/diagrams/srs_activity_citizen_report.png',
    actRepair: 'docs/diagrams/srs_activity_repair_closure.png',
    seqCitizen: 'docs/diagrams/srs_sequence_citizen_submission.png',
    seqRepair: 'docs/diagrams/srs_sequence_repair_closure.png',
    uiLanding: 'docs/diagrams/report_ui_landing.png',
    uiMap: 'docs/diagrams/report_ui_live_map.png',
    uiCitizenReport: 'docs/diagrams/report_ui_citizen_report.png',
    uiCitizenDetails: 'docs/diagrams/report_ui_citizen_details.png',
    uiGovDash: 'docs/diagrams/report_ui_gov_dashboard.png',
    uiGovDetails: 'docs/diagrams/report_ui_gov_details.png',
  };
  const ids = {};
  for (const [k, rel] of Object.entries(files)) {
    ids[k] = await uploadImage(rel);
    console.log(`  Uploaded ${k} -> ${ids[k]}`);
  }
  return ids;
}

// -------------------------------------------------------------
// 3. Populate Root Intro & All 12 Child Documentation Pages
// -------------------------------------------------------------
async function updatePages(imgs) {
  console.log('\nUpdating Root overview & all 12 Notion documentation sub-pages...');

  // Root Workspace top overview paragraph (leaves all child pages/DBs intact!)
  await notionRequest('/blocks/da00d817-9cdf-40c3-a831-0e599323f842', {
    method: 'PATCH',
    body: JSON.stringify({
      paragraph: {
        rich_text: [
          rt('Smart Civic Road Issue Reporting and AI-Based Pothole Verification System (Vadodara)', { bold: true }),
          rt(' — B.Tech CSE Major Project [CSE701], Navrachana University | Parin Shah (23001091) & Ujjaval Rathod (23001113) | Guide: Professor Ujwala Petigara | Repo: github.com/ParinShah2312/Pothole-Reporting-System | Stack: React 19 + Vite 8 + Leaflet, Node.js/Express, PostgreSQL 17 + PostGIS 3, FastAPI (:8000).'),
        ],
      },
    }),
  });

  // 1. Project Brief
  await replacePageContent('3dff97eb-e92d-81b4-9cd4-f9fe2f2f1e3e', [
    callout('🚦', 'Status: Phases 0-3 Completed (Public Map, Citizen, Gov & Admin Portals Live) | Next: Phase 4 (YOLO Dataset & Training)'),
    h2('Project Metadata'),
    tableBlock(
      ['Field', 'Details'],
      [
        ['Project Title', 'Smart Civic Road Issue Reporting and AI-Based Pothole Verification System'],
        ['Course & Institution', 'B.Tech Computer Science & Engineering (CSE701) — School of Engineering and Technology, Navrachana University, Vadodara'],
        ['Team Members', 'Parin Shah (23001091) · Ujjaval Rathod (23001113)'],
        ['Project Guide & Head', 'Guide: Professor Ujwala Petigara · Program Chair: Prof. Ninad Bhavsar · HoD: Dr. Dhaval Mehta'],
        ['Repository', 'https://github.com/ParinShah2312/Pothole-Reporting-System'],
      ],
    ),
    h2('Problem Statement'),
    p('Most municipal road portals rely on text complaints without reliable spatial validation or visual closure proof. Citizens face unclear status updates, engineers receive duplicate or off-site complaints, and tickets risk premature closure without verifiable evidence that asphalt repairs occurred.'),
    h2('Solution Overview (Closed-Loop Verification)'),
    bullet('Geotagged Intake: ', 'Citizens capture GPS coordinates (with manual road-pin adjustments capped near the fix) and upload pothole photos.'),
    bullet('Spatial Gatekeeping: ', 'PostGIS flags potential duplicate reports within 200 m before creating cluttered tickets.'),
    bullet('Municipal Triage & Geo-Fenced Closure: ', 'Vadodara officers dispatch zone repairs and upload completion photos validated within 50 m (configurable) of the original complaint.'),
    bullet('Live Public Accountability: ', 'Interactive Leaflet map and KPI counters maintain Total = Active + Solved atomically.'),
    imgBlock(imgs.uiLanding, 'Live Public Portal showing Vadodara KPI counters and interactive map preview'),
  ]);

  // 2. User Roles
  await replacePageContent('3dff97eb-e92d-8116-b884-da7a092018ee', [
    callout('👥', 'Strict Role-Based Access Control (RBAC) enforced via signed JWT tokens separating public, citizen, government, and admin endpoints.'),
    h2('Role Permissions Matrix'),
    tableBlock(
      ['Role', 'Portal Access', 'Core Capabilities', 'Demo Credentials'],
      [
        ['Public Visitor', '/, /map, /stats', 'View clustered Vadodara map, search locations (Nominatim), track SSE counters & analytics trends', 'No login required'],
        ['Citizen', '/citizen, /citizen/report, /citizen/profile, /verify-email, /reset-password', 'Register/login, verify email, reset password, manage profile, submit 1-5 geotagged pothole photos, view EXIF/location flags & resolution proof', 'citizen@demo.local / Citizen@123'],
        ['Government Officer', '/gov, /gov/reports/:id', 'Multi-filter Needs-Action queue, assign departments, upload 50 m geo-fenced closure photos, retry or escalate to Admin Review', 'gov@demo.local / Gov@12345'],
        ['System Admin', '/admin/review, /admin/users, /admin/audit-logs, /admin/settings', 'Manage/suspend staff & citizens, override flagged/rejected reports, inspect audit_logs, tune AI & distance thresholds live', 'admin@demo.local / Admin@1234'],
      ],
    ),
    imgBlock(imgs.usecase, 'System Use Case Diagram across Public, Citizen, Government, Admin, and AI Engine actors'),
  ]);

  // 3. System Workflow
  await replacePageContent('3dff97eb-e92d-816d-a095-ec45c689f7e9', [
    callout('🔄', 'Closed-loop workflow guaranteeing every complaint progresses cleanly through verified state transitions recorded in status_history.'),
    h2('Closed-Loop State Machine'),
    p('Reports enter as pending_verification, transition to active after Stage 1 check (counted in Total & Active), progress through assigned -> in_progress -> repair_completed, and close as solved (Active -1, Solved +1) after 50 m default geo-fenced completion proof passes Stage 2 check (or Admin override from under_review / rejected).'),
    imgBlock(imgs.state, 'Six-State Closed-Loop Report Lifecycle & Transition Guards'),
    divider(),
    h2('Context & Process Data Flows (DFD Level 0 & 1)'),
    imgBlock(imgs.dfd0, 'DFD Level 0 — System Context Diagram'),
    imgBlock(imgs.dfd1, 'DFD Level 1 — Process & Data Store Decomposition'),
    divider(),
    h2('Activity & Sequence Workflows'),
    imgBlock(imgs.actCitizen, 'Activity Flow: Citizen Report Submission & Spatial Checks'),
    imgBlock(imgs.actRepair, 'Activity Flow: Municipal Repair Dispatch & Closure Gate'),
    imgBlock(imgs.seqCitizen, 'Sequence Diagram: Citizen Complaint Submission'),
    imgBlock(imgs.seqRepair, 'Sequence Diagram: Repair Completion Verification'),
  ]);

  // 4. Database Design
  await replacePageContent('3dff97eb-e92d-81ff-b50b-e3fd3dcc8f43', [
    callout('🗄️', 'PostgreSQL 17.11 + PostGIS 3 normalized 13-table schema (001_initial_schema.sql, 002_auth_hardening.sql, 003_admin_settings.sql) with GIST spatial indexing.'),
    h2('Schema Overview (13 Tables across Migrations 001–003)'),
    tableBlock(
      ['Table', 'Primary Key', 'Foreign Keys', 'Role in System'],
      [
        ['departments', 'dept_id', '—', 'Vadodara municipal road maintenance zones (North, South, East, West)'],
        ['users', 'user_id', 'department_id -> departments', 'Citizen, government staff & admin accounts (with email_verified, failed_login_attempts, locked_until)'],
        ['refresh_tokens', 'token_id', 'user_id -> users', 'SHA-256 hashed rotating 7-day refresh tokens & revocation timestamps'],
        ['auth_tokens', 'token_id', 'user_id -> users', 'Single-use hashed tokens for email verification (24h) and password reset (1h)'],
        ['app_settings', 'key', 'updated_by -> users', 'Admin-configurable AI accept/reject cutoffs and spatial GPS/EXIF/repair thresholds'],
        ['reports', 'report_id', 'citizen_id, department_id', 'Core geotagged pothole complaints with PostGIS GEOGRAPHY(POINT, 4326) & EXIF GPS'],
        ['report_images', 'image_id', 'report_id -> reports', 'Uploaded citizen pothole evidence photos (1-5 per report)'],
        ['repairs', 'repair_id', 'report_id, dept_id, assigned_by', 'Municipal work orders tracking assigned/started/completed timestamps'],
        ['completion_images', 'comp_img_id', 'repair_id, uploaded_by', 'Post-repair photos with GEOGRAPHY location & distance_m from complaint'],
        ['ai_verifications', 'ai_id', 'report_id, report_image_id, completion_image_id', 'Stage 1 & Stage 2 confidence scores, results, and JSONB diagnostics'],
        ['status_history', 'history_id', 'report_id, changed_by', 'Immutable lifecycle audit trail for every transition'],
        ['notifications', 'notif_id', 'user_id, report_id', 'Notification persistence table (API & Notification Center UI postponed)'],
        ['audit_logs', 'audit_id', 'user_id', 'Administrative and system security audit trail'],
      ],
    ),
    h2('Seeded Vadodara Complaints (8 Realistic Demo Records)'),
    tableBlock(
      ['report_id', 'Address', 'Coordinates (Lat, Lng)', 'Status', 'Department', 'Description'],
      [
        ['1', 'Alkapuri, Vadodara', '22.3106, 73.1700', 'active', 'NULL', 'Deep pothole near the signal, two-wheelers swerving around it.'],
        ['2', 'Gotri Road, Vadodara', '22.3165, 73.1395', 'active', 'NULL', 'Large pothole on the left lane after the rain.'],
        ['3', 'Karelibaug, Vadodara', '22.3280, 73.2070', 'active', 'NULL', 'NULL'],
        ['4', 'Fatehgunj, Vadodara', '22.3240, 73.1880', 'assigned', '3 (East Zone)', 'Several small potholes merging into one.'],
        ['5', 'Akota, Vadodara', '22.2980, 73.1640', 'in_progress', '3 (East Zone)', 'Pothole near the bridge approach.'],
        ['6', 'Manjalpur, Vadodara', '22.2711, 73.1950', 'repair_completed', '3 (East Zone)', 'Broken patch near the crossroads.'],
        ['7', 'Sayajigunj, Vadodara', '22.3115, 73.1820', 'solved', '3 (East Zone)', 'Pothole outside the main road junction.'],
        ['8', 'Waghodia Road, Vadodara', '22.2990, 73.2300', 'solved', '3 (East Zone)', 'Crater-sized pothole near the petrol pump.'],
      ],
    ),
  ]);

  // 5. Relationships / ER Diagram
  await replacePageContent('3dff97eb-e92d-818f-8626-ed2d4327d226', [
    callout('🔗', 'Normalized Chen Entity-Relationship Diagram (base 10 entities extended by migrations 002 & 003 to 13 tables including refresh_tokens, auth_tokens, app_settings) and OOP Class Architecture.'),
    h2('Core Entity-Relationship Diagram (13 Tables in Live DB)'),
    imgBlock(imgs.er, 'Chen ER Diagram — departments, users, reports, report_images, repairs, completion_images, ai_verifications, status_history, notifications, audit_logs (+ refresh_tokens, auth_tokens, app_settings)'),
    divider(),
    h2('System Class Diagram'),
    imgBlock(imgs.cls, 'Domain Class Diagram depicting controllers, services, repositories, and AI verification client'),
  ]);

  // 6. AI/ML Module
  await replacePageContent('3dff97eb-e92d-815f-bf2d-e7d809d178c7', [
    callout('🤖', 'FastAPI microservice running on port 8000 with heuristic verification active now; custom Ultralytics YOLO weights scheduled for Phase 4.'),
    h2('Two-Stage Automated Verification Pipeline'),
    tableBlock(
      ['Stage', 'Endpoint', 'Decision Threshold', 'Current Status'],
      [
        ['Stage 1 — Citizen Pothole Check', 'POST /detect/pothole', 'Confidence >= 0.60 -> active (< 0.40 reject, else under_review; tunable in /admin/settings)', 'FastAPI contract live (deterministic stub; YOLO training in Phase 4)'],
        ['Stage 2 — Post-Repair Clearance', 'POST /verify/repair', 'Confidence >= 0.60 + distance_m <= 50 m -> solved (tunable in /admin/settings)', 'FastAPI contract + PostGIS 50 m geo-fence active'],
      ],
    ),
    h2('Verification Service Stack'),
    p('Python 3.13, FastAPI 0.143, Pydantic 2.14, Uvicorn 0.54 (isolated in ai-service/ so CPU/GPU inference never blocks Node.js Express event loops). Target Phase 4 weights will train Ultralytics YOLO models on Pothole-600 and RDD2022 benchmarks alongside EXIF/visual anti-spoofing checks.'),
  ]);

  // 7. Map / Geolocation Module
  await replacePageContent('3dff97eb-e92d-81d6-9380-f828214fe9f9', [
    callout('🗺️', 'Live Clustered Vadodara GIS Map powered by Leaflet 1.9 + leaflet.markercluster + OpenStreetMap Nominatim search + PostGIS GEOGRAPHY(POINT, 4326).'),
    h2('Implemented Geolocation & Spatial Rules (Configurable in Admin Settings)'),
    tableBlock(
      ['Spatial Rule', 'Default Threshold (app_settings)', 'Purpose'],
      [
        ['Browser GPS Accuracy Gate', '25 m target / > 100 m flag', 'Highlights weak GPS in amber and flags reports above 100 m for manual review'],
        ['Manual Map-Pin Offset Flag', '200 m from GPS fix', 'Lets citizens refine road-side pin while flagging large displacement (pin_moved_far)'],
        ['Duplicate Proximity Check', '25 m (ST_DWithin)', 'Flags existing open verified complaints near the same road spot (possible_duplicate)'],
        ['Repair Worker Closure Geo-Fence', '50 m (ST_Distance)', 'Visual green circle + server check requiring completion photos within 50 m of pothole'],
        ['Photo EXIF Cross-Check', 'Live (exifr, > 200 m flag)', 'Extracts embedded camera GPS headers into exif_lat / exif_lng & flags exif_mismatch'],
        ['Area / Road Geocoding Search', 'OpenStreetMap Nominatim', 'Instant Vadodara area/road lookup with smooth map fly-to transitions'],
      ],
    ),
    imgBlock(imgs.uiMap, 'Interactive Vadodara Live Map displaying seeded pothole markers and status filters'),
  ]);

  // 8. System Architecture
  await replacePageContent('3dff97eb-e92d-814a-bf5d-ee07aa9b38e7', [
    callout('🌐', 'Decoupled N-Tier Architecture: React 19 SPA (:5173) -> Express 5 REST API (:5000) -> PostgreSQL 17 + PostGIS (:5432) & FastAPI AI Service (:8000).'),
    h2('Verified Runtime Stack'),
    tableBlock(
      ['Tier', 'Technology Versions', 'Responsibility'],
      [
        ['Client Web App', 'React 19, Vite 8, React Router 7, Leaflet 1.9, leaflet.markercluster 2.0', 'Public landing & /stats analytics, clustered map + Nominatim search, Citizen, Gov & Admin portals'],
        ['API Server', 'Node.js, Express 5.3, pg 8.23, zod, exifr, express-rate-limit, jsonwebtoken 9, bcryptjs 3, Multer 2.4', 'JWT 15m/7d refresh RBAC, lockout, EXIF & 1-5 local uploads, SSE counters, Admin governance & spatial checks'],
        ['Spatial Database', 'PostgreSQL 17.11 + PostGIS 3.x', '13-table ACID relational store (migrations 001-003) with GIST geography spatial queries'],
        ['AI Microservice', 'Python 3.13, FastAPI 0.143, Uvicorn, Pydantic', 'Stage 1 pothole verification & Stage 2 repair clearance microservice'],
      ],
    ),
    h2('Four-Tier Architecture Diagram'),
    imgBlock(imgs.arch, 'Four-Tier Architecture connecting Web Client, Express API, PostgreSQL/PostGIS, Media Storage, and FastAPI AI Service'),
  ]);

  // 9. UI/UX Planning (Full Screen Map + Live App Screenshots)
  await replacePageContent('3dff97eb-e92d-81b9-bed4-ca2334ce51df', [
    callout('🎨', 'Live responsive web application screenshots captured from the running Vadodara development stack (localhost:5173).'),
    h2('Screen Navigation Diagram'),
    imgBlock(imgs.uinav, 'Role-Based Frontend Screen Navigation Map across Public, Citizen, and Government Portals'),
    divider(),
    h2('Captured Live Portal Screenshots'),
    imgBlock(imgs.uiLanding, 'Public Landing Page (/) — Live KPI Cards & Vadodara Map Preview'),
    imgBlock(imgs.uiMap, 'Live Interactive City Map (/map) — Status Filter Chips & Clustered Markers'),
    imgBlock(imgs.uiCitizenReport, 'Citizen Report Form (/citizen/report) — Live GPS Picker & Photo Upload'),
    imgBlock(imgs.uiCitizenDetails, 'Solved Citizen Report Details (/citizen/reports/7) — Before/After Comparison & Spatial Metadata'),
    imgBlock(imgs.uiGovDash, 'Government Portal Dashboard (/gov) — Needs-Action Queue & East Zone Triage Map'),
    imgBlock(imgs.uiGovDetails, 'Government Report Details (/gov/reports/7) — Repair Proof Distance Verification (6 m away)'),
  ]);

  // 10. Live Counters & Statistics
  await replacePageContent('3dff97eb-e92d-81cb-acd9-f5f44f53346d', [
    callout('📊', 'Public accountability invariant pushed live via SSE (GET /api/stats/stream): Total Verified Reports = Active in Pipeline + Repaired & Solved.'),
    h2('Counter Definitions & Live Seeded Values'),
    tableBlock(
      ['Metric', 'Included Report Statuses', 'Live Seeded Count'],
      [
        ['Total Verified Reports', 'All complaints with verified_at IS NOT NULL (active, assigned, in_progress, repair_completed, solved)', '8'],
        ['Active in Pipeline', 'active, assigned, in_progress, repair_completed', '6'],
        ['Repaired & Solved', 'solved (Stage 2 verified closure)', '2'],
      ],
    ),
    p('On GET /api/stats/counters, SSE /api/stats/stream, and GET /api/stats/trends (/stats dashboard), PostgreSQL computes counts, daily Reported vs. Solved trends, resolution times, and zone workloads atomically.'),
  ]);

  // 11. Security & Privacy
  await replacePageContent('3dff97eb-e92d-8155-a774-f8ed67379a8b', [
    callout('🔐', 'Phases 2-3 Security, Auth & Admin Governance live (verified by automated phase2.test.js & phase3.test.js suites, 6/6 passing).'),
    h2('Implemented Security & Auth Controls'),
    bullet('Password Hashing & Validation: ', 'bcryptjs salted hashes + strict zod request schema validation across auth & profile endpoints.'),
    bullet('Rotating Sessions & Lockout: ', '15-minute access JWT paired with 7-day rotating SHA-256 refresh_tokens, /logout revocation, and 5-attempt 423 Locked (15 min) account lockout.'),
    bullet('Rate Limiting & RBAC: ', 'express-rate-limit (authLimiter on login/register/verify/reset, uploadLimiter on POST /api/reports) plus email_verified gate before reporting.'),
    bullet('Upload Filtering & EXIF Cross-Check: ', 'Multer enforces 1-5 images (<= 8 MB JPEG/PNG/WebP) stored locally in server/uploads/; exifr parses embedded GPS and flags > 200 m exif_mismatch.'),
    bullet('SQL Injection Prevention & Auditability: ', '100% parameterized pg queries, status_history transition logs, and audit_logs trail.'),
    h2('Dev-Mode Verification vs. Future Production Enhancements (Deferred Scope)'),
    bullet('Email Verification & Password Reset (SMTP/OTP Planned): ', 'Local development issues SHA-256 auth_tokens and surfaces clickable devVerifyUrl/devResetUrl links (+ server logs) for instant 1-click testing without an SMTP server. Production deployment will send outbound SMTP emails containing either an OTP code or emailed link instead of returning dev URLs.'),
    bullet('Cloudinary Cloud Storage (Postponed): ', 'Uploaded photos remain in local server/uploads/ for Phases 2-3 rather than Cloudinary.'),
    bullet('In-App Notification Center UI (Postponed): ', 'PostgreSQL notifications table stays ready while API endpoints and header notification UI are postponed.'),
  ]);

  // 12. Project Documentation
  await replacePageContent('3dff97eb-e92d-813f-b935-f389fb190836', [
    callout('📄', 'All formal NUV B.Tech CSE701 documentation deliverables locked in docs/reports/.'),
    h2('Formal Deliverables Inventory'),
    tableBlock(
      ['Document', 'File Location', 'Pages / Scope', 'Status'],
      [
        ['Software Requirement Specifications (SRS)', 'docs/reports/Software Requirement Specifications.docx & .pdf', '30 pages — IEEE Std, DFD/UML/Use-Case/Sequence/ER diagrams', 'Completed & Locked'],
        ['Software Design Specifications (SDS)', 'docs/reports/Software Design Specifications.docx & .pdf', '19 pages — N-tier architecture, state machine, UI nav, API specs', 'Completed & Locked'],
        ['Major Project Report', 'docs/reports/Project Report.docx & .pdf', '33 pages — NUV front pages, TOC/LOF/LOT, Ch 1-6, UI captures, Appendix A & B Data Dictionary', 'Completed'],
        ['Project Presentation', 'docs/presentations/Smart Civic Pothole System - Presentation.pptx', 'Defense slide deck (Oct 2026 baseline on disk)', 'Needs Phase 2-3/4 refresh'],
      ],
    ),
  ]);

  console.log('  Synced Root Workspace + all 12 Notion documentation sub-pages!');
}

async function main() {
  console.log('Starting full Notion workspace sync (databases + pages + diagrams)...');
  await updateDatabases();
  const imgs = await uploadAllDiagrams();
  await updatePages(imgs);
  console.log('\nNotion workspace fully synchronized with all diagrams, schemas, and project documentation!');
}

main().catch((err) => {
  console.error('Fatal error during Notion sync:', err);
  process.exit(1);
});
