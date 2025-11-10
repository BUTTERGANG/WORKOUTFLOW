/**
 * Structured logger with automatic secret redaction
 * Prevents sensitive data from being logged (passwords, tokens, API keys, etc.)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

// Patterns to detect and redact sensitive data
const SENSITIVE_KEYS = [
  'password',
  'passwordHash',
  'password_hash',
  'token',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'apiKey',
  'api_key',
  'secret',
  'sessionId',
  'session_id',
  'csrfToken',
  'csrf_token',
  'authorization',
  'cookie',
  'set-cookie',
];

const REDACTED = '[REDACTED]';

/**
 * Recursively redact sensitive values from objects
 */
function redactSensitiveData(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveData(item));
  }

  // Handle objects
  if (typeof obj === 'object') {
    const redacted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      // Check if key matches sensitive patterns
      const isSensitive = SENSITIVE_KEYS.some(pattern => 
        lowerKey.includes(pattern.toLowerCase())
      );
      
      if (isSensitive) {
        redacted[key] = REDACTED;
      } else if (typeof value === 'object') {
        redacted[key] = redactSensitiveData(value);
      } else {
        redacted[key] = value;
      }
    }
    return redacted;
  }

  return obj;
}

/**
 * Format log message with timestamp and level
 */
function formatLogMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const levelStr = level.toUpperCase().padEnd(5);
  
  let logLine = `[${timestamp}] ${levelStr} ${message}`;
  
  if (context && Object.keys(context).length > 0) {
    const safeContext = redactSensitiveData(context);
    logLine += ` ${JSON.stringify(safeContext)}`;
  }
  
  return logLine;
}

/**
 * Structured logger class
 */
class Logger {
  private minLevel: LogLevel;

  constructor(minLevel: LogLevel = 'info') {
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.minLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.log(formatLogMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.log(formatLogMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(formatLogMessage('warn', message, context));
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const errorContext = { ...context };
      
      if (error instanceof Error) {
        errorContext.error = {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        };
      } else if (error) {
        errorContext.error = redactSensitiveData(error);
      }
      
      console.error(formatLogMessage('error', message, errorContext));
    }
  }
}

// Create singleton logger instance
const logLevel = (process.env.LOG_LEVEL as LogLevel) || 
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

export const logger = new Logger(logLevel);

// Export convenience functions for easier migration from console.*
export const log = logger.info.bind(logger);
export const logError = logger.error.bind(logger);
export const logWarn = logger.warn.bind(logger);
export const logDebug = logger.debug.bind(logger);
