import { doubleCsrf } from 'csrf-csrf';
import type { Request } from 'express';

// Configure CSRF protection using double-submit cookie pattern
const csrfUtilities = doubleCsrf({
  getSecret: () => {
    const secret = process.env.CSRF_SECRET || process.env.SESSION_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error('CSRF_SECRET or SESSION_SECRET must be at least 32 characters');
    }
    return secret;
  },
  getSessionIdentifier: (req: Request) => {
    // CRITICAL: Must have unique identifier per client to prevent token reuse
    // Session ID is the best option - require session middleware before CSRF
    const sessionId = (req.session as any)?.id;
    if (!sessionId) {
      throw new Error('CSRF protection requires active session - ensure session middleware runs before CSRF');
    }
    return sessionId;
  },
  cookieName: process.env.NODE_ENV === 'production' 
    ? '__Host-csrf-token' 
    : 'csrf-token', // Remove __Host- prefix for localhost (non-HTTPS)
  cookieOptions: {
    sameSite: 'lax', // Keep 'lax' for invite link compatibility (not 'strict')
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  },
  size: 64, // Token size in bits
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'], // Don't require CSRF for safe methods
  getCsrfTokenFromRequest: (req: Request) => {
    // Check header first (preferred for AJAX), then body
    return req.headers['x-csrf-token'] as string || req.body?._csrf;
  },
});

// Extract utilities - type definitions may be incomplete but runtime works correctly
const doubleCsrfProtection = csrfUtilities.doubleCsrfProtection;
const generateToken = (csrfUtilities as any).generateToken;

export { doubleCsrfProtection, generateToken };
