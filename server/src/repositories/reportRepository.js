import { query } from '../config/db.js';

const point = (lngParam, latParam) =>
  `ST_SetSRID(ST_MakePoint(${lngParam}::float8, ${latParam}::float8), 4326)::geography`;

// Common report columns for list/detail views
const REPORT_SELECT = `
  SELECT r.report_id AS id, r.status, r.description, r.address,
         ST_Y(r.location::geometry) AS lat, ST_X(r.location::geometry) AS lng,
         r.location_source, r.gps_accuracy_m, r.pin_moved_m, r.location_flags,
         r.department_id, d.name AS department_name,
         r.citizen_id, u.name AS citizen_name,
         r.verified_at, r.solved_at, r.created_at, r.updated_at,
         (SELECT file_path FROM report_images ri WHERE ri.report_id = r.report_id ORDER BY ri.image_id LIMIT 1) AS image_url
  FROM reports r
  JOIN users u ON u.user_id = r.citizen_id
  LEFT JOIN departments d ON d.dept_id = r.department_id`;

export async function insertReport(db, r) {
  const { rows } = await db.query(
    `INSERT INTO reports (citizen_id, description, location, location_source,
                          gps_lat, gps_lng, gps_accuracy_m, pin_moved_m)
     VALUES ($1, $2, ${point('$4', '$3')}, $5, $6, $7, $8,
             CASE WHEN $6::float8 IS NULL OR $7::float8 IS NULL THEN NULL
                  ELSE ST_Distance(${point('$4', '$3')}, ${point('$7', '$6')}) END)
     RETURNING report_id AS id, pin_moved_m`,
    [r.citizenId, r.description, r.lat, r.lng, r.locationSource, r.gpsLat, r.gpsLng, r.gpsAccuracyM],
  );
  return rows[0];
}

/** Counts open (verified, not solved) reports within radiusM of the given report. */
export async function countNearbyOpen(db, reportId, radiusM) {
  const { rows } = await db.query(
    `SELECT count(*)::int AS n FROM reports o, reports r
     WHERE r.report_id = $1 AND o.report_id <> r.report_id
       AND o.verified_at IS NOT NULL AND o.status <> 'solved'
       AND ST_DWithin(o.location, r.location, $2)`,
    [reportId, radiusM],
  );
  return rows[0].n;
}

export async function setLocationFlags(db, reportId, flags) {
  await db.query('UPDATE reports SET location_flags = $2 WHERE report_id = $1', [reportId, flags]);
}

export async function insertReportImage(db, reportId, url) {
  const { rows } = await db.query(
    'INSERT INTO report_images (report_id, file_path) VALUES ($1, $2) RETURNING image_id AS id',
    [reportId, url],
  );
  return rows[0].id;
}

export async function listForMap() {
  const { rows } = await query(
    `${REPORT_SELECT} WHERE r.verified_at IS NOT NULL ORDER BY r.created_at DESC`,
  );
  // Public view: hide who reported it and how the location was captured
  return rows.map(({ citizen_id, citizen_name, gps_accuracy_m, pin_moved_m, location_flags, location_source, ...rest }) => rest);
}

export async function listByCitizen(citizenId) {
  const { rows } = await query(`${REPORT_SELECT} WHERE r.citizen_id = $1 ORDER BY r.created_at DESC`, [citizenId]);
  return rows;
}

export async function listForGovernment({ status } = {}) {
  const params = [];
  let where = 'WHERE r.verified_at IS NOT NULL';
  if (status) {
    params.push(status);
    where += ` AND r.status = $${params.length}`;
  }
  const { rows } = await query(`${REPORT_SELECT} ${where} ORDER BY r.created_at DESC`, params);
  return rows;
}

export async function findById(id) {
  const { rows } = await query(`${REPORT_SELECT} WHERE r.report_id = $1`, [id]);
  return rows[0] || null;
}

export async function getRelated(reportId) {
  const [images, history, ai, repair, completions] = await Promise.all([
    query('SELECT image_id AS id, file_path AS url, uploaded_at FROM report_images WHERE report_id = $1 ORDER BY image_id', [reportId]),
    query(
      `SELECT h.history_id AS id, h.old_status, h.new_status, h.note, h.changed_at,
              u.name AS changed_by_name, u.role AS changed_by_role
       FROM status_history h LEFT JOIN users u ON u.user_id = h.changed_by
       WHERE h.report_id = $1 ORDER BY h.changed_at, h.history_id`,
      [reportId],
    ),
    query(
      `SELECT ai_id AS id, type, result, confidence, model_version, details, verified_at
       FROM ai_verifications WHERE report_id = $1 ORDER BY verified_at, ai_id`,
      [reportId],
    ),
    query(
      `SELECT rp.repair_id AS id, rp.dept_id AS department_id, d.name AS department_name, rp.notes,
              rp.assigned_at, rp.started_at, rp.completed_at, u.name AS assigned_by_name
       FROM repairs rp
       LEFT JOIN departments d ON d.dept_id = rp.dept_id
       LEFT JOIN users u ON u.user_id = rp.assigned_by
       WHERE rp.report_id = $1`,
      [reportId],
    ),
    query(
      `SELECT ci.comp_img_id AS id, ci.file_path AS url, ci.distance_m, ci.uploaded_at,
              ST_Y(ci.location::geometry) AS lat, ST_X(ci.location::geometry) AS lng
       FROM completion_images ci JOIN repairs rp ON rp.repair_id = ci.repair_id
       WHERE rp.report_id = $1 ORDER BY ci.comp_img_id`,
      [reportId],
    ),
  ]);
  return {
    images: images.rows,
    history: history.rows,
    aiVerifications: ai.rows,
    repair: repair.rows[0] || null,
    completionImages: completions.rows,
  };
}

export async function insertAiVerification(db, v) {
  const { rows } = await db.query(
    `INSERT INTO ai_verifications (report_id, type, report_image_id, completion_image_id,
                                   result, confidence, model_version, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING ai_id AS id`,
    [v.reportId, v.type, v.reportImageId ?? null, v.completionImageId ?? null,
      v.result, v.confidence ?? null, v.modelVersion ?? null, v.details ?? {}],
  );
  return rows[0].id;
}

export async function upsertRepairAssignment(db, { reportId, departmentId, assignedBy, notes }) {
  await db.query(
    `INSERT INTO repairs (report_id, dept_id, assigned_by, notes)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (report_id) DO UPDATE
       SET dept_id = EXCLUDED.dept_id, assigned_by = EXCLUDED.assigned_by,
           notes = COALESCE(EXCLUDED.notes, repairs.notes), assigned_at = now()`,
    [reportId, departmentId, assignedBy, notes || null],
  );
  await db.query('UPDATE reports SET department_id = $2 WHERE report_id = $1', [reportId, departmentId]);
}

export async function markRepairStarted(db, reportId) {
  await db.query('UPDATE repairs SET started_at = now() WHERE report_id = $1', [reportId]);
}

export async function markRepairCompleted(db, reportId, notes) {
  await db.query(
    'UPDATE repairs SET completed_at = now(), notes = COALESCE($2, notes) WHERE report_id = $1',
    [reportId, notes || null],
  );
}

export async function findRepairByReport(reportId) {
  const { rows } = await query(
    'SELECT repair_id AS id, report_id, dept_id AS department_id, assigned_by, notes, assigned_at, started_at, completed_at FROM repairs WHERE report_id = $1',
    [reportId],
  );
  return rows[0] || null;
}

/** Inserts a completion image and computes its distance from the report location. */
export async function insertCompletionImage(db, { repairId, reportId, url, lat, lng, uploadedBy }) {
  const hasLocation = lat !== null && lng !== null;
  const { rows } = await db.query(
    `INSERT INTO completion_images (repair_id, file_path, location, distance_m, uploaded_by)
     SELECT $1, $2,
            CASE WHEN $5 THEN ${point('$4', '$3')} END,
            CASE WHEN $5 THEN ST_Distance(${point('$4', '$3')}, r.location) END,
            $7
     FROM reports r WHERE r.report_id = $6
     RETURNING comp_img_id AS id, distance_m`,
    [repairId, url, lat, lng, hasLocation, reportId, uploadedBy],
  );
  return rows[0];
}

export async function listDepartments() {
  const { rows } = await query('SELECT dept_id AS id, name, zone FROM departments ORDER BY name');
  return rows;
}

export async function departmentExists(id) {
  const { rows } = await query('SELECT 1 FROM departments WHERE dept_id = $1', [id]);
  return rows.length > 0;
}
