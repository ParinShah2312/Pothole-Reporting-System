import { pool, query } from '../config/db.js';

/** Writes an audit log row. `db` may be a transaction client; defaults to the pool. */
export async function logAction(
  { userId = null, action, entityType = null, entityId = null, ip = null, details = {} },
  db = pool,
) {
  await db.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, details)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, action, entityType, entityId, ip, details],
  );
}

export async function listAuditLogs({ action, q, limit = 150 } = {}) {
  const params = [];
  const clauses = [];
  if (action) {
    params.push(action);
    clauses.push(`a.action = $${params.length}`);
  }
  if (q) {
    params.push(`%${q.trim()}%`);
    clauses.push(`(a.action ILIKE $${params.length} OR COALESCE(u.name, '') ILIKE $${params.length} OR COALESCE(u.email, '') ILIKE $${params.length} OR COALESCE(a.details::text, '') ILIKE $${params.length})`);
  }
  params.push(Math.min(Math.max(1, Number(limit) || 150), 500));
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT a.audit_id AS id, a.user_id, u.name AS actor_name, u.email AS actor_email, u.role AS actor_role,
            a.action, a.entity_type, a.entity_id, a.ip_address, a.details, a.created_at
     FROM audit_logs a
     LEFT JOIN users u ON u.user_id = a.user_id
     ${where}
     ORDER BY a.created_at DESC, a.audit_id DESC
     LIMIT $${params.length}`,
    params,
  );
  return rows;
}
