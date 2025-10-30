import { Request, Response, NextFunction } from "express";
import sanitizeHtml from "sanitize-html";

// HTML Sanitization using battle-tested sanitize-html library
// XSS Protection Strategy:
// - Server-side: Use sanitize-html to strip dangerous HTML (defense in depth)
// - Drizzle ORM uses parameterized queries (prevents SQL injection)
// - React also escapes output when rendering (additional layer)
//
// This protects all API consumers (not just React), emails, logs, etc.
function sanitizeString(value: string): string {
  if (typeof value !== 'string') return value;
  
  // Strip all HTML tags for regular text fields
  // This allows safe storage while preserving user's text content
  const cleaned = sanitizeHtml(value, {
    allowedTags: [], // No HTML tags allowed
    allowedAttributes: {},
    disallowedTagsMode: 'discard'
  });
  
  return cleaned.trim();
}

// Recursively sanitize object properties
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
}

// Middleware to sanitize request body
export function sanitizeInput(req: Request, res: Response, next: NextFunction): void {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
}

// For rich text fields - allow safe HTML formatting tags
export function sanitizeRichText(text: string): string {
  if (typeof text !== 'string') return text;
  
  // Allow safe formatting tags, strip dangerous content
  return sanitizeHtml(text, {
    allowedTags: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3'],
    allowedAttributes: {},
    disallowedTagsMode: 'discard'
  }).trim();
}

// Validation helpers
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Rate limiting helper (for specific sensitive operations)
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const record = requestCounts.get(key);

  if (!record || now > record.resetAt) {
    requestCounts.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

// Middleware for rate limiting specific routes
export function rateLimit(maxRequests: number = 100, windowMs: number = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}-${req.path}`;
    
    if (!checkRateLimit(key, maxRequests, windowMs)) {
      return res.status(429).json({
        error: "Too many requests",
        message: "Please try again later",
      });
    }
    
    next();
  };
}
