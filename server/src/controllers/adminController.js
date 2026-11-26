import bcrypt from 'bcryptjs';
import * as reports from '../repositories/reportRepository.js';
import * as users from '../repositories/userRepository.js';
import * as audit from '../repositories/auditRepository.js';
import * as settings from '../repositories/settingsRepository.js';
import * as reportService from '../services/reportService.js';
import { badRequest, conflict, notFound } from '../utils/httpError.js';
import { parseId } from './reportController.js';

export async function listReviewQueue(req, res) {
  const scope = req.query.scope === 'all' ? 'all' : 'attention';
  res.json({ reports: await reports.listReviewQueue({ scope }) });
}

export async function overrideReport(req, res) {
  const report = await reportService.overrideReportByAdmin({
    reportId: parseId(req),
    userId: req.user.id,
    body: req.body,
    ip: req.ip,
  });
  res.json({ report });
}

export async function listUsers(req, res) {
  const { role, q } = req.query;
  const [userRows, departments] = await Promise.all([
    users.listUsersAdmin({ role: role || undefined, q: typeof q === 'string' && q.trim() ? q.trim() : undefined }),
    reports.listDepartments(),
  ]);
  res.json({ users: userRows, departments });
}

export async function createUser(req, res) {
  const { name, email, password, role, departmentId } = req.body;
  if (await users.findByEmail(email)) throw conflict('An account with this email already exists');
  if (role === 'government' && departmentId && !(await reports.departmentExists(departmentId))) {
    throw badRequest('Selected department does not exist');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await users.createUser({
    name,
    email,
    passwordHash,
    role,
    departmentId: role === 'government' ? (departmentId ?? null) : null,
    emailVerified: true,
  });

  await audit.logAction({
    userId: req.user.id,
    action: 'admin.user_create',
    entityType: 'user',
    entityId: user.id,
    ip: req.ip,
    details: { role, departmentId: user.department_id },
  });

  res.status(201).json({ user });
}

export async function updateUser(req, res) {
  const targetId = parseId(req);
  const { isActive, role, departmentId } = req.body;
  if (targetId === req.user.id && isActive === false) {
    throw badRequest('You cannot suspend your own active admin account');
  }
  if (departmentId !== undefined && departmentId !== null && !(await reports.departmentExists(departmentId))) {
    throw badRequest('Selected department does not exist');
  }

  const updated = await users.updateUserAdmin(targetId, { isActive, role, departmentId });
  if (!updated) throw notFound('User not found');

  if (isActive === false) {
    await users.revokeAllUserRefreshTokens(targetId);
  }

  await audit.logAction({
    userId: req.user.id,
    action: 'admin.user_update',
    entityType: 'user',
    entityId: targetId,
    ip: req.ip,
    details: { isActive, role, departmentId },
  });

  res.json({ user: updated });
}

export async function listAuditLogs(req, res) {
  const { action, q, limit } = req.query;
  const logs = await audit.listAuditLogs({
    action: typeof action === 'string' && action.trim() ? action.trim() : undefined,
    q: typeof q === 'string' && q.trim() ? q.trim() : undefined,
    limit,
  });
  res.json({ logs });
}

export async function getSettings(_req, res) {
  res.json({ settings: await settings.getAllSettings() });
}

export async function updateSettings(req, res) {
  const current = await settings.getAllSettings();
  const nextAccept = req.body.ai_accept_threshold ?? current.ai_accept_threshold;
  const nextReject = req.body.ai_reject_threshold ?? current.ai_reject_threshold;
  if (nextReject >= nextAccept) {
    throw badRequest('ai_reject_threshold must be strictly lower than ai_accept_threshold');
  }
  const updated = await settings.saveSettings(req.user.id, req.body, req.ip);
  res.json({ settings: updated });
}
