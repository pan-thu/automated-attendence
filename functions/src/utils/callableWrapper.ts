import * as functions from 'firebase-functions';
import { HttpsError, CallableRequest } from 'firebase-functions/v2/https';

/**
 * Wraps a callable function handler with consistent error mapping and logging.
 * Converts uncaught errors to HttpsError to prevent "internal" error on client.
 *
 * @param handler - The async function handler to wrap
 * @param functionName - Name of the function for logging purposes
 * @returns Wrapped handler with error handling and logging
 *
 * @example
 * ```typescript
 * export const myFunction = onCall(
 *   wrapCallable(async (request: CallableRequest<MyDataType>) => {
 *     assertAdmin(request);
 *     // ... business logic
 *     return { success: true };
 *   }, 'myFunction')
 * );
 * ```
 */
export function wrapCallable<T = any, R = any>(
  handler: (request: CallableRequest<T>) => Promise<R>,
  functionName: string
) {
  return async (request: CallableRequest<T>): Promise<R> => {
    const startTime = Date.now();
    const userId = request.auth?.uid || 'unauthenticated';

    try {
      functions.logger.info(`[${functionName}] Started`, {
        userId,
        hasAuth: !!request.auth,
        hasData: !!request.data,
      });

      const result = await handler(request);

      const duration = Date.now() - startTime;
      functions.logger.info(`[${functionName}] Completed successfully`, {
        userId,
        durationMs: duration,
      });

      return result;
    } catch (err: any) {
      const duration = Date.now() - startTime;

      // Log detailed error information for debugging
      functions.logger.error(`[${functionName}] Failed`, {
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
