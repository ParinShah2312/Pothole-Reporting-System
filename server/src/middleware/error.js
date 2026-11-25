import fs from 'node:fs';
import multer from 'multer';

export function notFoundHandler(_req, res) {
  res.status(404).json({ error: 'Route not found' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  // Don't keep an uploaded image if the request failed
  if (req.file?.path) fs.unlink(req.file.path, () => {});

  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Image is too large' : err.message;
    return res.status(400).json({ error: message });
  }
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: status >= 500 ? 'Internal server error' : err.message,
    ...(err.details && { details: err.details }),
  });
}
