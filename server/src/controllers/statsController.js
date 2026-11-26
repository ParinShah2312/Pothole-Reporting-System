import { getCounters, getTrends } from '../repositories/statsRepository.js';
import { getAllSettings } from '../repositories/settingsRepository.js';
import { subscribeCounters } from '../utils/counterStream.js';
import { badRequest } from '../utils/httpError.js';

export async function counters(_req, res) {
  res.json(await getCounters());
}

export async function streamCounters(req, res) {
  await subscribeCounters(req, res);
}

export async function trends(req, res) {
  const { from, to } = req.query;
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if ((from && !dateRe.test(from)) || (to && !dateRe.test(to))) {
    throw badRequest('Dates must be in YYYY-MM-DD format');
  }
  if (from && to && from > to) {
    throw badRequest('"from" date must be on or before "to" date');
  }
  res.json(await getTrends({ from, to }));
}

export async function publicSettings(_req, res) {
  const s = await getAllSettings();
  res.json({
    pin_move_flag_m: s.pin_move_flag_m,
    low_gps_accuracy_m: s.low_gps_accuracy_m,
    duplicate_radius_m: s.duplicate_radius_m,
    repair_radius_m: s.repair_radius_m,
  });
}
