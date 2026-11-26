import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import * as users from '../repositories/userRepository.js';
import { logAction } from '../repositories/auditRepository.js';
import { badRequest, conflict, forbidden, locked, notFound, unauthorized } from '../utils/httpError.js';

const sha256 = (raw) => crypto.createHash('sha256').update(String(raw)).digest('hex');
const randomToken = () => crypto.randomBytes(32).toString('hex');

const signAccessToken = (user) =>
  jwt.sign({ sub: String(user.id), role: user.role, name: user.name }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

const publicUser = ({ password_hash, failed_login_attempts, locked_until, ...user }) => user;

async function issueSession(user) {
  const token = signAccessToken(user);
  const refreshToken = randomToken();
  await users.insertRefreshToken(user.id, sha256(refreshToken), env.jwtRefreshExpiresDays);
  return { user: publicUser(user), token, refreshToken };
}

async function createAndLogVerifyLink(user) {
  const raw = randomToken();
  await users.createAuthToken(user.id, 'email_verify', sha256(raw), 24);
  const verifyUrl = `${env.clientUrl}/verify-email?token=${raw}`;
  console.log(`[auth] Email verification link for ${user.email}: ${verifyUrl}`);
  return verifyUrl;
}

export async function register({ name, email, password }, ip) {
  if (await users.findByEmail(email)) throw conflict('An account with this email already exists');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await users.createUser({ name, email, passwordHash, role: 'citizen', emailVerified: false });
  const verifyUrl = await createAndLogVerifyLink(user);
  await logAction({ userId: user.id, action: 'user.register', entityType: 'user', entityId: user.id, ip });

  const session = await issueSession(user);
  return env.nodeEnv === 'production' ? session : { ...session, devVerifyUrl: verifyUrl };
}

export async function login({ email, password, portal = 'citizen' }, ip) {
  const user = await users.findByEmail(email);

  if (user?.locked_until && new Date(user.locked_until) > new Date()) {
    const mins = Math.max(1, Math.ceil((new Date(user.locked_until) - Date.now()) / 60000));
    throw locked(`Too many failed login attempts. Try again in ${mins} minute${mins > 1 ? 's' : ''}.`);
  }

  const valid = user && (await bcrypt.compare(password, user.password_hash));
  if (!valid) {
    if (user) {
      const updated = await users.recordFailedLogin(user.id, env.maxLoginAttempts, env.lockoutMinutes);
      if (updated?.locked_until && new Date(updated.locked_until) > new Date()) {
        await logAction({ userId: user.id, action: 'auth.account_locked', ip, details: { portal } });
        throw locked(`Account locked for ${env.lockoutMinutes} minutes after ${env.maxLoginAttempts} failed attempts.`);
      }
    }
    await logAction({ action: 'auth.login_failed', ip, details: { email, portal } });
    throw unauthorized('Incorrect email or password');
  }

  if (!user.is_active) throw forbidden('This account has been suspended');

  const isStaff = user.role === 'government' || user.role === 'admin';
  if (portal === 'government' && !isStaff) throw forbidden('This login is for government staff only');
  if (portal === 'citizen' && isStaff) throw forbidden('Please use the Government portal to log in');

  await users.resetLoginFailures(user.id);
  await logAction({ userId: user.id, action: 'auth.login', ip, details: { portal } });
  return issueSession(user);
}

export async function refreshAccessToken(rawRefreshToken) {
  const tokenHash = sha256(rawRefreshToken);
  const record = await users.findValidRefreshToken(tokenHash);
  if (!record) throw unauthorized('Refresh token is invalid or expired');
  if (!record.is_active) throw forbidden('This account has been suspended');

  await users.revokeRefreshToken(tokenHash);
  const user = {
    id: record.user_id,
    name: record.name,
    email: record.email,
    role: record.role,
    department_id: record.department_id,
    is_active: record.is_active,
    email_verified: record.email_verified,
    created_at: record.created_at,
  };
  return issueSession(user);
}

export async function logout({ refreshToken, userId, ip }) {
  if (refreshToken) {
    await users.revokeRefreshToken(sha256(refreshToken));
  }
  if (userId) {
    await logAction({ userId, action: 'auth.logout', ip });
  }
  return { ok: true };
}

export async function verifyEmail(rawToken, ip) {
  const hash = sha256(rawToken);
  const hit = await users.consumeAuthToken('email_verify', hash);
  if (!hit) {
    const alreadyVerifiedUser = await users.findUsedEmailVerifyUser(hash);
    if (alreadyVerifiedUser) return { user: alreadyVerifiedUser, alreadyVerified: true };
    throw badRequest('Verification link is invalid or has expired');
  }
  const user = await users.markEmailVerified(hit.user_id);
  await logAction({ userId: hit.user_id, action: 'user.email_verified', entityType: 'user', entityId: hit.user_id, ip });
  return { user };
}

export async function resendVerification(userId) {
  const user = await users.findById(userId);
  if (!user) throw notFound('User not found');
  if (user.email_verified) return { ok: true, alreadyVerified: true };
  const verifyUrl = await createAndLogVerifyLink(user);
  return env.nodeEnv === 'production' ? { ok: true } : { ok: true, devVerifyUrl: verifyUrl };
}

export async function forgotPassword(email, ip) {
  const user = await users.findByEmail(email);
  let resetUrl = null;
  if (user && user.is_active) {
    const raw = randomToken();
    await users.createAuthToken(user.id, 'password_reset', sha256(raw), 1);
    resetUrl = `${env.clientUrl}/reset-password?token=${raw}`;
    console.log(`[auth] Password reset link for ${user.email}: ${resetUrl}`);
    await logAction({ userId: user.id, action: 'auth.password_reset_requested', ip });
  }
  const res = { ok: true, message: 'If an account matches that email, a password reset link has been generated.' };
  return env.nodeEnv !== 'production' && resetUrl ? { ...res, devResetUrl: resetUrl } : res;
}

export async function resetPassword(rawToken, password, ip) {
  const hit = await users.consumeAuthToken('password_reset', sha256(rawToken));
  if (!hit) throw badRequest('Reset link is invalid or has expired');

  const passwordHash = await bcrypt.hash(password, 10);
  await users.updatePasswordHash(hit.user_id, passwordHash);
  await users.revokeAllUserRefreshTokens(hit.user_id);
  await logAction({ userId: hit.user_id, action: 'auth.password_reset', entityType: 'user', entityId: hit.user_id, ip });
  return { ok: true };
}

export async function updateProfile(userId, { name }, ip) {
  const user = await users.updateProfile(userId, { name });
  if (!user) throw notFound('User not found');
  await logAction({ userId, action: 'user.profile_update', entityType: 'user', entityId: userId, ip, details: { name } });
  return { user };
}

export async function changePassword(userId, { currentPassword, newPassword }, ip) {
  const secret = await users.findAuthSecretById(userId);
  if (!secret) throw notFound('User not found');
  const ok = await bcrypt.compare(currentPassword, secret.password_hash);
  if (!ok) throw badRequest('Current password is incorrect', { currentPassword: 'Current password is incorrect' });

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await users.updatePasswordHash(userId, passwordHash);
  await users.revokeAllUserRefreshTokens(userId);
  await logAction({ userId, action: 'user.password_change', entityType: 'user', entityId: userId, ip });
  return { ok: true };
}
