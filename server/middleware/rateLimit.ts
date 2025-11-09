import type { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  }
}, 5 * 60 * 1000);

/**
 * Rate limiting middleware - prevents brute force attacks
 * @param maxRequests - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds
 */
export function rateLimit(maxRequests: number = 5, windowMs: number = 15 * 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const identifier = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${identifier}:${req.path}`;
    const now = Date.now();

    if (!store[key] || store[key].resetTime < now) {
      // Create new entry or reset expired one
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
      return next();
    }

    store[key].count++;

    if (store[key].count > maxRequests) {
      const resetIn = Math.ceil((store[key].resetTime - now) / 1000);
      return res.status(429).json({
        message: `Too many requests. Please try again in ${resetIn} seconds.`,
        retryAfter: resetIn,
      });
    }

    next();
  };
}
