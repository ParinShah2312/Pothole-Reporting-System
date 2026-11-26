import fs from 'node:fs';
import multer from 'multer';
import { uploadedFilesFrom } from './upload.js';
import { env } from '../config/env.js';

export function notFoundHandler(_req, res) {
  res.status(404).json({ error: 'Route not found' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  // Don't leave uploaded images on disk if the request failed
  for (const file of uploadedFilesFrom(req)) {
    if (file?.path) fs.unlink(file.path, () => {});
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? `Each image must be <= ${env.maxUploadMb} MB`
        : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE'
          ? `Up to ${env.maxImagesPerReport} images can be uploaded per report`
          : err.message;
    return res.status(400).json({ error: message });
  }
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: status >= 500 ? 'Internal server error' : err.message,
    ...(err.details && { details: err.details }),
  });
}
