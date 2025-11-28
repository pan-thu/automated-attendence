"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = exports.RATE_LIMITS = void 0;
exports.withRateLimit = withRateLimit;
const functions = __importStar(require("firebase-functions"));
const firestore_1 = require("./firestore");
const logger_1 = require("./logger");
const RATE_LIMIT_COLLECTION = 'RATE_LIMITS';
/**
 * Default rate limit configurations for different function types
 */
exports.RATE_LIMITS = {
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
class RateLimiter {
    constructor(functionName, config) {
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
    generateKey(request) {
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
    async checkLimit(request) {
        const key = this.generateKey(request);
        const now = Date.now();
        const windowStart = now - this.config.windowMs;
        const docRef = firestore_1.firestore.collection(RATE_LIMIT_COLLECTION).doc(key);
        try {
            const result = await firestore_1.firestore.runTransaction(async (transaction) => {
                const doc = await transaction.get(docRef);
                const data = doc.exists ? doc.data() : null;
                // Clean up old entries or create new one
                if (!data || data.firstRequest < windowStart) {
                    const newEntry = {
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
                    logger_1.systemLogger.warn('Rate limit exceeded', {
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
                const updatedEntry = {
                    ...data,
                    count: data.count + 1,
                    lastRequest: now,
                };
                transaction.update(docRef, updatedEntry);
                return { allowed: true, count: data.count + 1 };
            });
            if (!result.allowed) {
                throw new functions.https.HttpsError('resource-exhausted', `${this.config.message} Please wait ${result.waitTime} seconds before trying again.`, {
                    retryAfter: result.resetTime,
                    waitTime: result.waitTime,
                });
            }
            // Log rate limit usage in debug mode
            logger_1.systemLogger.debug('Rate limit check passed', {
                key,
                count: result.count,
                maxRequests: this.config.maxRequests,
                functionName: this.functionName,
            });
        }
        catch (error) {
            // If it's already a rate limit error, rethrow it
            if (error instanceof functions.https.HttpsError) {
                throw error;
            }
            // Log error but don't block the request
            logger_1.systemLogger.error('Rate limiter error', error, {
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
    static async cleanup() {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
        const snapshot = await firestore_1.firestore
            .collection(RATE_LIMIT_COLLECTION)
            .where('lastRequest', '<', cutoff)
            .get();
        const batch = firestore_1.firestore.batch();
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        if (snapshot.size > 0) {
            await batch.commit();
            logger_1.systemLogger.info('Rate limit cleanup completed', {
                deletedCount: snapshot.size,
            });
        }
        return snapshot.size;
    }
}
exports.RateLimiter = RateLimiter;
/**
 * Create a rate-limited wrapper for a Cloud Function
 */
function withRateLimit(functionName, config, handler) {
    return async (request) => {
        const limiter = new RateLimiter(functionName, config);
        // Check rate limit before executing handler
        await limiter.checkLimit(request);
        // Execute the actual function
        return handler(request);
    };
}
