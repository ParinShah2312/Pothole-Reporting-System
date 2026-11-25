import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import * as users from '../repositories/userRepository.js';
import { logAction } from '../repositories/auditRepository.js';
import { badRequest, conflict, forbidden, unauthorized } from '../utils/httpError.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const signToken = (user) =>
  jwt.sign({ sub: String(user.id), role: user.role, name: user.name }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

const publicUser = ({ password_hash, ...user }) => user;

export async function register({ name, email, password }, ip) {
  name = String(name || '').trim();
  email = String(email || '').trim().toLowerCase();
  password = String(password || '');

  const errors = {};
  if (name.length < 2 || name.length > 100) errors.name = 'Name must be 2–100 characters';
  if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address';
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    errors.password = 'Password must be at least 8 characters and include a letter and a number';
  }
  if (Object.keys(errors).length) throw badRequest('Please fix the highlighted fields', errors);

  if (await users.findByEmail(email)) throw conflict('An account with this email already exists');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await users.createUser({ name, email, passwordHash, role: 'citizen' });
  await logAction({ userId: user.id, action: 'user.register', entityType: 'user', entityId: user.id, ip });
  return { user, token: signToken(user) };
}

/**
 * `portal` is 'citizen' or 'government'. Citizens may only use the citizen portal;
 * government users and admins only the government portal (README §3).
 */
export async function login({ email, password, portal = 'citizen' }, ip) {
  const user = await users.findByEmail(String(email || '').trim().toLowerCase());
  const valid = user && (await bcrypt.compare(String(password || ''), user.password_hash));
  if (!valid) {
    await logAction({ action: 'auth.login_failed', ip, details: { email, portal } });
    throw unauthorized('Incorrect email or password');
  }
  if (!user.is_active) throw forbidden('This account has been suspended');

  const isStaff = user.role === 'government' || user.role === 'admin';
  if (portal === 'government' && !isStaff) throw forbidden('This login is for government staff only');
  if (portal === 'citizen' && isStaff) throw forbidden('Please use the Government portal to log in');

  await logAction({ userId: user.id, action: 'auth.login', ip, details: { portal } });
  return { user: publicUser(user), token: signToken(user) };
}
