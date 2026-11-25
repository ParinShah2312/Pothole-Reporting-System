import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';

// HTTP client for the Python FastAPI AI service (README §6).

const TIMEOUT_MS = 30_000;

async function imagePart(filePath) {
  return fs.openAsBlob(filePath);
}

async function post(endpoint, form) {
  const res = await fetch(`${env.aiServiceUrl}${endpoint}`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`AI service ${endpoint} responded ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Returns { detected, confidence, model_version, boxes } */
export async function detectPothole(filePath, originalName) {
  const form = new FormData();
  form.append('image', await imagePart(filePath), originalName || path.basename(filePath));
  return post('/detect/pothole', form);
}

/** Returns { repaired, confidence, model_version } */
export async function verifyRepair(completionPath, originalPath, completionName) {
  const form = new FormData();
  form.append('completion_image', await imagePart(completionPath), completionName || path.basename(completionPath));
  if (originalPath && fs.existsSync(originalPath)) {
    form.append('original_image', await imagePart(originalPath), path.basename(originalPath));
  }
  return post('/verify/repair', form);
}

/** Maps a public `/uploads/<file>` URL back to its path on disk. */
export const localPathForUrl = (url) => path.join(env.uploadDir, path.basename(url));
