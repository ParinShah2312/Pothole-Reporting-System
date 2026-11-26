-- 001_initial_schema.sql
-- Phase 0 schema. Location is stored on reports (1-to-1) as a PostGIS geography point.

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE departments (
  dept_id     SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  zone        TEXT,
  contact     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  user_id        SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL CHECK (role IN ('citizen', 'government', 'admin')),
  department_id  INT REFERENCES departments(dept_id),
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reports (
  report_id        SERIAL PRIMARY KEY,
  citizen_id       INT NOT NULL REFERENCES users(user_id),
  description      TEXT,
  status           TEXT NOT NULL DEFAULT 'pending_verification' CHECK (status IN (
                     'pending_verification', 'under_review', 'rejected', 'active',
                     'assigned', 'in_progress', 'repair_completed', 'solved')),
  -- Final pin location chosen by the citizen
  location         GEOGRAPHY(POINT, 4326) NOT NULL,
  address          TEXT,
  -- Location capture details (see README §7.1)
  location_source  TEXT NOT NULL CHECK (location_source IN ('gps', 'manual')),
  gps_lat          DOUBLE PRECISION,
  gps_lng          DOUBLE PRECISION,
  gps_accuracy_m   DOUBLE PRECISION,
  pin_moved_m      DOUBLE PRECISION,
  exif_lat         DOUBLE PRECISION,
  exif_lng         DOUBLE PRECISION,
  location_flags   TEXT[] NOT NULL DEFAULT '{}',
  department_id    INT REFERENCES departments(dept_id),
  -- Set once when the report first becomes active; drives the Total counter
  verified_at      TIMESTAMPTZ,
  solved_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX reports_location_gix ON reports USING GIST (location);
CREATE INDEX reports_status_idx   ON reports (status);
CREATE INDEX reports_citizen_idx  ON reports (citizen_id);

CREATE TABLE report_images (
  image_id     SERIAL PRIMARY KEY,
  report_id    INT NOT NULL REFERENCES reports(report_id) ON DELETE CASCADE,
  file_path    TEXT NOT NULL,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX report_images_report_idx ON report_images (report_id);

CREATE TABLE repairs (
  repair_id      SERIAL PRIMARY KEY,
  report_id      INT NOT NULL UNIQUE REFERENCES reports(report_id) ON DELETE CASCADE,
  dept_id        INT REFERENCES departments(dept_id),
  assigned_by    INT REFERENCES users(user_id),
  notes          TEXT,
  assigned_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at     TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ
);

CREATE TABLE completion_images (
  comp_img_id  SERIAL PRIMARY KEY,
  repair_id    INT NOT NULL REFERENCES repairs(repair_id) ON DELETE CASCADE,
  file_path    TEXT NOT NULL,
  location     GEOGRAPHY(POINT, 4326),
  distance_m   DOUBLE PRECISION,
  uploaded_by  INT REFERENCES users(user_id),
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX completion_images_repair_idx ON completion_images (repair_id);

CREATE TABLE ai_verifications (
  ai_id                SERIAL PRIMARY KEY,
  report_id            INT NOT NULL REFERENCES reports(report_id) ON DELETE CASCADE,
  type                 TEXT NOT NULL CHECK (type IN ('initial', 'completion')),
  report_image_id      INT REFERENCES report_images(image_id) ON DELETE CASCADE,
  completion_image_id  INT REFERENCES completion_images(comp_img_id) ON DELETE CASCADE,
  result               TEXT NOT NULL CHECK (result IN ('accepted', 'rejected', 'uncertain', 'error')),
  confidence           NUMERIC(5, 4),
  model_version        TEXT,
  details              JSONB NOT NULL DEFAULT '{}',
  verified_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (type = 'initial' AND report_image_id IS NOT NULL) OR
    (type = 'completion' AND completion_image_id IS NOT NULL)
  )
);
CREATE INDEX ai_verifications_report_idx ON ai_verifications (report_id);

CREATE TABLE status_history (
  history_id  SERIAL PRIMARY KEY,
  report_id   INT NOT NULL REFERENCES reports(report_id) ON DELETE CASCADE,
  old_status  TEXT,
  new_status  TEXT NOT NULL,
  changed_by  INT REFERENCES users(user_id),   -- NULL = system / AI
  note        TEXT,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX status_history_report_idx ON status_history (report_id);

CREATE TABLE notifications (
  notif_id    SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  report_id   INT REFERENCES reports(report_id) ON DELETE CASCADE,
  message     TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON notifications (user_id);

CREATE TABLE audit_logs (
  audit_id     SERIAL PRIMARY KEY,
  user_id      INT REFERENCES users(user_id),
  action       TEXT NOT NULL,
  entity_type  TEXT,
  entity_id    INT,
  ip_address   TEXT,
  details      JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
