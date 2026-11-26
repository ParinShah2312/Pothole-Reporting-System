import rateLimit from 'express-rate-limit';

const jsonLimitHandler = (message) => (_req, res) => {
  res.status(429).json({ error: message });
};

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonLimitHandler('Too many authentication attempts, please try again in 15 minutes'),
});

export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonLimitHandler('Too many image uploads, please try again shortly'),
});
