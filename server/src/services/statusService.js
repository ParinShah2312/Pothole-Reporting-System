import { conflict, notFound } from '../utils/httpError.js';

/** Report lifecycle (README §4 / IMPLEMENTATION_PLAN Appendix B). */
export const STATUSES = [
  'pending_verification', 'under_review', 'rejected', 'active',
  'assigned', 'in_progress', 'repair_completed', 'solved',
];

const TRANSITIONS = {
  pending_verification: ['active', 'rejected', 'under_review'],
  under_review: ['active', 'rejected'],
  rejected: ['active'],
  active: ['assigned'],
  assigned: ['in_progress'],
  in_progress: ['repair_completed'],
  repair_completed: ['solved'],
  solved: [],
};

const CITIZEN_MESSAGES = {
  active: 'Your report was verified and is now active.',
  rejected: 'Your report could not be verified as a pothole.',
  under_review: 'Your report is being reviewed manually.',
  assigned: 'Your report was assigned to a repair team.',
  in_progress: 'Repair work has started on your report.',
  repair_completed: 'Repair work on your report is complete and awaiting verification.',
  solved: 'The pothole you reported has been repaired and verified. Thank you!',
};

export const canTransition = (from, to) => TRANSITIONS[from]?.includes(to) ?? false;

/**
 * The only place report status changes. Must run inside a transaction (`db` is the client).
 * Locks the report row, validates the transition, and records history + a citizen notification.
 * `userId` null means the change was made by the system (AI).
 */
export async function changeStatus(db, { reportId, to, userId = null, note = null }) {
  const { rows } = await db.query('SELECT report_id AS id, status, citizen_id FROM reports WHERE report_id = $1 FOR UPDATE', [reportId]);
  const report = rows[0];
  if (!report) throw notFound('Report not found');
  if (!canTransition(report.status, to)) {
    throw conflict(`Cannot change status from "${report.status}" to "${to}"`);
  }

  await db.query(
    `UPDATE reports
     SET status = $2::text, updated_at = now(),
         verified_at = CASE WHEN $2::text = 'active' THEN COALESCE(verified_at, now()) ELSE verified_at END,
         solved_at   = CASE WHEN $2::text = 'solved' THEN now() ELSE solved_at END
     WHERE report_id = $1`,
    [reportId, to],
  );
  await db.query(
    `INSERT INTO status_history (report_id, old_status, new_status, changed_by, note)
     VALUES ($1, $2, $3, $4, $5)`,
    [reportId, report.status, to, userId, note],
  );
  if (CITIZEN_MESSAGES[to]) {
    await db.query(
      'INSERT INTO notifications (user_id, report_id, message) VALUES ($1, $2, $3)',
      [report.citizen_id, reportId, `Report #${reportId}: ${CITIZEN_MESSAGES[to]}`],
    );
  }
  return { from: report.status, to };
}
