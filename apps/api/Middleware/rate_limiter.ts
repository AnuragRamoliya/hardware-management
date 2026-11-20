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
