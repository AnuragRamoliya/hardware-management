import rateLimit from 'express-rate-limit';

export const verifyDocumentRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 30, // max 30 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many verification attempts from this IP, please try again after a minute.',
  },
});

export const revealRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 20, // max 20 reveals per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many vault reveal attempts, please try again in a minute.',
  },
});

export const exportRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 15, // max 15 exports per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Export rate limit exceeded. Please wait before generating more exports.',
  },
});

export const optionsRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 120, // max 120 options fetches per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many options requests, please slow down.',
  },
});
