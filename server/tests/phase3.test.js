import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';

let server;
let base;
const cleanupUsers = [];
const cleanupReports = [];
const cleanupFiles = [];
let originalSettings = null;

function makeTinyJpeg() {
  return Buffer.from(
    'ffd8ffe000104a46494600010100000100010000ffdb004300030202020202030202020303030304060404040404080606050609080a0a090809090a0c0f0c0a0b0e0b09090d110d0e0f101011100a0c12131210130f101010ffc0000b080001000101011100ffc40014000100000000000000000000000000000009ffc40014100100000000000000000000000000000000ffda0008010100003f00d2cf20ffd9',
    'hex',
  );
}

async function api(route, { method = 'GET', body, form, token } = {}) {
  const res = await fetch(`${base}${route}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    ...(form ? { body: form } : {}),
  });
  return { status: res.status, data: await res.json() };
}

before(async () => {
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  if (originalSettings) {
    for (const [k, v] of Object.entries(originalSettings)) {
      await pool.query('UPDATE app_settings SET value = $2::jsonb WHERE key = $1', [k, JSON.stringify(v)]);
    }
  }
  for (const rid of cleanupReports) {
    await pool.query("DELETE FROM audit_logs WHERE entity_type = 'report' AND entity_id = $1", [rid]);
    await pool.query('DELETE FROM reports WHERE report_id = $1', [rid]);
  }
  for (const uid of cleanupUsers) {
    await pool.query("DELETE FROM audit_logs WHERE user_id = $1 OR (entity_type = 'user' AND entity_id = $1)", [uid]);
    await pool.query('DELETE FROM users WHERE user_id = $1', [uid]);
  }
  await pool.query("DELETE FROM audit_logs WHERE action LIKE 'admin.settings_update%'");
  for (const fp of cleanupFiles) {
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  server.close();
  await pool.end();
});

test('Public trends and settings endpoints return structured Phase 3 analytics', async () => {
  const trends = await api('/stats/trends');
  assert.equal(trends.status, 200);
  assert.ok(Array.isArray(trends.data.daily));
  assert.ok(Array.isArray(trends.data.byDepartment));
  assert.ok(typeof trends.data.summary.submitted === 'number');

  const pubCfg = await api('/settings/public');
  assert.equal(pubCfg.status, 200);
  assert.ok(Number.isFinite(pubCfg.data.repair_radius_m));
});

test('Government filters & admin RBAC enforcement behave strictly', async () => {
  const govLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: 'gov@demo.local', password: 'Gov@12345', portal: 'government' },
  });
  assert.equal(govLogin.status, 200);
  const govToken = govLogin.data.token;

  const filtered = await api('/gov/reports?q=Manjalpur');
  assert.equal(filtered.status, 401);

  const govFiltered = await api('/gov/reports?q=Manjalpur', { token: govToken });
  assert.equal(govFiltered.status, 200);
  assert.ok(govFiltered.data.reports.length >= 1);

  // Non-admin staff must be rejected from admin portal endpoints
  const deniedQueue = await api('/admin/review-queue', { token: govToken });
  assert.equal(deniedQueue.status, 403);
  const deniedUsers = await api('/admin/users', { token: govToken });
  assert.equal(deniedUsers.status, 403);
});

test('Admin user creation/suspension, report override, audit logs & dynamic settings persist cleanly', async () => {
  const adminLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: 'admin@demo.local', password: 'Admin@1234', portal: 'government' },
  });
  assert.equal(adminLogin.status, 200);
  const adminToken = adminLogin.data.token;

  // Create government officer & suspend them
  const officerEmail = `officer_${Date.now()}@test.local`;
  const created = await api('/admin/users', {
    method: 'POST',
    token: adminToken,
    body: { name: 'Zone Inspector', email: officerEmail, password: 'Password1', role: 'government', departmentId: 1 },
  });
  assert.equal(created.status, 201);
  cleanupUsers.push(created.data.user.id);

  const officerLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: officerEmail, password: 'Password1', portal: 'government' },
  });
  assert.equal(officerLogin.status, 200);

  const suspended = await api(`/admin/users/${created.data.user.id}`, {
    method: 'PATCH',
    token: adminToken,
    body: { isActive: false },
  });
  assert.equal(suspended.status, 200);
  assert.equal(suspended.data.user.is_active, false);

  const blockedLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: officerEmail, password: 'Password1', portal: 'government' },
  });
  assert.equal(blockedLogin.status, 403);

  // Citizen submits manual-pin report -> appears flagged in review queue -> Admin overrides + clears flags
  const citLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: 'citizen@demo.local', password: 'Citizen@123', portal: 'citizen' },
  });
  assert.equal(citLogin.status, 200);

  const form = new FormData();
  form.append('lat', '22.3095');
  form.append('lng', '73.1812');
  form.append('images', new Blob([makeTinyJpeg()], { type: 'image/jpeg' }), 'p3_manual.jpg');
  const repRes = await api('/reports', { method: 'POST', form, token: citLogin.data.token });
  assert.equal(repRes.status, 201);
  const rid = repRes.data.report.id;
  cleanupReports.push(rid);
  if (repRes.data.report.image_url) {
    cleanupFiles.push(repRes.data.report.image_url.replace(/^\/+/, ''));
  }

  const queue = await api('/admin/review-queue?scope=attention', { token: adminToken });
  assert.equal(queue.status, 200);
  assert.ok(queue.data.reports.some((r) => r.id === rid));

  const overridden = await api(`/admin/reports/${rid}/override`, {
    method: 'PATCH',
    token: adminToken,
    body: { status: 'active', clearFlags: true, note: 'Verified road site manually in Phase 3 test' },
  });
  assert.equal(overridden.status, 200);
  assert.equal(overridden.data.report.status, 'active');
  assert.deepEqual(overridden.data.report.location_flags, []);

  // Audit logs record override and user creation
  const logs = await api('/admin/audit-logs?action=admin.report_override', { token: adminToken });
  assert.equal(logs.status, 200);
  assert.ok(logs.data.logs.some((l) => l.entity_id === rid));

  // Settings update & counter invariant check
  const curCfg = await api('/admin/settings', { token: adminToken });
  assert.equal(curCfg.status, 200);
  originalSettings = { ...curCfg.data.settings };

  const updCfg = await api('/admin/settings', {
    method: 'PATCH',
    token: adminToken,
    body: { repair_radius_m: 65 },
  });
  assert.equal(updCfg.status, 200);
  assert.equal(updCfg.data.settings.repair_radius_m, 65);

  const cnt = await api('/stats/counters');
  assert.equal(cnt.data.total, cnt.data.active + cnt.data.solved);
});
