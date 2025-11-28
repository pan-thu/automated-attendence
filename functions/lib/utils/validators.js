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
exports.assertGeoPoint = exports.assertLongitude = exports.assertLatitude = exports.assertNumber = exports.assertTimestampRange = exports.assertTimestamp = exports.assertEnum = exports.assertArray = exports.assertBoolean = exports.assertEmail = exports.assertString = exports.assertPayload = void 0;
const functions = __importStar(require("firebase-functions"));
const firestore_1 = require("firebase-admin/firestore");
const firebase_1 = require("../firebase");
const assertPayload = (payload, message = 'Invalid payload.') => {
    if (!payload || typeof payload !== 'object') {
        throw new functions.https.HttpsError('invalid-argument', message);
    }
    return payload;
};
exports.assertPayload = assertPayload;
const assertString = (value, field, options) => {
    if (value == null) {
        if (options?.optional) {
            return '';
        }
        throw new functions.https.HttpsError('invalid-argument', `${field} is required.`);
    }
    if (typeof value !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', `${field} must be a string.`);
    }
    const trimmed = value.trim();
    if (options?.min !== undefined && trimmed.length < options.min) {
        throw new functions.https.HttpsError('invalid-argument', `${field} must be at least ${options.min} characters.`);
    }
    if (options?.max !== undefined && trimmed.length > options.max) {
        throw new functions.https.HttpsError('invalid-argument', `${field} must be at most ${options.max} characters.`);
    }
    if (options?.pattern && !options.pattern.test(trimmed)) {
        throw new functions.https.HttpsError('invalid-argument', `${field} is invalid.`);
    }
    return trimmed;
};
exports.assertString = assertString;
/**
 * Validate and normalize email address to lowercase.
 * Bug Fix #21: Email addresses must be normalized to prevent case-sensitivity issues.
 */
const assertEmail = (value, field = 'email') => {
    const email = (0, exports.assertString)(value, field, {
        min: 5,
        max: 254,
        pattern: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    });
    // Normalize to lowercase
    return email.toLowerCase();
};
exports.assertEmail = assertEmail;
const assertBoolean = (value, field) => {
    if (typeof value !== 'boolean') {
        throw new functions.https.HttpsError('invalid-argument', `${field} must be a boolean.`);
    }
    return value;
};
exports.assertBoolean = assertBoolean;
const assertArray = (value, field) => {
    if (!Array.isArray(value)) {
        throw new functions.https.HttpsError('invalid-argument', `${field} must be an array.`);
    }
    return value;
};
exports.assertArray = assertArray;
const assertEnum = (value, field, allowed) => {
    if (typeof value !== 'string' || !allowed.includes(value)) {
        throw new functions.https.HttpsError('invalid-argument', `${field} must be one of: ${allowed.join(', ')}.`);
    }
    return value;
};
exports.assertEnum = assertEnum;
/**
 * Validate single Firestore Timestamp with null safety.
 * Bug Fix #2: Handle null/undefined before accessing Timestamp methods.
 */
const assertTimestamp = (value, field) => {
    if (value === null || value === undefined) {
        throw new functions.https.HttpsError('invalid-argument', `${field} is required.`);
    }
    if (!(value instanceof firestore_1.Timestamp)) {
        throw new functions.https.HttpsError('invalid-argument', `${field} must be a Firestore Timestamp.`);
    }
    return value;
};
exports.assertTimestamp = assertTimestamp;
/**
 * Validate Timestamp range with null safety.
 * Bug Fix #2: Handle null/undefined before accessing .toMillis().
 */
const assertTimestampRange = (start, end, field) => {
    // Null safety checks before type checks
    if (start === null || start === undefined) {
        throw new functions.https.HttpsError('invalid-argument', `${field} startDate is required.`);
    }
    if (end === null || end === undefined) {
        throw new functions.https.HttpsError('invalid-argument', `${field} endDate is required.`);
    }
    if (!(start instanceof firestore_1.Timestamp) || !(end instanceof firestore_1.Timestamp)) {
        throw new functions.https.HttpsError('invalid-argument', `${field} must contain Firestore Timestamps.`);
    }
    // Safe to call .toMillis() now
    if (start.toMillis() >= end.toMillis()) {
        throw new functions.https.HttpsError('invalid-argument', `${field} start must be before end.`);
    }
    return { startDate: start, endDate: end };
};
exports.assertTimestampRange = assertTimestampRange;
/**
 * Validate number with optional range.
 * Bug Fix #2: Comprehensive null safety for numeric validation.
 */
const assertNumber = (value, field, min, max) => {
    if (value === null || value === undefined) {
        throw new functions.https.HttpsError('invalid-argument', `${field} is required.`);
    }
    const num = Number(value);
    if (isNaN(num)) {
        throw new functions.https.HttpsError('invalid-argument', `${field} must be a valid number.`);
    }
    if (min !== undefined && num < min) {
        throw new functions.https.HttpsError('invalid-argument', `${field} must be at least ${min}.`);
    }
    if (max !== undefined && num > max) {
        throw new functions.https.HttpsError('invalid-argument', `${field} must be at most ${max}.`);
    }
    return num;
};
exports.assertNumber = assertNumber;
/**
 * Validate latitude coordinate.
 * Bug Fix #12: Validate latitude range (-90 to 90).
 */
const assertLatitude = (value, field = 'latitude') => {
    return (0, exports.assertNumber)(value, field, -90, 90);
};
exports.assertLatitude = assertLatitude;
/**
 * Validate longitude coordinate.
 * Bug Fix #12: Validate longitude range (-180 to 180).
 */
const assertLongitude = (value, field = 'longitude') => {
    return (0, exports.assertNumber)(value, field, -180, 180);
};
exports.assertLongitude = assertLongitude;
/**
 * Validate and create GeoPoint from coordinates.
 * Bug Fix #12: Comprehensive coordinate validation.
 */
const assertGeoPoint = (lat, lon) => {
    const validLat = (0, exports.assertLatitude)(lat);
    const validLon = (0, exports.assertLongitude)(lon);
    return new firebase_1.admin.firestore.GeoPoint(validLat, validLon);
};
exports.assertGeoPoint = assertGeoPoint;
