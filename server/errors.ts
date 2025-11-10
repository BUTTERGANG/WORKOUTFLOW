import { Response } from "express";
import { ZodError } from "zod";
import { logger } from "./logger";

// Custom error classes
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden: insufficient permissions") {
    super(403, message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
  }
}

// Error handler utility
export function handleError(error: unknown, res: Response): void {
  logger.error("Request error", error);

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
    res.status(400).json({
      error: "Validation failed",
      details: messages,
    });
    return;
  }

  // Handle custom app errors
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: error.message,
    });
    return;
  }

  // Handle database errors
  if (error && typeof error === 'object' && 'code' in error) {
    const dbError = error as { code: string; detail?: string };
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // PostgreSQL error codes
    switch (dbError.code) {
      case '23505': // Unique violation
        res.status(409).json({
          error: "Duplicate entry",
          // Only expose database details in development
          ...(isDevelopment && dbError.detail && { details: dbError.detail }),
        });
        return;
      
      case '23503': // Foreign key violation
        res.status(400).json({
          error: "Referenced resource does not exist",
          // Only expose database details in development
          ...(isDevelopment && dbError.detail && { details: dbError.detail }),
        });
        return;
      
      case '23502': // Not null violation
        res.status(400).json({
          error: "Required field is missing",
          // Only expose database details in development
          ...(isDevelopment && dbError.detail && { details: dbError.detail }),
        });
        return;
    }
  }

  // Generic server error
  res.status(500).json({
    error: "Internal server error",
    ...(process.env.NODE_ENV === 'development' && {
      details: error instanceof Error ? error.message : String(error),
    }),
  });
}

// Async handler wrapper to catch errors
export function asyncHandler(
  fn: (req: any, res: Response, next: any) => Promise<any>
) {
  return (req: any, res: Response, next: any) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      handleError(error, res);
    });
  };
}
