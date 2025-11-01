import * as functions from 'firebase-functions';
import { HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { RateLimiter, RATE_LIMITS } from './rateLimiter';
import { systemLogger } from './logger';

/**
 * Options for configuring the callable wrapper
 */
interface WrapCallableOptions {
  /** Rate limit configuration. Pass false to disable rate limiting */
  rateLimit?: typeof RATE_LIMITS[keyof typeof RATE_LIMITS] | false;
}

/**
 * Wraps a callable function handler with consistent error mapping, logging, and rate limiting.
 * Converts uncaught errors to HttpsError to prevent "internal" error on client.
 *
 * @param handler - The async function handler to wrap
 * @param functionName - Name of the function for logging purposes
 * @param options - Optional configuration for rate limiting and other features
 * @returns Wrapped handler with error handling, logging, and rate limiting
 *
 * @example
 * ```typescript
 * export const myFunction = onCall(
 *   wrapCallable(async (request: CallableRequest<MyDataType>) => {
 *     assertAdmin(request);
 *     // ... business logic
 *     return { success: true };
 *   }, 'myFunction', { rateLimit: RATE_LIMITS.WRITE })
 * );
 * ```
 */
export function wrapCallable<T = any, R = any>(
  handler: (request: CallableRequest<T>) => Promise<R>,
  functionName: string,
  options?: WrapCallableOptions
) {
  return async (request: CallableRequest<T>): Promise<R> => {
    const startTime = Date.now();
    const userId = request.auth?.uid || 'unauthenticated';

    try {
      // Apply rate limiting if configured
      if (options?.rateLimit !== false) {
        const rateLimitConfig = options?.rateLimit || RATE_LIMITS.READ; // Default to READ limit
        const limiter = new RateLimiter(functionName, rateLimitConfig);
        await limiter.checkLimit(request);
      }

      systemLogger.info(`[${functionName}] Started`, {
        userId,
        hasAuth: !!request.auth,
        hasData: !!request.data,
      });

      const result = await handler(request);

      const duration = Date.now() - startTime;
      systemLogger.info(`[${functionName}] Completed successfully`, {
        userId,
        durationMs: duration,
      });

      return result;
    } catch (err: any) {
      const duration = Date.now() - startTime;

      // Log detailed error information for debugging
      systemLogger.error(`[${functionName}] Failed`, err, {
        userId,
        durationMs: duration,
        errorMessage: err?.message,
        errorCode: err?.code,
        errorStack: err?.stack,
        errorDetails: err?.details,
      });

      // If it's already an HttpsError (2nd gen), rethrow as-is
      if (err instanceof HttpsError) {
        throw err;
      }

      // If it's a 1st-gen HttpsError with code and message, convert to 2nd gen
      if (err?.code && typeof err.code === 'string' && err?.message) {
        // Map common error codes to 2nd-gen equivalents
        const validCodes = [
          'ok', 'cancelled', 'unknown', 'invalid-argument', 'deadline-exceeded',
          'not-found', 'already-exists', 'permission-denied', 'resource-exhausted',
          'failed-precondition', 'aborted', 'out-of-range', 'unimplemented',
          'internal', 'unavailable', 'data-loss', 'unauthenticated'
        ];

        const errorCode = validCodes.includes(err.code) ? err.code : 'internal';

        throw new HttpsError(
          errorCode as any,
          err.message,
          err.details
        );
      }

      // Convert unknown errors to structured HttpsError
      throw new HttpsError(
        'internal',
        'An unexpected error occurred. Please check server logs or contact support.',
        {
          functionName,
          timestamp: new Date().toISOString(),
          errorType: err?.constructor?.name || 'Unknown',
        }
      );
    }
  };
}
