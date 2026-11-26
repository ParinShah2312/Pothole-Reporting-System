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
    'Authentication & User Management': { status: 'Complete', notes: 'JWT, bcryptjs, RBAC middleware active for citizen, government, admin' },
    'Citizen Portal': { status: 'Complete', notes: 'React 19 + Vite 8 + React Router 7: Dashboard, ReportPothole, CitizenReportDetails' },
    'Interactive Map': { status: 'Complete', notes: 'Leaflet 1.9 + OpenStreetMap Vadodara live map with status color markers & filters' },
    'Pothole Reporting': { status: 'Complete', notes: 'Live GPS accuracy check, manual pin fallback; Cloudinary & EXIF queued for Phase 2' },
    'Live Statistics / Counters': { status: 'Complete', notes: 'GET /api/stats/counters enforcing Total = Active + Solved invariant' },
    'Problem Management': { status: 'Complete', notes: 'Strict status state machine, 10-table schema, immutable status_history audit trail' },
    'Government Portal': { status: 'Complete', notes: 'GovDashboard queue tabs + zone map + GovReportDetails transition controls' },
    'Repair Verification': { status: 'Complete', notes: 'PostGIS ST_Distance (<= 100 m) geo-fence check + Stage 2 verification endpoint' },
    'Database': { status: 'Complete', notes: 'PostgreSQL 17.11 + PostGIS 3 geography(POINT, 4326) + GIST spatial index' },
    'AI Verification': { status: 'In Progress', notes: 'FastAPI (:8000) active with heuristic stub (0.60/0.40 gates); YOLO training in Phase 4' },
    'Security': { status: 'In Progress', notes: 'Parameterized pg SQL, CORS, JWT RBAC active; rate-limiting & upload hardening in Phase 2/5' },
    'Notifications': { status: 'In Progress', notes: 'notifications table active in PostgreSQL; in-app notification center UI in Phase 2/3' },
    'Administration': { status: 'In Progress', notes: 'Admin role & audit_logs table active; dedicated Admin Review Queue UI in Phase 3' },
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
    'Implement report markers and clustering': { status: 'In progress', progress: 85 },
    'Implement AI verification service': { status: 'In progress', progress: 65 },
    'Build Government Portal features': { status: 'Done', progress: 100 },
    'Implement completion image upload and verification': { status: 'Done', progress: 100 },
    'Write SRS and technical documentation': { status: 'Done', progress: 100 },
    'Collect and review research papers': { status: 'Done', progress: 100 },
    'Write literature review document': { status: 'Done', progress: 100 },
  };
  for (const row of roadRows) {
    const t = roadMap[getTitle(row)];
    if (t) {
      await updatePageProperties(row.id, {
        Status: { status: { name: t.status } },
        Progress: { number: t.progress },
      });
    }
  }
  console.log('  Synced Project Roadmap');

  // API Design
  const apiRows = await queryDatabase('e7a3b4b7-270d-406b-980c-eb155ad37f6c');
  const apiMap = {
    'API-001': { status: 'Implemented', notes: 'POST /api/auth/register (Citizen signup with bcryptjs)' },
    'API-002': { status: 'Implemented', notes: 'POST /api/auth/login (JWT citizen & government portal login)' },
    'API-003': { status: 'Implemented', notes: 'Client JWT discard + stateless session cleanup' },
    'API-004': { status: 'Implemented', notes: 'POST /api/reports (Multipart photo, GPS/pin validation, ST_DWithin check)' },
    'API-005': { status: 'Implemented', notes: 'GET /api/reports/map (Public verified Vadodara markers)' },
    'API-006': { status: 'Implemented', notes: 'GET /api/reports/:id (Citizen/Gov report details & images)' },
    'API-007': { status: 'Implemented', notes: 'PATCH /api/gov/reports/:id/status (Department dispatch & progress)' },
    'API-008': { status: 'Implemented', notes: 'POST /api/gov/reports/:id/completion (100 m geo-fence + Stage 2 verify)' },
    'API-009': { status: 'Implemented', notes: 'GET /api/stats/counters (Total = Active + Solved)' },
    'API-010': { status: 'Implemented', notes: 'GET /api/auth/me (Authenticated current user profile)' },
    'API-011': { status: 'Implemented', notes: 'GET /api/reports/mine (Citizen own report list)' },
    'API-012': { status: 'Designed', notes: 'GET/PATCH /api/admin/* (Phase 3 admin review queue & user governance)' },
  };
  for (const row of apiRows) {
    const t = apiMap[getTitle(row)];
    if (t) {
      await updatePageProperties(row.id, {
        Status: { select: { name: t.status } },
        Notes: { rich_text: [rt(t.notes)] },
      });
    }
  }
  console.log('  Synced API Design');

  // Sync Task Board with clear real milestones (replace blank placeholder row if empty)
  const TASK_DB = '27e0b4c8-7488-4918-bd91-49efe5acad09';
  const existingTasks = await queryDatabase(TASK_DB);
  const existingTitles = new Set(existingTasks.map((r) => getTitle(r)).filter(Boolean));
  const desiredTasks = [
    ['Align PostgreSQL/PostGIS 10-table schema & Vadodara seed data', 'Completed', 'High', 'PostgreSQL 17.11 + PostGIS 3 running with 4 zones, 3 roles, 8 seeded complaints'],
    ['Complete SRS, SDS, and Project Report (.docx & .pdf)', 'Completed', 'High', 'Formal NUV documentation locked (SRS 30p, SDS 19p, Project Report 33p)'],
    ['Phase 2: Integrate Cloudinary cloud storage & EXIF GPS reader', 'To Do', 'High', 'Move uploads from local server/uploads/ to Cloudinary and parse camera EXIF'],
    ['Phase 2/3: Multi-photo upload (1-5) & Notification Center UI', 'To Do', 'Medium', 'Surface notifications DB records cleanly inside Citizen & Gov navbars'],
    ['Phase 3: Admin Review Queue & Department Governance UI', 'To Do', 'High', 'Add /admin screens for uncertain AI verifications, overrides, and audit logs'],
    ['Phase 4: Train Ultralytics YOLO weights on RDD2022 & Pothole-600', 'Backlog', 'High', 'Replace FastAPI heuristic stub while preserving verify-pothole/verify-repair API'],
    ['Phase 5-6: Automated Jest/Pytest/Playwright tests & Cloud deployment', 'Backlog', 'Medium', 'End-to-end test suite, rate-limiting, Docker Compose production rollout'],
    ['Create Document #4: Final Project Presentation (.pptx)', 'To Do', 'High', 'Build defense slide deck from finalized SRS, SDS, Project Report, and UI captures'],
  ];
  // Reuse blank row if present
  let blankRow = existingTasks.find((r) => !getTitle(r));
  for (const [title, status, priority, notes] of desiredTasks) {
    if (existingTitles.has(title)) continue;
    const props = {
      Task: { title: [rt(title)] },
      Status: { status: { name: status } },
      Priority: { select: { name: priority } },
      Description: { rich_text: [rt(notes)] },
    };
    if (blankRow) {
      await updatePageProperties(blankRow.id, props);
      blankRow = null;
    } else {
      await createDatabasePage(TASK_DB, props);
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
    callout('🚦', 'Status: Phase 0 & 1 Live + Verified | SRS, SDS & Project Report Completed | Next: Phases 2-3 & Final Presentation'),
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
    bullet('Municipal Triage & Geo-Fenced Closure: ', 'Vadodara officers dispatch zone repairs and upload completion photos validated within 100 m of the original complaint.'),
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
        ['Public Visitor', '/ and /map', 'View Vadodara live map, filter markers by status, inspect real-time KPI counters', 'No login required'],
        ['Citizen', '/citizen, /citizen/report', 'Register/login, submit geotagged pothole complaints, track own reports, view before/after resolution proof', 'citizen@demo.local / Citizen@123'],
        ['Government Officer', '/gov, /gov/reports/:id', 'Triage Needs-Action queue, assign departments, move work through assigned -> in_progress -> repair_completed, upload geo-fenced closure photos', 'gov@demo.local / Gov@12345'],
        ['System Admin', 'Protected /gov + Admin UI (Phase 3)', 'Oversee departments/staff, review flagged AI submissions, inspect audit_logs', 'admin@demo.local / Admin@1234'],
      ],
    ),
    imgBlock(imgs.usecase, 'System Use Case Diagram across Public, Citizen, Government, Admin, and AI Engine actors'),
  ]);

  // 3. System Workflow
  await replacePageContent('3dff97eb-e92d-816d-a095-ec45c689f7e9', [
    callout('🔄', 'Closed-loop workflow guaranteeing every complaint progresses cleanly through verified state transitions recorded in status_history.'),
    h2('Closed-Loop State Machine'),
    p('Reports enter as pending_verification, transition to active after Stage 1 check (counted in Total & Active), progress through assigned -> in_progress -> repair_completed, and close as solved (Active -1, Solved +1) only after 100 m geo-fenced completion proof passes Stage 2 check.'),
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
    callout('🗄️', 'PostgreSQL 17.11 + PostGIS 3 normalized 10-table schema (database/migrations/001_initial_schema.sql) with GIST spatial indexing.'),
    h2('Schema Overview (10 Tables)'),
    tableBlock(
      ['Table', 'Primary Key', 'Foreign Keys', 'Role in System'],
      [
        ['departments', 'dept_id', '—', 'Vadodara municipal road maintenance zones (North, South, East, West)'],
        ['users', 'user_id', 'department_id -> departments', 'Citizen, government staff, and administrator accounts'],
        ['reports', 'report_id', 'citizen_id, department_id', 'Core geotagged pothole complaints with PostGIS GEOGRAPHY(POINT, 4326)'],
        ['report_images', 'image_id', 'report_id -> reports', 'Uploaded citizen pothole evidence photos'],
        ['repairs', 'repair_id', 'report_id, dept_id, assigned_by', 'Municipal work orders tracking assigned/started/completed timestamps'],
        ['completion_images', 'comp_img_id', 'repair_id, uploaded_by', 'Post-repair photos with GEOGRAPHY location & distance_m from complaint'],
        ['ai_verifications', 'ai_id', 'report_id, report_image_id, completion_image_id', 'Stage 1 & Stage 2 confidence scores, results, and JSONB diagnostics'],
        ['status_history', 'history_id', 'report_id, changed_by', 'Immutable lifecycle audit trail for every transition'],
        ['notifications', 'notif_id', 'user_id, report_id', 'User & officer alerts persisted per state update'],
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
    callout('🔗', 'Normalized Chen Entity-Relationship Diagram and Object-Oriented Class Architecture covering all 10 relational entities.'),
    h2('Ten-Table Chen Entity-Relationship Diagram'),
    imgBlock(imgs.er, 'Chen ER Diagram — departments, users, reports, report_images, repairs, completion_images, ai_verifications, status_history, notifications, audit_logs'),
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
        ['Stage 1 — Citizen Pothole Check', 'POST /api/v1/verify-pothole', 'Confidence >= 0.60 -> active (else uncertain/rejected)', 'FastAPI contract live (deterministic stub; YOLO training in Phase 4)'],
        ['Stage 2 — Post-Repair Clearance', 'POST /api/v1/verify-repair', 'Confidence >= 0.40 + distance_m <= 100 m -> solved', 'FastAPI contract + PostGIS 100 m geo-fence active'],
      ],
    ),
    h2('Verification Service Stack'),
    p('Python 3.13, FastAPI 0.143, Pydantic 2.14, Uvicorn 0.54 (isolated in ai-service/ so CPU/GPU inference never blocks Node.js Express event loops). Target Phase 4 weights will train Ultralytics YOLO models on Pothole-600 and RDD2022 benchmarks alongside EXIF/visual anti-spoofing checks.'),
  ]);

  // 7. Map / Geolocation Module
  await replacePageContent('3dff97eb-e92d-81d6-9380-f828214fe9f9', [
    callout('🗺️', 'Live Interactive Vadodara GIS Map powered by Leaflet 1.9 + OpenStreetMap tiles + PostGIS GEOGRAPHY(POINT, 4326) spatial queries.'),
    h2('Implemented Geolocation & Spatial Rules'),
    tableBlock(
      ['Spatial Rule', 'Configured Threshold', 'Purpose'],
      [
        ['Browser GPS Accuracy Gate', '25 m target accuracy', 'Prevents wild coarse cell-tower pins on citizen intake'],
        ['Manual Map-Pin Offset Limit', '50 m from GPS fix', 'Lets citizens refine road-side pin without spoofing distant wards'],
        ['Duplicate Proximity Check', '200 m (ST_DWithin)', 'Flags existing active complaints near the same road intersection'],
        ['Repair Worker Closure Geo-Fence', '100 m (ST_Distance)', 'Blocks completion uploads submitted away from the original pothole coordinate'],
        ['Photo EXIF Cross-Check', 'Planned in Phase 2', 'Extracts embedded camera GPS headers into exif_lat / exif_lng columns'],
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
        ['Client Web App', 'React 19, Vite 8, React Router 7, Leaflet 1.9', 'Public landing, interactive map, citizen submission flow, government dashboard'],
        ['API Server', 'Node.js, Express 5.3, pg 8.23, jsonwebtoken 9, bcryptjs 3, Multer 2.4', 'JWT RBAC auth, spatial validation, atomic status transactions, Cloudinary (Phase 2)'],
        ['Spatial Database', 'PostgreSQL 17.11 + PostGIS 3.x', '10-table ACID relational store with GIST geography spatial queries'],
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
    callout('📊', 'Public accountability invariant enforced by PostgreSQL queries: Total Verified Reports = Active in Pipeline + Repaired & Solved.'),
    h2('Counter Definitions & Live Verified Values'),
    tableBlock(
      ['Metric', 'Included Report Statuses', 'Live Seeded Count'],
      [
        ['Total Verified Reports', 'All complaints with verified_at IS NOT NULL (active, assigned, in_progress, repair_completed, solved)', '8'],
        ['Active in Pipeline', 'active, assigned, in_progress, repair_completed', '6'],
        ['Repaired & Solved', 'solved (Stage 2 verified closure)', '2'],
      ],
    ),
    p('On GET /api/stats/counters, the server computes Active and Solved directly from PostgreSQL and guarantees Total = Active + Solved with zero drift.'),
  ]);

  // 11. Security & Privacy
  await replacePageContent('3dff97eb-e92d-8155-a774-f8ed67379a8b', [
    callout('🔐', 'Security Checklist synchronized with implemented backend guards and remaining Phase 2-5 hardening milestones.'),
    h2('Implemented Security Controls'),
    bullet('Password Hashing: ', 'bcryptjs salted hashing stored inside users.password_hash.'),
    bullet('JWT Role Segregation: ', 'Protected citizen (/api/reports/*) and municipal (/api/gov/*) routes enforce role claims via auth middleware.'),
    bullet('SQL Injection Prevention: ', '100% parameterized queries via pg pool in repositories.'),
    bullet('Upload Filtering: ', 'Multer enforces 8 MB size cap and image MIME allowlist (JPEG, PNG, WebP).'),
    bullet('Immutable Auditability: ', 'Every state transition logs into status_history, and admin actions map to audit_logs.'),
    h2('Planned Security Hardening (Phases 2-5)'),
    bullet('Cloudinary upload signatures & EXIF GPS cross-check (Phase 2).', ''),
    bullet('API rate limiting on auth & report submission + security regression tests (Phase 5).', ''),
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
        ['Project Presentation', 'docs/presentations/Smart Civic Pothole System - Presentation.pptx', 'Defense slide deck aligned with final report', 'Planned Next'],
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
