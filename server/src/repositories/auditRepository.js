import { pool } from '../config/db.js';

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
