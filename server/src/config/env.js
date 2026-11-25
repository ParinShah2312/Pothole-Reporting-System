import dotenv from 'dotenv';

dotenv.config({ quiet: true });

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const num = (name, fallback) => (process.env[name] ? Number(process.env[name]) : fallback);

export const env = {
  port: num('PORT', 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxUploadMb: num('MAX_UPLOAD_MB', 8),

  // AI decision thresholds (pothole confidence)
  aiAcceptThreshold: num('AI_ACCEPT_THRESHOLD', 0.6),
  aiRejectThreshold: num('AI_REJECT_THRESHOLD', 0.4),

  // Location rules, in metres (README §7.1)
  pinMoveFlagM: num('PIN_MOVE_FLAG_M', 200),
  lowGpsAccuracyM: num('LOW_GPS_ACCURACY_M', 100),
  duplicateRadiusM: num('DUPLICATE_RADIUS_M', 25),
  repairRadiusM: num('REPAIR_RADIUS_M', 50),
};
