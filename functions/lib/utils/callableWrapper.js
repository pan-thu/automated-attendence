"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapCallable = wrapCallable;
const https_1 = require("firebase-functions/v2/https");
const rateLimiter_1 = require("./rateLimiter");
const logger_1 = require("./logger");
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
function wrapCallable(handler, functionName, options) {
    return async (request) => {
        const startTime = Date.now();
        const userId = request.auth?.uid || 'unauthenticated';
        try {
            // Apply rate limiting if configured
            if (options?.rateLimit !== false) {
                const rateLimitConfig = options?.rateLimit || rateLimiter_1.RATE_LIMITS.READ; // Default to READ limit
                const limiter = new rateLimiter_1.RateLimiter(functionName, rateLimitConfig);
                await limiter.checkLimit(request);
            }
            logger_1.systemLogger.info(`[${functionName}] Started`, {
                userId,
                hasAuth: !!request.auth,
                hasData: !!request.data,
            });
            const result = await handler(request);
            const duration = Date.now() - startTime;
            logger_1.systemLogger.info(`[${functionName}] Completed successfully`, {
                userId,
                durationMs: duration,
            });
            return result;
        }
        catch (err) {
            const duration = Date.now() - startTime;
            // Log detailed error information for debugging
            logger_1.systemLogger.error(`[${functionName}] Failed`, err, {
                userId,
                durationMs: duration,
                errorMessage: err?.message,
                errorCode: err?.code,
                errorStack: err?.stack,
                errorDetails: err?.details,
            });
            // If it's already an HttpsError (2nd gen), rethrow as-is
            if (err instanceof https_1.HttpsError) {
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
                throw new https_1.HttpsError(errorCode, err.message, err.details);
            }
            // Convert unknown errors to structured HttpsError
            throw new https_1.HttpsError('internal', 'An unexpected error occurred. Please check server logs or contact support.', {
                functionName,
                timestamp: new Date().toISOString(),
                errorType: err?.constructor?.name || 'Unknown',
            });
        }
    };
}
