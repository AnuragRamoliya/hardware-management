import rateLimit from 'express-rate-limit';
import { env } from '../Config/env';

export interface RateLimiterLimits {
  login: number;
  reveal: number;
  export: number;
  options: number;
  verifyDocument: number;
}

export function getRateLimiterLimits(nodeEnv: string = env.NODE_ENV): RateLimiterLimits {
  const isProd = nodeEnv === 'production';
  return {
    login: isProd ? 5 : 200,
    reveal: isProd ? 10 : 100,
    export: isProd ? 5 : 100,
    options: isProd ? 120 : 1000,
    verifyDocument: isProd ? 10 : 100,
  };
}

export const RATE_LIMITS = getRateLimiterLimits(env.NODE_ENV);

export const verifyDocumentRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: RATE_LIMITS.verifyDocument,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many verification attempts from this IP, please try again after a minute.',
  },
});

export const revealRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: RATE_LIMITS.reveal,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many vault reveal attempts, please try again in a minute.',
  },
});

export const exportRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: RATE_LIMITS.export,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Export rate limit exceeded. Please wait before generating more exports.',
  },
});

export const optionsRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: RATE_LIMITS.options,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many options requests, please slow down.',
  },
});
