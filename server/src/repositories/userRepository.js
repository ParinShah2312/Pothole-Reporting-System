import { query } from '../config/db.js';

const PUBLIC_COLUMNS = 'user_id AS id, name, email, role, department_id, is_active, email_verified, created_at';

export async function findByEmail(email) {
  const { rows } = await query(
    `SELECT user_id AS id, name, email, password_hash, role, department_id, is_active,
            email_verified, failed_login_attempts, locked_until, created_at
     FROM users WHERE email = $1`,
    [email],
  );
  return rows[0] || null;
}

export async function findById(id) {
  const { rows } = await query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE user_id = $1`, [id]);
  return rows[0] || null;
}

export async function createUser({ name, email, passwordHash, role = 'citizen', departmentId = null, emailVerified = false }) {
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash, role, department_id, email_verified)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${PUBLIC_COLUMNS}`,
    [name, email, passwordHash, role, departmentId, emailVerified],
  );
  return rows[0];
}

export async function recordFailedLogin(userId, maxAttempts, lockoutMinutes) {
  const { rows } = await query(
    `UPDATE users
     SET failed_login_attempts = failed_login_attempts + 1,
         locked_until = CASE WHEN failed_login_attempts + 1 >= $2
                             THEN now() + ($3 || ' minutes')::interval
                             ELSE locked_until END
     WHERE user_id = $1
     RETURNING failed_login_attempts, locked_until`,
    [userId, maxAttempts, String(lockoutMinutes)],
  );
  return rows[0];
}

export async function resetLoginFailures(userId) {
  await query('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE user_id = $1', [userId]);
}

export async function updateProfile(userId, { name }) {
  const { rows } = await query(
    `UPDATE users SET name = $2 WHERE user_id = $1 RETURNING ${PUBLIC_COLUMNS}`,
    [userId, name],
  );
  return rows[0] || null;
}

export async function findAuthSecretById(userId) {
  const { rows } = await query(
    'SELECT user_id AS id, password_hash, email, is_active FROM users WHERE user_id = $1',
    [userId],
  );
  return rows[0] || null;
}

export async function updatePasswordHash(userId, passwordHash) {
  await query(
    'UPDATE users SET password_hash = $2, failed_login_attempts = 0, locked_until = NULL WHERE user_id = $1',
    [userId, passwordHash],
  );
}

export async function markEmailVerified(userId) {
  const { rows } = await query(
    `UPDATE users SET email_verified = true WHERE user_id = $1 RETURNING ${PUBLIC_COLUMNS}`,
    [userId],
  );
  return rows[0] || null;
}

// ---------------------------------------------------------------------------
// Refresh & single-use verification / password reset tokens
// ---------------------------------------------------------------------------

export async function insertRefreshToken(userId, tokenHash, expiresDays) {
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + ($3 || ' days')::interval)`,
    [userId, tokenHash, String(expiresDays)],
  );
}

export async function findValidRefreshToken(tokenHash) {
  const { rows } = await query(
    `SELECT rt.token_id, rt.user_id, u.name, u.email, u.role, u.department_id, u.is_active, u.email_verified, u.created_at
     FROM refresh_tokens rt
     JOIN users u ON u.user_id = rt.user_id
     WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL AND rt.expires_at > now()`,
    [tokenHash],
  );
  return rows[0] || null;
}

export async function revokeRefreshToken(tokenHash) {
  const { rowCount } = await query(
    'UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL',
    [tokenHash],
  );
  return rowCount > 0;
}

export async function revokeAllUserRefreshTokens(userId) {
  await query('UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [userId]);
}

export async function createAuthToken(userId, type, tokenHash, expiresHours) {
  // Invalidate prior unused tokens of the same type for cleanliness
  await query('UPDATE auth_tokens SET used_at = now() WHERE user_id = $1 AND type = $2 AND used_at IS NULL', [userId, type]);
  await query(
    `INSERT INTO auth_tokens (user_id, type, token_hash, expires_at)
     VALUES ($1, $2, $3, now() + ($4 || ' hours')::interval)`,
    [userId, type, tokenHash, String(expiresHours)],
  );
}

export async function consumeAuthToken(type, tokenHash) {
  const { rows } = await query(
    `UPDATE auth_tokens
     SET used_at = now()
     WHERE type = $1 AND token_hash = $2 AND used_at IS NULL AND expires_at > now()
     RETURNING user_id`,
    [type, tokenHash],
  );
  return rows[0] || null;
}

export async function findUsedEmailVerifyUser(tokenHash) {
  const { rows } = await query(
    `SELECT u.user_id AS id, u.name, u.email, u.role, u.department_id, u.is_active, u.email_verified, u.created_at
     FROM auth_tokens t JOIN users u ON u.user_id = t.user_id
     WHERE t.type = 'email_verify' AND t.token_hash = $1 AND t.used_at IS NOT NULL AND u.email_verified = true`,
    [tokenHash],
  );
  return rows[0] || null;
}

export async function listUsersAdmin({ role, q } = {}) {
  const params = [];
  const clauses = [];
  if (role) {
    params.push(role);
    clauses.push(`u.role = $${params.length}`);
  }
  if (q) {
    params.push(`%${q.trim()}%`);
    clauses.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT u.user_id AS id, u.name, u.email, u.role, u.department_id, d.name AS department_name,
            u.is_active, u.email_verified, u.failed_login_attempts, u.locked_until, u.created_at,
            (SELECT count(*)::int FROM reports r WHERE r.citizen_id = u.user_id) AS report_count
     FROM users u
     LEFT JOIN departments d ON d.dept_id = u.department_id
     ${where}
     ORDER BY u.created_at DESC, u.user_id DESC`,
    params,
  );
  return rows;
}

export async function updateUserAdmin(userId, { isActive, role, departmentId }) {
  const { rows } = await query(
    `UPDATE users
     SET is_active = COALESCE($2, is_active),
         role = COALESCE($3, role),
         department_id = CASE WHEN $4::boolean THEN $5::int ELSE department_id END
     WHERE user_id = $1
     RETURNING ${PUBLIC_COLUMNS}`,
    [userId, isActive ?? null, role ?? null, departmentId !== undefined, departmentId ?? null],
  );
  return rows[0] || null;
}
