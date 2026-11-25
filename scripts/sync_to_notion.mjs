import fs from 'fs';

let TOKEN = process.env.NOTION_API_KEY;
if (!TOKEN && fs.existsSync('.env')) {
  for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
    if (line.startsWith('NOTION_API_KEY=')) {
      TOKEN = line.split('=')[1].trim();
      break;
    }
  }
}
if (!TOKEN) {
  throw new Error('NOTION_API_KEY is not defined in .env or environment.');
}

const NOTION_VERSION = '2022-06-28';

async function notionRequest(endpoint, options = {}) {
  const url = `https://api.notion.com/v1${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} on ${endpoint}: ${text}`);
  }
  return res.json();
}

async function queryDatabase(dbId) {
  let rows = [];
  let cursor;
  while (true) {
    const res = await notionRequest(`/databases/${dbId}/query`, {
      method: 'POST',
      body: JSON.stringify({ page_size: 100, start_cursor: cursor }),
    });
    rows.push(...res.results);
    if (!res.has_more) break;
    cursor = res.next_cursor;
  }
  return rows;
}

function getTitle(row) {
  for (const val of Object.values(row.properties || {})) {
    if (val.type === 'title') {
      return (val.title || []).map(t => t.plain_text).join('').trim();
    }
  }
  return '';
}

async function updatePage(id, properties) {
  return notionRequest(`/pages/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ properties }),
  });
}

// -------------------------------------------------------------
// 1. Update System Modules
// -------------------------------------------------------------
async function updateSystemModules() {
  console.log('\nUpdating 🧩 System Modules...');
  const DB_ID = '441eb160-4714-48cc-8b25-92b84c3329c4';
  const rows = await queryDatabase(DB_ID);

  const statusMap = {
    'Authentication & User Management': { status: 'Complete', notes: 'JWT, bcryptjs, RBAC middleware implemented' },
    'Citizen Portal': { status: 'Complete', notes: 'React 19 + Vite, report wizard, my reports list, status tracking' },
    'Interactive Map': { status: 'Complete', notes: 'Leaflet.js + OSM, color-coded markers, popups' },
    'Pothole Reporting': { status: 'Complete', notes: 'Camera capture, GPS accuracy, manual pin drag fallback' },
    'Live Statistics / Counters': { status: 'Complete', notes: 'Total = Active + Solved atomic calculation' },
    'Problem Management': { status: 'Complete', notes: 'Strict status state machine, status_history audit logging' },
    'Government Portal': { status: 'Complete', notes: 'Triage table, map view, status transition controls, ward routing' },
    'Repair Verification': { status: 'Complete', notes: 'PostGIS ST_Distance (<= 50m) proximity check + AI verify' },
    'Database': { status: 'Complete', notes: 'PostgreSQL 17 + PostGIS geography point with GIST spatial index' },
    'AI Verification': { status: 'In Progress', notes: 'FastAPI microservice active (:8000), YOLO training in Phase 4' },
    'Security': { status: 'In Progress', notes: 'Parameterized SQL, CORS, JWT RBAC, sanitization active' },
    'Notifications': { status: 'In Progress', notes: 'DB notifications table created, triggered on status changes' },
    'Administration': { status: 'In Progress', notes: 'Admin role & audit_logs schema active, UI screens in Phase 3' },
  };

  for (const row of rows) {
    const title = getTitle(row);
    const target = statusMap[title];
    if (target) {
      console.log(`  Updating Module "${title}" -> ${target.status}`);
      await updatePage(row.id, {
        'Status': { select: { name: target.status } },
        'Notes': { rich_text: [{ text: { content: target.notes } }] }
      });
    }
  }
}

// -------------------------------------------------------------
// 2. Update Project Roadmap
// -------------------------------------------------------------
async function updateRoadmap() {
  console.log('\nUpdating 🗓️ Project Roadmap...');
  const DB_ID = 'b92b9ba4-2094-4cdc-ae45-6c0f86dc6926';
  const rows = await queryDatabase(DB_ID);

  const roadmapUpdates = {
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
    'Create wireframes for all screens': { status: 'In progress', progress: 85 },
    'Review and finalize UI/UX designs': { status: 'In progress', progress: 85 },
    'Set up backend project structure': { status: 'Done', progress: 100 },
    'Implement authentication module': { status: 'Done', progress: 100 },
    'Implement report submission API': { status: 'Done', progress: 100 },
    'Implement problem management API': { status: 'Done', progress: 100 },
    'Set up frontend project structure': { status: 'Done', progress: 100 },
    'Build Citizen Portal UI': { status: 'Done', progress: 100 },
    'Build Government Portal UI': { status: 'Done', progress: 100 },
    'Integrate map provider': { status: 'Done', progress: 100 },
    'Implement report markers and clustering': { status: 'In progress', progress: 80 },
    'Implement AI verification service': { status: 'In progress', progress: 75 },
    'Build Government Portal features': { status: 'Done', progress: 100 },
    'Implement completion image upload and verification': { status: 'Done', progress: 100 },
  };

  for (const row of rows) {
    const task = getTitle(row);
    const target = roadmapUpdates[task];
    if (target) {
      console.log(`  Updating Task "${task}" -> ${target.status} (${target.progress}%)`);
      await updatePage(row.id, {
        'Status': { name: target.status },
        'Progress': target.progress
      });
    }
  }
}

// -------------------------------------------------------------
// 3. Update API Design
// -------------------------------------------------------------
async function updateApiDesign() {
  console.log('\nUpdating 🔌 API Design...');
  const DB_ID = 'e7a3b4b7-270d-406b-980c-eb155ad37f6c';
  const rows = await queryDatabase(DB_ID);

  const apiUpdates = {
    'API-001': { status: 'Implemented', notes: 'POST /api/auth/register' },
    'API-002': { status: 'Implemented', notes: 'POST /api/auth/login' },
    'API-003': { status: 'Designed', notes: 'Client token discard / blacklist' },
    'API-004': { status: 'Implemented', notes: 'POST /api/reports (multipart)' },
    'API-005': { status: 'Implemented', notes: 'GET /api/reports/map' },
    'API-006': { status: 'Implemented', notes: 'GET /api/reports/:id' },
    'API-007': { status: 'Implemented', notes: 'PATCH /api/gov/reports/:id/status' },
    'API-008': { status: 'Implemented', notes: 'POST /api/gov/reports/:id/completion' },
    'API-009': { status: 'Implemented', notes: 'GET /api/stats/counters' },
    'API-010': { status: 'Implemented', notes: 'GET /api/auth/me' },
    'API-011': { status: 'Implemented', notes: 'GET /api/reports/mine' },
    'API-012': { status: 'Designed', notes: 'Admin user management' },
  };

  for (const row of rows) {
    const id = getTitle(row);
    const target = apiUpdates[id];
    if (target) {
      console.log(`  Updating API "${id}" -> ${target.status}`);
      await updatePage(row.id, {
        'Status': { select: { name: target.status } },
        'Notes': { rich_text: [{ text: { content: target.notes } }] }
      });
    }
  }
}

// -------------------------------------------------------------
// 4. Update Testing
// -------------------------------------------------------------
async function updateTesting() {
  console.log('\nUpdating 🧪 Testing...');
  const DB_ID = '9948a527-aa6b-4e5b-acfb-cb3143dd7f2f';
  const rows = await queryDatabase(DB_ID);

  const testUpdates = {
    'TC-001': { status: 'Pass', actual: 'Registration successful, redirects to login' },
    'TC-002': { status: 'Pass', actual: 'JWT token issued, citizen dashboard loaded' },
    'TC-003': { status: 'Pass', actual: 'Invalid credentials rejected with 401' },
    'TC-004': { status: 'Pass', actual: 'Report created as pending_verification, AI triggered' },
    'TC-005': { status: 'Pass', actual: 'Form blocks submission without image' },
    'TC-006': { status: 'Pass', actual: 'AI stub confirms pothole, status becomes active' },
    'TC-007': { status: 'Pass', actual: 'AI stub rejects non-pothole, status rejected' },
    'TC-008': { status: 'Pass', actual: 'Map renders all verified reports with markers' },
    'TC-009': { status: 'Pass', actual: 'Status transitions recorded in status_history' },
    'TC-010': { status: 'Pass', actual: 'Completion image verified, marked solved' },
    'TC-011': { status: 'Pass', actual: 'Active -1, Solved +1, Total unchanged invariant holds' },
    'TC-012': { status: 'Pass', actual: 'HTTP 201 with report ID and flags' },
    'TC-013': { status: 'Pass', actual: 'Citizen token receives HTTP 403 on /gov endpoints' },
    'TC-014': { status: 'Pass', actual: 'Manual pin fallback places pin at city center' },
    'TC-015': { status: 'Pass', actual: 'End-to-end full loop verified on localhost' },
  };

  for (const row of rows) {
    const id = getTitle(row);
    const target = testUpdates[id];
    if (target) {
      console.log(`  Updating Test "${id}" -> ${target.status}`);
      await updatePage(row.id, {
        'Status': { select: { name: target.status } },
        'Actual Result': { rich_text: [{ text: { content: target.actual } }] }
      });
    }
  }
}

async function main() {
  console.log('Starting full synchronization to Notion workspace...');
  await updateSystemModules();
  await updateRoadmap();
  await updateApiDesign();
  await updateTesting();
  console.log('\nAll Notion databases successfully synchronized with the current project status!');
}

main().catch(err => {
  console.error('Fatal error during Notion sync:', err);
  process.exit(1);
});
