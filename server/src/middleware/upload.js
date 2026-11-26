import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { env } from '../config/env.js';
import { badRequest } from '../utils/httpError.js';

// Phase 0: images are stored on local disk. Phase 2 moves this to Cloudinary.
const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

fs.mkdirSync(env.uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: env.uploadDir,
  filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${ALLOWED[file.mimetype]}`),
});

const baseMulter = multer({
  storage,
  limits: { fileSize: env.maxUploadMb * 1024 * 1024, files: env.maxImagesPerReport },
  fileFilter: (_req, file, cb) =>
    ALLOWED[file.mimetype] ? cb(null, true) : cb(badRequest('Only JPEG, PNG or WebP images are allowed')),
});

// Single image (e.g. government completion proof)
export const uploadImage = baseMulter.single('image');

// Multi-photo report intake: accepts 1..maxImagesPerReport under `images` (or legacy single `image`)
export const uploadReportImages = baseMulter.fields([
  { name: 'images', maxCount: env.maxImagesPerReport },
  { name: 'image', maxCount: 1 },
]);

export function uploadedFilesFrom(req) {
  if (Array.isArray(req.files)) return req.files;
  if (req.files && typeof req.files === 'object') {
    return [...(req.files.images || []), ...(req.files.image || [])];
  }
  return req.file ? [req.file] : [];
}

export const publicUrlFor = (file) => `/uploads/${path.basename(file.path)}`;
