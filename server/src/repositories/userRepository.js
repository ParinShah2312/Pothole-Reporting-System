import { query } from '../config/db.js';

const PUBLIC_COLUMNS = 'user_id AS id, name, email, role, department_id, is_active, created_at';

export async function findByEmail(email) {
  const { rows } = await query(
    'SELECT user_id AS id, name, email, password_hash, role, department_id, is_active, created_at FROM users WHERE email = $1',
    [email],
  );
  return rows[0] || null;
}

export async function findById(id) {
  const { rows } = await query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE user_id = $1`, [id]);
  return rows[0] || null;
}

export async function createUser({ name, email, passwordHash, role = 'citizen', departmentId = null }) {
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash, role, department_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING ${PUBLIC_COLUMNS}`,
    [name, email, passwordHash, role, departmentId],
  );
  return rows[0];
}
