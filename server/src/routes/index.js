import { Router } from 'express';
import * as auth from '../controllers/authController.js';
import * as reportsCtl from '../controllers/reportController.js';
import * as gov from '../controllers/govController.js';
import * as stats from '../controllers/statsController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { uploadImage } from '../middleware/upload.js';

const router = Router();
const staff = [requireAuth, requireRole('government', 'admin')];

// Auth
router.post('/auth/register', auth.register);
router.post('/auth/login', auth.login);
router.get('/auth/me', requireAuth, auth.me);

// Public
router.get('/stats/counters', stats.counters);
router.get('/reports/map', reportsCtl.listForMap);

// Citizen
router.post('/reports', requireAuth, requireRole('citizen'), uploadImage, reportsCtl.create);
router.get('/reports/mine', requireAuth, requireRole('citizen'), reportsCtl.listMine);
router.get('/reports/:id', requireAuth, reportsCtl.details);

// Government
router.get('/gov/reports', ...staff, gov.listReports);
router.get('/gov/departments', ...staff, gov.listDepartments);
router.patch('/gov/reports/:id/status', ...staff, gov.updateStatus);
router.post('/gov/reports/:id/completion', ...staff, uploadImage, gov.uploadCompletion);

export default router;
