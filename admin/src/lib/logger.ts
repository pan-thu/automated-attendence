/**
 * Production-ready logger for admin dashboard
 * Suppresses console.log in production, provides structured logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMetadata {
  [key: string]: unknown;
}

class Logger {
  private context: string;
  private isDevelopment: boolean;

  constructor(context: string) {
    this.context = context;
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  private shouldLog(level: LogLevel): boolean {
    // In production, only log warnings and errors
    if (!this.isDevelopment) {
      return level === 'warn' || level === 'error';
    }
    return true;
  }

  private formatMessage(level: LogLevel, message: string, metadata?: LogMetadata): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}`;

    if (!this.shouldLog(level)) {
      return;
    }

    switch (level) {
      case 'debug':
        if (this.isDevelopment) {
          console.debug(formattedMessage, metadata);
        }
        break;
      case 'info':
        if (this.isDevelopment) {
          console.info(formattedMessage, metadata);
        }
        break;
      case 'warn':
        console.warn(formattedMessage, metadata);
        // In production, could send to monitoring service
        if (!this.isDevelopment && typeof window !== 'undefined') {
          this.sendToMonitoring('warn', message, metadata);
        }
        break;
      case 'error':
        console.error(formattedMessage, metadata);
        // In production, could send to error tracking service
        if (!this.isDevelopment && typeof window !== 'undefined') {
          this.sendToMonitoring('error', message, metadata);
        }
        break;
    }
  }

  private sendToMonitoring(level: LogLevel, message: string, metadata?: LogMetadata): void {
    // Integration point for services like Sentry, LogRocket, etc.
    // For now, we'll just store critical errors in sessionStorage for debugging
    try {
      const logs = JSON.parse(sessionStorage.getItem('app_logs') || '[]');
      logs.push({
        timestamp: new Date().toISOString(),
        level,
        context: this.context,
        message,
        metadata,
      });
      // Keep only last 50 logs
      if (logs.length > 50) {
        logs.shift();
      }
      sessionStorage.setItem('app_logs', JSON.stringify(logs));
    } catch {
      // Silently fail if storage is not available
    }
  }

  debug(message: string, metadata?: LogMetadata): void {
    this.formatMessage('debug', message, metadata);
  }

  info(message: string, metadata?: LogMetadata): void {
    this.formatMessage('info', message, metadata);
  }

  warn(message: string, metadata?: LogMetadata): void {
    this.formatMessage('warn', message, metadata);
  }

  error(message: string, error?: Error | unknown, metadata?: LogMetadata): void {
    const errorData = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : error;

    this.formatMessage('error', message, {
      error: errorData,
      ...metadata,
    });
  }

  // Performance logging
  time(label: string): void {
    if (this.isDevelopment) {
      console.time(`[${this.context}] ${label}`);
    }
  }

  timeEnd(label: string): void {
    if (this.isDevelopment) {
      console.timeEnd(`[${this.context}] ${label}`);
    }
  }
}

// Export singleton instances for common contexts
export const authLogger = new Logger('Auth');
export const apiLogger = new Logger('API');
export const uiLogger = new Logger('UI');
export const hooksLogger = new Logger('Hooks');

// Default logger
export default Logger;