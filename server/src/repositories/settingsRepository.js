import { query, withTransaction } from '../config/db.js';
import { env } from '../config/env.js';
import { logAction } from './auditRepository.js';

export const DEFAULT_SETTINGS = {
  ai_accept_threshold: env.aiAcceptThreshold,
  ai_reject_threshold: env.aiRejectThreshold,
  pin_move_flag_m: env.pinMoveFlagM,
  low_gps_accuracy_m: env.lowGpsAccuracyM,
  duplicate_radius_m: env.duplicateRadiusM,
  repair_radius_m: env.repairRadiusM,
  exif_mismatch_m: env.exifMismatchM,
};

export async function getAllSettings() {
  const result = { ...DEFAULT_SETTINGS };
  try {
    const { rows } = await query('SELECT key, value FROM app_settings');
    for (const row of rows) {
      if (row.key in result) {
        const parsed = Number(row.value);
        if (Number.isFinite(parsed)) result[row.key] = parsed;
      }
    }
  } catch {
    // Fallback cleanly to env defaults if table doesn't exist yet during early boot/migration.
  }
  return result;
}

export async function saveSettings(userId, patch, ip) {
  await withTransaction(async (db) => {
    for (const [key, val] of Object.entries(patch)) {
      if (!(key in DEFAULT_SETTINGS) || val === undefined) continue;
      await db.query(
        `INSERT INTO app_settings (key, value, updated_by, updated_at)
         VALUES ($1, $2::jsonb, $3, now())
         ON CONFLICT (key) DO UPDATE
           SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`,
        [key, JSON.stringify(val), userId],
      );
    }
    await logAction({
      userId,
      action: 'admin.settings_update',
      entityType: 'settings',
      ip,
      details: patch,
    }, db);
  });
  return getAllSettings();
}
