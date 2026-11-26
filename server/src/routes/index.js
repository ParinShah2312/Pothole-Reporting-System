import { Router } from 'express';
import * as auth from '../controllers/authController.js';
import * as reportsCtl from '../controllers/reportController.js';
import * as gov from '../controllers/govController.js';
import * as admin from '../controllers/adminController.js';
import * as stats from '../controllers/statsController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { uploadImage, uploadReportImages } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { authLimiter, uploadLimiter } from '../middleware/rateLimit.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  tokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
  govStatusSchema,
  adminOverrideSchema,
  adminCreateUserSchema,
  adminUpdateUserSchema,
  adminSettingsSchema,
} from '../validation/schemas.js';

const router = Router();
const staff = [requireAuth, requireRole('government', 'admin')];
const adminOnly = [requireAuth, requireRole('admin')];

// Auth
router.post('/auth/register', authLimiter, validate(registerSchema), auth.register);
router.post('/auth/login', authLimiter, validate(loginSchema), auth.login);
router.post('/auth/refresh', validate(refreshSchema), auth.refresh);
router.post('/auth/logout', auth.logout);
router.post('/auth/verify-email', validate(tokenSchema), auth.verifyEmail);
router.post('/auth/resend-verification', requireAuth, authLimiter, auth.resendVerification);
router.post('/auth/forgot-password', authLimiter, validate(forgotPasswordSchema), auth.forgotPassword);
router.post('/auth/reset-password', authLimiter, validate(resetPasswordSchema), auth.resetPassword);
router.get('/auth/me', requireAuth, auth.me);
router.patch('/auth/profile', requireAuth, validate(updateProfileSchema), auth.updateProfile);
router.patch('/auth/password', requireAuth, validate(changePasswordSchema), auth.changePassword);

// Public
router.get('/stats/counters', stats.counters);
router.get('/stats/stream', stats.streamCounters);
router.get('/stats/trends', stats.trends);
router.get('/settings/public', stats.publicSettings);
router.get('/reports/map', reportsCtl.listForMap);

// Citizen
router.post('/reports', requireAuth, requireRole('citizen'), uploadLimiter, uploadReportImages, reportsCtl.create);
router.get('/reports/mine', requireAuth, requireRole('citizen'), reportsCtl.listMine);
router.get('/reports/:id', requireAuth, reportsCtl.details);

// Government
router.get('/gov/reports', ...staff, gov.listReports);
router.get('/gov/departments', ...staff, gov.listDepartments);
router.patch('/gov/reports/:id/status', ...staff, validate(govStatusSchema), gov.updateStatus);
router.post('/gov/reports/:id/completion', ...staff, uploadLimiter, uploadImage, gov.uploadCompletion);

// Admin
router.get('/admin/review-queue', ...adminOnly, admin.listReviewQueue);
router.patch('/admin/reports/:id/override', ...adminOnly, validate(adminOverrideSchema), admin.overrideReport);
router.get('/admin/users', ...adminOnly, admin.listUsers);
router.post('/admin/users', ...adminOnly, validate(adminCreateUserSchema), admin.createUser);
router.patch('/admin/users/:id', ...adminOnly, validate(adminUpdateUserSchema), admin.updateUser);
router.get('/admin/audit-logs', ...adminOnly, admin.listAuditLogs);
router.get('/admin/settings', ...adminOnly, admin.getSettings);
router.patch('/admin/settings', ...adminOnly, validate(adminSettingsSchema), admin.updateSettings);

export default router;
