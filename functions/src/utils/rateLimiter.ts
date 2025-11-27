import * as functions from 'firebase-functions';
import { CallableRequest } from 'firebase-functions/v2/https';
import { firestore } from './firestore';
import { systemLogger } from './logger';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (request: CallableRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
}

interface RateLimitEntry {
  count: number;
  firstRequest: number;
  lastRequest: number;
  uid?: string;
}

const RATE_LIMIT_COLLECTION = 'RATE_LIMITS';

/**
 * Default rate limit configurations for different function types
 */
export const RATE_LIMITS = {
  // Strict limits for sensitive operations
  AUTH: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many authentication attempts. Please try again later.',
  },
  // Moderate limits for data modification
  WRITE: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many requests. Please slow down.',
  },
  // Relaxed limits for read operations
  READ: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many requests. Please try again in a moment.',
  },
  // Very strict limits for expensive operations
  EXPENSIVE: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'This operation is resource-intensive. Please wait before trying again.',
  },
  // Clock-in specific limit
  CLOCK_IN: {
    maxRequests: 10,
    windowMs: 5 * 60 * 1000, // 5 minutes
    message: 'Too many clock-in attempts. Please wait a few minutes.',
  },
};

/**
 * Rate limiter middleware for Cloud Functions
 * Stores rate limit data in Firestore for distributed enforcement
 */
export class RateLimiter {
  private config: RateLimitConfig;
  private functionName: string;

  constructor(functionName: string, config: RateLimitConfig) {
    this.functionName = functionName;
    this.config = {
      message: 'Too many requests. Please try again later.',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config,
    };
  }

  /**
   * Generate a unique key for rate limiting
   */
  private generateKey(request: CallableRequest): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(request);
    }

    // Default: Use authenticated user ID or IP address
    const uid = request.auth?.uid;
    const ip = request.rawRequest.ip || request.rawRequest.headers['x-forwarded-for'];

    const identifier = uid || ip || 'anonymous';
    return `${this.functionName}:${identifier}`;
  }

  /**
   * Check if request should be rate limited
   */
  async checkLimit(request: CallableRequest): Promise<void> {
    const key = this.generateKey(request);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    const docRef = firestore.collection(RATE_LIMIT_COLLECTION).doc(key);

    try {
      const result = await firestore.runTransaction(async (transaction) => {
        const doc = await transaction.get(docRef);
        const data = doc.exists ? (doc.data() as RateLimitEntry) : null;

        // Clean up old entries or create new one
        if (!data || data.firstRequest < windowStart) {
          const newEntry: RateLimitEntry = {
            count: 1,
            firstRequest: now,
            lastRequest: now,
            uid: request.auth?.uid,
          };
          transaction.set(docRef, newEntry);
          return { allowed: true, count: 1 };
        }

        // Check if limit exceeded
        if (data.count >= this.config.maxRequests) {
          const resetTime = data.firstRequest + this.config.windowMs;
          const waitTime = Math.ceil((resetTime - now) / 1000);

          systemLogger.warn('Rate limit exceeded', {
            key,
            count: data.count,
            maxRequests: this.config.maxRequests,
            waitTime,
            functionName: this.functionName,
          });

          return {
            allowed: false,
            count: data.count,
            resetTime,
            waitTime,
          };
        }

        // Increment counter
        const updatedEntry: RateLimitEntry = {
          ...data,
          count: data.count + 1,
          lastRequest: now,
        };
        transaction.update(docRef, updatedEntry as { [x: string]: any });

        return { allowed: true, count: data.count + 1 };
      });

      if (!result.allowed) {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          `${this.config.message} Please wait ${result.waitTime} seconds before trying again.`,
          {
            retryAfter: result.resetTime,
            waitTime: result.waitTime,
          }
        );
      }

      // Log rate limit usage in debug mode
      systemLogger.debug('Rate limit check passed', {
        key,
        count: result.count,
        maxRequests: this.config.maxRequests,
        functionName: this.functionName,
      });
    } catch (error) {
      // If it's already a rate limit error, rethrow it
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      // Log error but don't block the request
      systemLogger.error('Rate limiter error', error, {
        key,
        functionName: this.functionName,
      });

      // In case of rate limiter failure, allow the request
      // (fail open rather than fail closed for availability)
    }
  }

  /**
   * Clean up expired rate limit entries (run periodically)
   */
  static async cleanup(): Promise<number> {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours

    const snapshot = await firestore
      .collection(RATE_LIMIT_COLLECTION)
      .where('lastRequest', '<', cutoff)
      .get();

    const batch = firestore.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    if (snapshot.size > 0) {
      await batch.commit();
      systemLogger.info('Rate limit cleanup completed', {
        deletedCount: snapshot.size,
      });
    }

    return snapshot.size;
  }
}

/**
 * Create a rate-limited wrapper for a Cloud Function
 */
export function withRateLimit<T extends Record<string, unknown>>(
  functionName: string,
  config: RateLimitConfig,
  handler: (request: CallableRequest<T>) => Promise<unknown>
) {
  return async (request: CallableRequest<T>) => {
    const limiter = new RateLimiter(functionName, config);

    // Check rate limit before executing handler
    await limiter.checkLimit(request);

    // Execute the actual function
    return handler(request);
  };
}