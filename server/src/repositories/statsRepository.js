import { query } from '../config/db.js';

/**
 * Live counters (README §5). Only AI-verified / admin-approved reports count:
 * Total = verified reports, Solved = status 'solved', Active = Total - Solved.
 */
export async function getCounters() {
  const { rows } = await query(`
    SELECT count(*) FILTER (WHERE verified_at IS NOT NULL)::int                        AS total,
           count(*) FILTER (WHERE verified_at IS NOT NULL AND status <> 'solved')::int AS active,
           count(*) FILTER (WHERE status = 'solved')::int                              AS solved
    FROM reports`);
  return rows[0];
}

export async function getTrends({ from, to } = {}) {
  const endDate = to || new Date().toISOString().slice(0, 10);
  const startDate = from || new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);

  const [summaryRes, dailyRes, statusRes, deptRes] = await Promise.all([
    query(
      `SELECT count(*)::int AS submitted,
              count(*) FILTER (WHERE verified_at IS NOT NULL)::int AS verified_total,
              count(*) FILTER (WHERE verified_at IS NOT NULL AND status <> 'solved')::int AS active,
              count(*) FILTER (WHERE status = 'solved')::int AS solved,
              count(*) FILTER (WHERE status = 'under_review')::int AS under_review,
              count(*) FILTER (WHERE status = 'rejected')::int AS rejected,
              round(avg(EXTRACT(EPOCH FROM (solved_at - created_at)) / 3600.0)
                    FILTER (WHERE status = 'solved' AND solved_at IS NOT NULL)::numeric, 1)::float8 AS avg_resolution_hours
       FROM reports
       WHERE created_at >= $1::date AND created_at < ($2::date + interval '1 day')`,
      [startDate, endDate],
    ),
    query(
      `SELECT to_char(d::date, 'YYYY-MM-DD') AS date,
              count(r.report_id) FILTER (WHERE r.created_at::date = d::date)::int AS reported,
              count(r.report_id) FILTER (WHERE r.solved_at::date = d::date)::int AS solved
       FROM generate_series($1::date, $2::date, '1 day'::interval) AS d
       LEFT JOIN reports r
         ON (r.created_at::date = d::date OR r.solved_at::date = d::date)
       GROUP BY d::date
       ORDER BY d::date`,
      [startDate, endDate],
    ),
    query(
      `SELECT status, count(*)::int AS count
       FROM reports
       WHERE created_at >= $1::date AND created_at < ($2::date + interval '1 day')
       GROUP BY status
       ORDER BY count DESC`,
      [startDate, endDate],
    ),
    query(
      `SELECT d.dept_id AS id, d.name, d.zone,
              count(r.report_id)::int AS total,
              count(r.report_id) FILTER (WHERE r.status = 'solved')::int AS solved,
              count(r.report_id) FILTER (WHERE r.status IN ('assigned', 'in_progress', 'repair_completed'))::int AS active
       FROM departments d
       LEFT JOIN reports r
         ON r.department_id = d.dept_id
        AND r.created_at >= $1::date AND r.created_at < ($2::date + interval '1 day')
       GROUP BY d.dept_id, d.name, d.zone
       ORDER BY d.dept_id`,
      [startDate, endDate],
    ),
  ]);

  return {
    range: { from: startDate, to: endDate },
    summary: summaryRes.rows[0],
    daily: dailyRes.rows,
    byStatus: statusRes.rows,
    byDepartment: deptRes.rows,
  };
}
