import * as reportService from '../services/reportService.js';
import * as reports from '../repositories/reportRepository.js';
import { STATUSES } from '../services/statusService.js';
import { badRequest } from '../utils/httpError.js';
import { parseId } from './reportController.js';

export async function listReports(req, res) {
  const { status } = req.query;
  if (status && !STATUSES.includes(status)) throw badRequest('Unknown status filter');
  res.json({ reports: await reports.listForGovernment({ status }) });
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
