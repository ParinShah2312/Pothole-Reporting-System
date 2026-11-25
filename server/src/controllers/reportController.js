import * as reportService from '../services/reportService.js';
import * as reports from '../repositories/reportRepository.js';
import { badRequest } from '../utils/httpError.js';

export function parseId(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw badRequest('Invalid report id');
  return id;
}

export async function create(req, res) {
  const report = await reportService.createReport({ citizenId: req.user.id, body: req.body, file: req.file, ip: req.ip });
  res.status(201).json({ report });
}

export async function listForMap(_req, res) {
  res.json({ reports: await reports.listForMap() });
}

export async function listMine(req, res) {
  res.json({ reports: await reports.listByCitizen(req.user.id) });
}

export async function details(req, res) {
  res.json({ report: await reportService.getReportDetails(parseId(req), req.user) });
}
