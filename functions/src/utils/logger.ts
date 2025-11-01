import * as functions from 'firebase-functions';

/**
 * Production-ready logger utility
 * Uses Firebase Functions logger in production, console in development
 */
export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(level: string, message: string, metadata?: unknown): string {
    return `[${this.context}] ${message}`;
  }

  info(message: string, metadata?: unknown): void {
    functions.logger.info(this.formatMessage('INFO', message), metadata);
  }

  warn(message: string, metadata?: unknown): void {
    functions.logger.warn(this.formatMessage('WARN', message), metadata);
  }

  error(message: string, error?: unknown, metadata?: unknown): void {
    const errorData = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : error;

    functions.logger.error(this.formatMessage('ERROR', message), {
      error: errorData,
      ...metadata,
    });
  }

  debug(message: string, metadata?: unknown): void {
    // Only log debug messages in development
    if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.NODE_ENV === 'development') {
      functions.logger.debug(this.formatMessage('DEBUG', message), metadata);
    }
  }

  // Log performance metrics
  metric(name: string, value: number, unit: string = 'ms', metadata?: unknown): void {
    functions.logger.info(`[METRIC] ${name}`, {
      context: this.context,
      value,
      unit,
      ...metadata,
    });
  }

  // Log audit events (always logged regardless of environment)
  audit(action: string, details: Record<string, unknown>): void {
    functions.logger.log(`[AUDIT] ${action}`, {
      context: this.context,
      timestamp: new Date().toISOString(),
      ...details,
    });
  }
}

// Export singleton instances for common contexts
export const systemLogger = new Logger('System');
export const authLogger = new Logger('Auth');
export const attendanceLogger = new Logger('Attendance');
export const penaltyLogger = new Logger('Penalty');
export const leaveLogger = new Logger('Leave');
export const notificationLogger = new Logger('Notification');