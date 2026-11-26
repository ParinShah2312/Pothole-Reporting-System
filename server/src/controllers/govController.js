import * as reportService from '../services/reportService.js';
import * as reports from '../repositories/reportRepository.js';
import { STATUSES } from '../services/statusService.js';
import { badRequest } from '../utils/httpError.js';
import { parseId } from './reportController.js';

export async function listReports(req, res) {
  const { status, departmentId, from, to, q, flagged } = req.query;
  if (status && !STATUSES.includes(status)) throw badRequest('Unknown status filter');

  const parsedDept = departmentId ? Number(departmentId) : undefined;
  if (departmentId && (!Number.isInteger(parsedDept) || parsedDept <= 0)) {
    throw badRequest('Invalid departmentId filter');
  }
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if ((from && !dateRe.test(from)) || (to && !dateRe.test(to))) {
    throw badRequest('Dates must be in YYYY-MM-DD format');
  }

  res.json({
    reports: await reports.listForGovernment({
      status: status || undefined,
      departmentId: parsedDept,
      from: from || undefined,
      to: to || undefined,
      q: typeof q === 'string' && q.trim() ? q.trim() : undefined,
      flagged: flagged === 'true' || flagged === '1',
    }),
  });
}

export async function listDepartments(_req, res) {
  res.json({ departments: await reports.listDepartments() });
}

export async function updateStatus(req, res) {
  const report = await reportService.updateStatusByGovernment({
    reportId: parseId(req), userId: req.user.id, body: req.body, ip: req.ip,
  });
  res.json({ report });
}

export async function uploadCompletion(req, res) {
  const result = await reportService.submitCompletion({
    reportId: parseId(req), userId: req.user.id, body: req.body, file: req.file, ip: req.ip,
  });
  res.json(result);
}
