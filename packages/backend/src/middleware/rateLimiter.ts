import rateLimit from 'express-rate-limit';

/**
 * Creates an Express rate limiter middleware.
 * @param windowMinutes - Time window in minutes
 * @param maxRequests - Max requests per window
 */
export function createRateLimiter(windowMinutes: number, maxRequests: number) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests, please try again later.' },
    skip: () => process.env.NODE_ENV === 'test',
  });
}
