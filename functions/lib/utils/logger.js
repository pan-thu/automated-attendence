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
exports.notificationLogger = exports.leaveLogger = exports.penaltyLogger = exports.attendanceLogger = exports.authLogger = exports.systemLogger = exports.Logger = void 0;
const functions = __importStar(require("firebase-functions"));
/**
 * Production-ready logger utility
 * Uses Firebase Functions logger in production, console in development
 */
class Logger {
    constructor(context) {
        this.context = context;
    }
    formatMessage(level, message, metadata) {
        return `[${this.context}] ${message}`;
    }
    info(message, metadata) {
        functions.logger.info(this.formatMessage('INFO', message), metadata);
    }
    warn(message, metadata) {
        functions.logger.warn(this.formatMessage('WARN', message), metadata);
    }
    error(message, error, metadata) {
        const errorData = error instanceof Error
            ? { message: error.message, stack: error.stack }
            : error;
        functions.logger.error(this.formatMessage('ERROR', message), {
            error: errorData,
            ...(metadata && typeof metadata === 'object' ? metadata : {}),
        });
    }
    debug(message, metadata) {
        // Only log debug messages in development
        if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.NODE_ENV === 'development') {
            functions.logger.debug(this.formatMessage('DEBUG', message), metadata);
        }
    }
    // Log performance metrics
    metric(name, value, unit = 'ms', metadata) {
        functions.logger.info(`[METRIC] ${name}`, {
            context: this.context,
            value,
            unit,
            ...(metadata && typeof metadata === 'object' ? metadata : {}),
        });
    }
    // Log audit events (always logged regardless of environment)
    audit(action, details) {
        functions.logger.log(`[AUDIT] ${action}`, {
            context: this.context,
            timestamp: new Date().toISOString(),
            ...details,
        });
    }
}
exports.Logger = Logger;
// Export singleton instances for common contexts
exports.systemLogger = new Logger('System');
exports.authLogger = new Logger('Auth');
exports.attendanceLogger = new Logger('Attendance');
exports.penaltyLogger = new Logger('Penalty');
exports.leaveLogger = new Logger('Leave');
exports.notificationLogger = new Logger('Notification');
