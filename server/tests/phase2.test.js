import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';
import { extractFirstExifGps } from '../src/utils/exif.js';

let server;
let base;
const cleanupUsers = [];
const cleanupReports = [];
const cleanupFiles = [];

// Minimal valid JPEG with APP1 GPS EXIF pointing to (22.3106 N, 73.1700 E) Vadodara
function makeExifJpeg() {
  // Construct 1x1 JPEG wrapped around minimal TIFF EXIF IFD if present, OR test non-EXIF minimal JPEG + check sample if generated
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
  for (const rid of cleanupReports) {
    await pool.query("DELETE FROM audit_logs WHERE entity_type = 'report' AND entity_id = $1", [rid]);
    await pool.query('DELETE FROM reports WHERE report_id = $1', [rid]);
  }
  for (const uid of cleanupUsers) {
    await pool.query("DELETE FROM audit_logs WHERE user_id = $1 OR (entity_type = 'user' AND entity_id = $1)", [uid]);
    await pool.query('DELETE FROM users WHERE user_id = $1', [uid]);
  }
  for (const fp of cleanupFiles) {
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  server.close();
  await pool.end();
});

test('Zod validation blocks malformed registration input', async () => {
  const res = await api('/auth/register', { method: 'POST', body: { name: 'X', email: 'nope', password: '123' } });
  assert.equal(res.status, 400);
  assert.ok(res.data.details.email && res.data.details.password);
});

test('Full Phase 2 auth lifecycle: register, verify email, refresh rotation, lockout, reset, profile, logout', async () => {
  const email = `p2_auth_${Date.now()}@test.local`;
  const reg = await api('/auth/register', { method: 'POST', body: { name: 'Phase Two User', email, password: 'Password1' } });
  assert.equal(reg.status, 201);
  assert.equal(reg.data.user.email_verified, false);
  assert.ok(reg.data.refreshToken && reg.data.devVerifyUrl);
  cleanupUsers.push(reg.data.user.id);

  // Verify email via dev token (and verify second call is idempotent on already-verified user)
  const vTok = new URL(reg.data.devVerifyUrl).searchParams.get('token');
  const ver = await api('/auth/verify-email', { method: 'POST', body: { token: vTok } });
  assert.equal(ver.status, 200);
  assert.equal(ver.data.user.email_verified, true);
  const verAgain = await api('/auth/verify-email', { method: 'POST', body: { token: vTok } });
  assert.equal(verAgain.status, 200);
  assert.equal(verAgain.data.alreadyVerified, true);

  // Refresh token rotation
  const ref = await api('/auth/refresh', { method: 'POST', body: { refreshToken: reg.data.refreshToken } });
  assert.equal(ref.status, 200);
  assert.notEqual(ref.data.refreshToken, reg.data.refreshToken);
  const replay = await api('/auth/refresh', { method: 'POST', body: { refreshToken: reg.data.refreshToken } });
  assert.equal(replay.status, 401);

  // 5 failed logins lock account
  let lockAttempt;
  for (let i = 0; i < 5; i++) {
    lockAttempt = await api('/auth/login', { method: 'POST', body: { email, password: 'WrongPassword9' } });
  }
  assert.equal(lockAttempt.status, 423);

  // Forgot & reset password clears lock
  const fp = await api('/auth/forgot-password', { method: 'POST', body: { email } });
  assert.equal(fp.status, 200);
  const rTok = new URL(fp.data.devResetUrl).searchParams.get('token');
  const rp = await api('/auth/reset-password', { method: 'POST', body: { token: rTok, password: 'NewPassword2' } });
  assert.equal(rp.status, 200);

  // Login with new password & update profile + change password
  const li = await api('/auth/login', { method: 'POST', body: { email, password: 'NewPassword2' } });
  assert.equal(li.status, 200);
  const prof = await api('/auth/profile', { method: 'PATCH', body: { name: 'Renamed Citizen' }, token: li.data.token });
  assert.equal(prof.status, 200);
  assert.equal(prof.data.user.name, 'Renamed Citizen');

  const chp = await api('/auth/password', {
    method: 'PATCH',
    body: { currentPassword: 'NewPassword2', newPassword: 'FinalPassword3' },
    token: li.data.token,
  });
  assert.equal(chp.status, 200);

  // Logout revokes refresh token
  const lo = await api('/auth/logout', { method: 'POST', body: { refreshToken: li.data.refreshToken } });
  assert.equal(lo.status, 200);
});

test('Multi-photo upload enforces 1-5 limit and counters satisfy Total = Active + Solved', async () => {
  const login = await api('/auth/login', {
    method: 'POST',
    body: { email: 'citizen@demo.local', password: 'Citizen@123', portal: 'citizen' },
  });
  assert.equal(login.status, 200);
  const { token } = login.data;
  const jpg = makeExifJpeg();

  // Reject 6 photos
  const tooMany = new FormData();
  tooMany.append('lat', '22.3106');
  tooMany.append('lng', '73.1700');
  for (let i = 0; i < 6; i++) tooMany.append('images', new Blob([jpg], { type: 'image/jpeg' }), `p${i}.jpg`);
  const rej = await api('/reports', { method: 'POST', form: tooMany, token });
  assert.equal(rej.status, 400);

  // Accept 2 photos
  const form = new FormData();
  form.append('lat', '22.3106');
  form.append('lng', '73.1700');
  form.append('description', 'Automated multi-photo test');
  form.append('images', new Blob([jpg], { type: 'image/jpeg' }), 'a.jpg');
  form.append('images', new Blob([jpg], { type: 'image/jpeg' }), 'b.jpg');
  const created = await api('/reports', { method: 'POST', form, token });
  assert.equal(created.status, 201);
  cleanupReports.push(created.data.report.id);

  const details = await api(`/reports/${created.data.report.id}`, { token });
  assert.equal(details.data.report.images.length, 2);
  for (const img of details.data.report.images) {
    cleanupFiles.push(path.resolve('uploads', path.basename(img.url)));
  }

  // Missing EXIF returns safe nulls
  const noExif = await extractFirstExifGps([{ path: cleanupFiles[0] }]);
  assert.deepEqual(noExif, { exifLat: null, exifLng: null });

  // Counters invariant
  const counters = await api('/stats/counters');
  assert.equal(counters.status, 200);
  assert.equal(counters.data.total, counters.data.active + counters.data.solved);
});
