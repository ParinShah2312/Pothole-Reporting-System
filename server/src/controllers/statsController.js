import { getCounters } from '../repositories/statsRepository.js';

export async function counters(_req, res) {
  res.json(await getCounters());
}
