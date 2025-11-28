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
exports.sanitizeString = sanitizeString;
exports.sanitizeEmail = sanitizeEmail;
exports.sanitizePhoneNumber = sanitizePhoneNumber;
exports.sanitizeNumber = sanitizeNumber;
exports.sanitizeDate = sanitizeDate;
exports.sanitizeBoolean = sanitizeBoolean;
exports.sanitizeArray = sanitizeArray;
exports.sanitizeObject = sanitizeObject;
exports.sanitizeFirestoreValue = sanitizeFirestoreValue;
exports.sanitizeFilePath = sanitizeFilePath;
const functions = __importStar(require("firebase-functions"));
const logger_1 = require("./logger");
/**
 * Input sanitization utilities to prevent injection attacks and data corruption
 */
/**
 * Sanitize string input by removing dangerous characters and normalizing whitespace
 */
function sanitizeString(input, fieldName, options) {
    const { maxLength = 1000, allowNewlines = false, allowHtml = false, trim = true } = options || {};
    if (typeof input !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', `${fieldName} must be a string`);
    }
    let sanitized = input;
    // Trim whitespace if enabled
    if (trim) {
        sanitized = sanitized.trim();
    }
    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');
    // Remove HTML tags unless explicitly allowed
    if (!allowHtml) {
        sanitized = sanitized.replace(/<[^>]*>/g, '');
    }
    // Remove or replace newlines based on configuration
    if (!allowNewlines) {
        sanitized = sanitized.replace(/[\r\n]+/g, ' ');
    }
    else {
        // Normalize newlines to Unix style
        sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    }
    // Remove control characters except tab and newline (if allowed)
    const allowedControlChars = allowNewlines ? '\n\t' : '\t';
    sanitized = sanitized.replace(new RegExp(`[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F${allowedControlChars ? `&&[^${allowedControlChars}]` : ''}]`, 'g'), '');
    // Enforce maximum length
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
        logger_1.systemLogger.warn(`String truncated for ${fieldName}`, {
            originalLength: input.length,
            maxLength,
        });
    }
    return sanitized;
}
/**
 * Sanitize email addresses
 */
function sanitizeEmail(input, fieldName = 'email') {
    if (typeof input !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', `${fieldName} must be a string`);
    }
    // Convert to lowercase and trim
    let email = input.toLowerCase().trim();
    // Remove any characters that aren't typically allowed in email addresses
    email = email.replace(/[^a-z0-9@._+-]/gi, '');
    // Basic email validation
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
    if (!emailRegex.test(email)) {
        throw new functions.https.HttpsError('invalid-argument', `Invalid ${fieldName} format`);
    }
    return email;
}
/**
 * Sanitize phone numbers
 */
function sanitizePhoneNumber(input, fieldName = 'phoneNumber') {
    if (typeof input !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', `${fieldName} must be a string`);
    }
    // Remove all non-digit characters except + at the beginning
    let phone = input.trim();
    const hasPlus = phone.startsWith('+');
    phone = phone.replace(/\D/g, '');
    if (hasPlus) {
        phone = '+' + phone;
    }
    // Check minimum and maximum length
    if (phone.length < 7 || phone.length > 20) {
        throw new functions.https.HttpsError('invalid-argument', `Invalid ${fieldName} length`);
    }
    return phone;
}
/**
 * Sanitize numeric input
 */
function sanitizeNumber(input, fieldName, options) {
    const { min = -Infinity, max = Infinity, integer = false } = options || {};
    let num;
    if (typeof input === 'number') {
        num = input;
    }
    else if (typeof input === 'string') {
        num = Number(input);
    }
    else {
        throw new functions.https.HttpsError('invalid-argument', `${fieldName} must be a number`);
    }
    if (isNaN(num) || !isFinite(num)) {
        throw new functions.https.HttpsError('invalid-argument', `${fieldName} must be a valid number`);
    }
    if (integer && !Number.isInteger(num)) {
        throw new functions.https.HttpsError('invalid-argument', `${fieldName} must be an integer`);
    }
    if (num < min || num > max) {
        throw new functions.https.HttpsError('invalid-argument', `${fieldName} must be between ${min} and ${max}`);
    }
    return num;
}
/**
 * Sanitize date input
 */
function sanitizeDate(input, fieldName) {
    if (!input) {
        throw new functions.https.HttpsError('invalid-argument', `${fieldName} is required`);
    }
    let date;
    if (input instanceof Date) {
        date = input;
    }
    else if (typeof input === 'string' || typeof input === 'number') {
        date = new Date(input);
    }
    else {
        throw new functions.https.HttpsError('invalid-argument', `${fieldName} must be a valid date`);
    }
    if (isNaN(date.getTime())) {
        throw new functions.https.HttpsError('invalid-argument', `${fieldName} is not a valid date`);
    }
    // Check for reasonable date range (1900 to 100 years from now)
    const minDate = new Date('1900-01-01');
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 100);
    if (date < minDate || date > maxDate) {
        throw new functions.https.HttpsError('invalid-argument', `${fieldName} is outside acceptable range`);
    }
    return date;
}
/**
 * Sanitize boolean input
 */
function sanitizeBoolean(input, fieldName) {
    if (typeof input === 'boolean') {
        return input;
    }
    if (typeof input === 'string') {
        const lower = input.toLowerCase();
        if (lower === 'true' || lower === '1' || lower === 'yes') {
            return true;
        }
        if (lower === 'false' || lower === '0' || lower === 'no') {
            return false;
        }
    }
    if (typeof input === 'number') {
        return input !== 0;
    }
    throw new functions.https.HttpsError('invalid-argument', `${fieldName} must be a boolean`);
}
/**
 * Sanitize array input
 */
function sanitizeArray(input, fieldName, itemSanitizer, options) {
    const { minLength = 0, maxLength = 1000, uniqueItems = false } = options || {};
    if (!Array.isArray(input)) {
        throw new functions.https.HttpsError('invalid-argument', `${fieldName} must be an array`);
    }
    if (input.length < minLength || input.length > maxLength) {
        throw new functions.https.HttpsError('invalid-argument', `${fieldName} must have between ${minLength} and ${maxLength} items`);
    }
    let sanitized;
    if (itemSanitizer) {
        sanitized = input.map((item, index) => itemSanitizer(item, index));
    }
    else {
        sanitized = input;
    }
    if (uniqueItems) {
        const uniqueSet = new Set(sanitized);
        if (uniqueSet.size !== sanitized.length) {
            throw new functions.https.HttpsError('invalid-argument', `${fieldName} must contain unique items`);
        }
    }
    return sanitized;
}
/**
 * Sanitize object/JSON input
 */
function sanitizeObject(input, fieldName, schema) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        throw new functions.https.HttpsError('invalid-argument', `${fieldName} must be an object`);
    }
    const obj = input;
    const sanitized = {};
    if (schema) {
        for (const [key, sanitizer] of Object.entries(schema)) {
            if (key in obj) {
                sanitized[key] = sanitizer(obj[key], key);
            }
        }
    }
    else {
        // If no schema provided, do basic sanitization
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                sanitized[key] = sanitizeString(value, key);
            }
            else {
                sanitized[key] = value;
            }
        }
    }
    return sanitized;
}
/**
 * Prevent NoSQL injection by sanitizing Firestore query parameters
 */
function sanitizeFirestoreValue(value) {
    // Remove any Firestore-specific operators that might be injected
    if (typeof value === 'string') {
        // Remove potential Firestore operators
        const dangerous = ['$', '__', '..'];
        for (const pattern of dangerous) {
            if (value.includes(pattern)) {
                throw new functions.https.HttpsError('invalid-argument', 'Invalid characters in query parameter');
            }
        }
    }
    // Recursively sanitize objects
    if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
            return value.map(sanitizeFirestoreValue);
        }
        else {
            const sanitized = {};
            for (const [key, val] of Object.entries(value)) {
                // Prevent prototype pollution
                if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                    logger_1.systemLogger.warn('Potential prototype pollution attempt', { key });
                    continue;
                }
                sanitized[key] = sanitizeFirestoreValue(val);
            }
            return sanitized;
        }
    }
    return value;
}
/**
 * Sanitize file path to prevent directory traversal attacks
 */
function sanitizeFilePath(path, fieldName = 'path') {
    if (typeof path !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', `${fieldName} must be a string`);
    }
    // Remove any directory traversal patterns
    let sanitized = path.replace(/\.\./g, '');
    sanitized = sanitized.replace(/\/\//g, '/');
    // Remove leading slashes to prevent absolute paths
    sanitized = sanitized.replace(/^\/+/, '');
    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');
    // Only allow alphanumeric characters, dots, hyphens, underscores, and forward slashes
    sanitized = sanitized.replace(/[^a-zA-Z0-9._/-]/g, '');
    if (sanitized.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', `Invalid ${fieldName}`);
    }
    return sanitized;
}
