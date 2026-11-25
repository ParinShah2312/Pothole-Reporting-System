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
