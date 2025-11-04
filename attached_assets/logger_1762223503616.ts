// Centralized logging system
// Provides structured logging with different log levels
// Can be easily extended to integrate with external logging services

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private minLevel: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    this.minLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  debug(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage('DEBUG', message, meta));
    }
  }

  info(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage('INFO', message, meta));
    }
  }

  warn(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message, meta));
    }
  }

  error(message: string, error?: Error | any, meta?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorMeta = error instanceof Error
        ? { message: error.message, stack: error.stack, ...meta }
        : { error, ...meta };
      console.error(this.formatMessage('ERROR', message, errorMeta));
    }
  }

  // Helper methods for common patterns
  logRequest(method: string, path: string, statusCode: number, duration: number): void {
    this.info(`${method} ${path} ${statusCode}`, { duration: `${duration}ms` });
  }

  logDatabaseQuery(query: string, duration?: number): void {
    if (this.isDevelopment) {
      this.debug('Database query', { query, duration: duration ? `${duration}ms` : undefined });
    }
  }

  logAuth(userId: string, action: string, success: boolean): void {
    this.info(`Auth: ${action}`, { userId, success });
  }

  logSeed(message: string, stats?: { inserted?: number; skipped?: number; total?: number }): void {
    this.info(`Seed: ${message}`, stats);
  }
}

// Export singleton instance
export const logger = new Logger();
