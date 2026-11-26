-- Admin-configurable AI and spatial verification thresholds.

CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_by  INT REFERENCES users(user_id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO app_settings (key, value) VALUES
  ('ai_accept_threshold',  '0.6'::jsonb),
  ('ai_reject_threshold',  '0.4'::jsonb),
  ('pin_move_flag_m',      '200'::jsonb),
  ('low_gps_accuracy_m',   '100'::jsonb),
  ('duplicate_radius_m',   '25'::jsonb),
  ('repair_radius_m',      '50'::jsonb),
  ('exif_mismatch_m',      '200'::jsonb)
ON CONFLICT (key) DO NOTHING;
