import path from 'node:path';
import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

export const app = express();

app.set('trust proxy', 'loopback');
app.use(cors({ origin: env.clientUrl }));
app.use(express.json({ limit: '100kb' }));

// Phase 0: uploaded images served from local disk (Cloudinary in Phase 2)
app.use('/uploads', express.static(path.resolve(env.uploadDir), { fallthrough: false }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);
