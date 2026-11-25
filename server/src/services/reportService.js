import { env } from '../config/env.js';
import { withTransaction } from '../config/db.js';
import * as reports from '../repositories/reportRepository.js';
import { logAction } from '../repositories/auditRepository.js';
import { publicUrlFor } from '../middleware/upload.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/httpError.js';
import { parseLat, parseLng } from '../utils/geo.js';
import { changeStatus } from './statusService.js';
import * as ai from './aiClient.js';

const pct = (c) => `${Math.round(Number(c) * 100)}%`;

/** Maps a pothole confidence to accepted / uncertain / rejected using the configured thresholds. */
function classify(confidence) {
  if (confidence >= env.aiAcceptThreshold) return 'accepted';
  if (confidence < env.aiRejectThreshold) return 'rejected';
  return 'uncertain';
}

// ---------------------------------------------------------------------------
// Citizen: create report (Workflow B) + background AI verification (Workflow C)
// ---------------------------------------------------------------------------

function parseReportInput(body, file) {
  if (!file) throw badRequest('A photo of the pothole is required');

  const lat = parseLat(body.lat);
  const lng = parseLng(body.lng);
  if (lat === null || lng === null || Number.isNaN(lat) || Number.isNaN(lng)) {
    throw badRequest('A valid map location is required');
  }

  let gpsLat = parseLat(body.gps_lat);
  let gpsLng = parseLng(body.gps_lng);
  let gpsAccuracyM = body.gps_accuracy ? Number(body.gps_accuracy) : null;
  if (Number.isNaN(gpsLat) || Number.isNaN(gpsLng) || gpsLat === null || gpsLng === null) {
    gpsLat = gpsLng = gpsAccuracyM = null;
  }
  if (!Number.isFinite(gpsAccuracyM)) gpsAccuracyM = null;

  const description = String(body.description || '').trim().slice(0, 1000) || null;
  const locationSource = gpsLat !== null ? 'gps' : 'manual';
  return { lat, lng, gpsLat, gpsLng, gpsAccuracyM, description, locationSource };
}

export async function createReport({ citizenId, body, file, ip }) {
  const input = parseReportInput(body, file);
  const imageUrl = publicUrlFor(file);

  const created = await withTransaction(async (db) => {
    const report = await reports.insertReport(db, { citizenId, ...input });

    // Basic location flags (full rule-based verification comes in Phase 4)
    const flags = [];
    if (input.locationSource === 'manual') flags.push('manual_location');
    if (report.pin_moved_m > env.pinMoveFlagM) flags.push('pin_moved_far');
    if (input.gpsAccuracyM > env.lowGpsAccuracyM) flags.push('low_gps_accuracy');
    if ((await reports.countNearbyOpen(db, report.id, env.duplicateRadiusM)) > 0) flags.push('possible_duplicate');
    if (flags.length) await reports.setLocationFlags(db, report.id, flags);

    const imageId = await reports.insertReportImage(db, report.id, imageUrl);
    await db.query(
      `INSERT INTO status_history (report_id, old_status, new_status, changed_by, note)
       VALUES ($1, NULL, 'pending_verification', $2, 'Report submitted')`,
      [report.id, citizenId],
    );
    await logAction({ userId: citizenId, action: 'report.create', entityType: 'report', entityId: report.id, ip }, db);
    return { id: report.id, imageId, flags };
  });

  // Respond immediately; AI runs in the background (README §6).
  setImmediate(() => {
    runInitialVerification(created.id, created.imageId, file.path, file.originalname)
      .catch((err) => console.error(`[ai] initial verification failed for report ${created.id}:`, err.message));
  });

  return reports.findById(created.id);
}

export async function runInitialVerification(reportId, imageId, filePath, originalName) {
  let aiResult;
  try {
    aiResult = await ai.detectPothole(filePath, originalName);
  } catch (err) {
    // Leave the report pending; it can be retried / reviewed later.
    await withTransaction((db) => reports.insertAiVerification(db, {
      reportId, type: 'initial', reportImageId: imageId, result: 'error', details: { error: err.message },
    }));
    throw err;
  }

  const confidence = Number(aiResult.confidence);
  const result = classify(confidence);
  const nextStatus = { accepted: 'active', rejected: 'rejected', uncertain: 'under_review' }[result];

  await withTransaction(async (db) => {
    await reports.insertAiVerification(db, {
      reportId, type: 'initial', reportImageId: imageId, result, confidence,
      modelVersion: aiResult.model_version, details: { detected: aiResult.detected, boxes: aiResult.boxes ?? [] },
    });
    await changeStatus(db, { reportId, to: nextStatus, note: `AI pothole check: ${result} (confidence ${pct(confidence)})` });
  });
}

// ---------------------------------------------------------------------------
// Reading reports
// ---------------------------------------------------------------------------

export async function getReportDetails(reportId, user) {
  const report = await reports.findById(reportId);
  if (!report) throw notFound('Report not found');

  const isOwner = user.role === 'citizen' && report.citizen_id === user.id;
  const isStaff = user.role === 'government' || user.role === 'admin';
  if (!isOwner && !(isStaff && (report.verified_at || user.role === 'admin'))) throw forbidden();

  return { ...report, ...(await reports.getRelated(reportId)) };
}

// ---------------------------------------------------------------------------
// Government: status updates (Workflows D, E) and completion (Workflows F, G, H)
// ---------------------------------------------------------------------------

const GOV_TARGETS = ['assigned', 'in_progress', 'repair_completed'];

export async function updateStatusByGovernment({ reportId, userId, body, ip }) {
  const to = body.status;
  const note = String(body.note || '').trim().slice(0, 500) || null;
  if (!GOV_TARGETS.includes(to)) throw badRequest(`Status must be one of: ${GOV_TARGETS.join(', ')}`);

  let departmentId = null;
  if (to === 'assigned') {
    departmentId = Number(body.departmentId);
    if (!Number.isInteger(departmentId) || !(await reports.departmentExists(departmentId))) {
      throw badRequest('Choose a valid department to assign this report to');
    }
  }

  await withTransaction(async (db) => {
    await changeStatus(db, { reportId, to, userId, note });
    if (to === 'assigned') await reports.upsertRepairAssignment(db, { reportId, departmentId, assignedBy: userId, notes: note });
    if (to === 'in_progress') await reports.markRepairStarted(db, reportId);
    if (to === 'repair_completed') await reports.markRepairCompleted(db, reportId, note);
    await logAction({ userId, action: 'report.status_change', entityType: 'report', entityId: reportId, ip, details: { to } }, db);
  });
  return reports.findById(reportId);
}

export async function submitCompletion({ reportId, userId, body, file, ip }) {
  if (!file) throw badRequest('A completion photo is required');
  const report = await reports.findById(reportId);
  if (!report) throw notFound('Report not found');
  if (report.status !== 'repair_completed') {
    throw conflict('Mark the repair as completed before uploading a completion photo');
  }
  const repair = await reports.findRepairByReport(reportId);
  if (!repair) throw conflict('This report has no repair record');

  let lat = parseLat(body.lat);
  let lng = parseLng(body.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng) || lat === null || lng === null) lat = lng = null;

  const completion = await withTransaction(async (db) => {
    const row = await reports.insertCompletionImage(db, {
      repairId: repair.id, reportId, url: publicUrlFor(file), lat, lng, uploadedBy: userId,
    });
    await logAction({ userId, action: 'report.completion_upload', entityType: 'report', entityId: reportId, ip }, db);
    return row;
  });

  // Repair verification (Workflow G): (a) same location by GPS distance, (b) AI says repaired.
  let aiResult;
  try {
    aiResult = await ai.verifyRepair(file.path, ai.localPathForUrl(report.image_url), file.originalname);
  } catch (err) {
    await withTransaction((db) => reports.insertAiVerification(db, {
      reportId, type: 'completion', completionImageId: completion.id, result: 'error', details: { error: err.message },
    }));
    throw Object.assign(new Error('AI service is unavailable, please try again'), { status: 502 });
  }

  const confidence = Number(aiResult.confidence);
  const distanceM = completion.distance_m;
  const sameLocation = distanceM !== null && distanceM <= env.repairRadiusM;
  const repairedResult = aiResult.repaired ? classify(confidence) : 'rejected';

  const reasons = [];
  if (distanceM === null) reasons.push('No location was provided with the completion photo');
  else if (!sameLocation) reasons.push(`Photo was taken ${Math.round(distanceM)} m from the report (limit ${env.repairRadiusM} m)`);
  if (repairedResult === 'rejected') reasons.push('AI did not confirm the pothole is repaired');
  if (repairedResult === 'uncertain') reasons.push('AI result was uncertain');

  const result = sameLocation && repairedResult === 'accepted' ? 'accepted'
    : repairedResult === 'uncertain' && sameLocation ? 'uncertain' : 'rejected';

  await withTransaction(async (db) => {
    await reports.insertAiVerification(db, {
      reportId, type: 'completion', completionImageId: completion.id, result, confidence,
      modelVersion: aiResult.model_version,
      details: { repaired: aiResult.repaired, distance_m: distanceM, same_location: sameLocation, reasons },
    });
    if (result === 'accepted') {
      await changeStatus(db, { reportId, to: 'solved', note: `Repair verified by AI (confidence ${pct(confidence)}, ${Math.round(distanceM)} m from report)` });
    }
  });

  return {
    result,
    confidence,
    distance_m: distanceM,
    same_location: sameLocation,
    reasons,
    report: await reports.findById(reportId),
  };
}
