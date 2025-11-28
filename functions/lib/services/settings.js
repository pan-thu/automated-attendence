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
exports.getCompanySettings = exports.updateCompanySettings = void 0;
const functions = __importStar(require("firebase-functions"));
const firestore_1 = require("firebase-admin/firestore");
const firestore_2 = require("../utils/firestore");
const SETTINGS_COLLECTION = 'COMPANY_SETTINGS';
const isPlainObject = (value) => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
};
const ensureOptionalString = (value, field) => {
    if (value === undefined) {
        return undefined;
    }
    if (typeof value !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', `${field} must be a string.`);
    }
    const trimmed = value.trim();
    if (!trimmed) {
        throw new functions.https.HttpsError('invalid-argument', `${field} cannot be empty.`);
    }
    return trimmed;
};
const ensureOptionalBoolean = (value, field) => {
    if (value === undefined) {
        return undefined;
    }
    if (typeof value !== 'boolean') {
        throw new functions.https.HttpsError('invalid-argument', `${field} must be a boolean.`);
    }
    return value;
};
const ensureOptionalNumber = (value, field, { allowZero = true, allowUndefined = true } = {}) => {
    if (value === undefined) {
        if (allowUndefined) {
            return undefined;
        }
        throw new functions.https.HttpsError('invalid-argument', `${field} is required.`);
    }
    if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
        throw new functions.https.HttpsError('invalid-argument', `${field} must be a valid number.`);
    }
    if (value < 0 || (!allowZero && value === 0)) {
        throw new functions.https.HttpsError('invalid-argument', `${field} must be greater than${allowZero ? ' or equal to' : ''} 0.`);
    }
    return value;
};
const ensureOptionalCoordinate = (value, field) => {
    if (value === undefined) {
        return undefined;
    }
    if (!isPlainObject(value)) {
        throw new functions.https.HttpsError('invalid-argument', `${field} must be an object with latitude and longitude.`);
    }
    const rawLat = value.latitude;
    const rawLng = value.longitude;
    if (typeof rawLat !== 'number' || Number.isNaN(rawLat) || !Number.isFinite(rawLat)) {
        throw new functions.https.HttpsError('invalid-argument', `${field}.latitude must be a valid number.`);
    }
    if (typeof rawLng !== 'number' || Number.isNaN(rawLng) || !Number.isFinite(rawLng)) {
        throw new functions.https.HttpsError('invalid-argument', `${field}.longitude must be a valid number.`);
    }
    if (rawLat < -90 || rawLat > 90) {
        throw new functions.https.HttpsError('invalid-argument', `${field}.latitude must be between -90 and 90.`);
    }
    if (rawLng < -180 || rawLng > 180) {
        throw new functions.https.HttpsError('invalid-argument', `${field}.longitude must be between -180 and 180.`);
    }
    return { latitude: rawLat, longitude: rawLng };
};
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const sanitizeTimeWindows = (value, field) => {
    if (value === undefined) {
        return undefined;
    }
    if (!isPlainObject(value)) {
        throw new functions.https.HttpsError('invalid-argument', `${field} must be an object.`);
    }
    const sanitized = {};
    for (const [key, windowValue] of Object.entries(value)) {
        if (!isPlainObject(windowValue)) {
            throw new functions.https.HttpsError('invalid-argument', `${field}.${key} must be an object.`);
        }
        const label = ensureOptionalString(windowValue.label, `${field}.${key}.label`);
        const start = ensureOptionalString(windowValue.start, `${field}.${key}.start`);
        const end = ensureOptionalString(windowValue.end, `${field}.${key}.end`);
        if (!label || !start || !end) {
            throw new functions.https.HttpsError('invalid-argument', `${field}.${key} must include label, start, and end.`);
        }
        if (!timePattern.test(start)) {
            throw new functions.https.HttpsError('invalid-argument', `${field}.${key}.start must be in HH:MM format.`);
        }
        if (!timePattern.test(end)) {
            throw new functions.https.HttpsError('invalid-argument', `${field}.${key}.end must be in HH:MM format.`);
        }
        sanitized[key] = { label, start, end };
    }
    return sanitized;
};
const sanitizeNumberRecord = (value, field) => {
    if (value === undefined) {
        return undefined;
    }
    if (!isPlainObject(value)) {
        throw new functions.https.HttpsError('invalid-argument', `${field} must be an object.`);
    }
    const sanitized = {};
    for (const [key, raw] of Object.entries(value)) {
        const numeric = ensureOptionalNumber(raw, `${field}.${key}`, {
            allowZero: true,
            allowUndefined: false,
        });
        if (numeric === undefined) {
            throw new functions.https.HttpsError('invalid-argument', `${field}.${key} must be a number.`);
        }
        sanitized[key] = numeric;
    }
    return sanitized;
};
const sanitizeBooleanRecord = (value, field) => {
    if (value === undefined) {
        return undefined;
    }
    if (!isPlainObject(value)) {
        throw new functions.https.HttpsError('invalid-argument', `${field} must be an object.`);
    }
    const sanitized = {};
    for (const [key, raw] of Object.entries(value)) {
        if (typeof raw !== 'boolean') {
            throw new functions.https.HttpsError('invalid-argument', `${field}.${key} must be a boolean.`);
        }
        sanitized[key] = raw;
    }
    return sanitized;
};
const sanitizePenaltyRules = (value, field) => {
    if (value === undefined) {
        return undefined;
    }
    if (!isPlainObject(value)) {
        throw new functions.https.HttpsError('invalid-argument', `${field} must be an object.`);
    }
    const violationThresholds = sanitizeNumberRecord(value.violationThresholds, `${field}.violationThresholds`);
    if (!violationThresholds || Object.keys(violationThresholds).length === 0) {
        throw new functions.https.HttpsError('invalid-argument', `${field}.violationThresholds must include at least one entry.`);
    }
    const amounts = sanitizeNumberRecord(value.amounts, `${field}.amounts`);
    if (!amounts || Object.keys(amounts).length === 0) {
        throw new functions.https.HttpsError('invalid-argument', `${field}.amounts must include at least one entry.`);
    }
    return {
        violationThresholds,
        amounts,
    };
};
const sanitizeHolidays = (value, field) => {
    if (value === undefined) {
        return undefined;
    }
    if (!Array.isArray(value)) {
        throw new functions.https.HttpsError('invalid-argument', `${field} must be an array of strings.`);
    }
    return value.map((item, index) => {
        const result = ensureOptionalString(item, `${field}[${index}]`);
        if (!result) {
            throw new functions.https.HttpsError('invalid-argument', `${field}[${index}] cannot be empty.`);
        }
        return result;
    });
};
const sanitizeCompanySettingsInput = (input) => {
    const sanitized = {};
    const companyName = ensureOptionalString(input.companyName, 'companyName');
    if (companyName !== undefined) {
        sanitized.companyName = companyName;
    }
    const timezone = ensureOptionalString(input.timezone, 'timezone');
    if (timezone !== undefined) {
        sanitized.timezone = timezone;
    }
    const workplaceCenter = ensureOptionalCoordinate(input.workplace_center, 'workplace_center');
    if (workplaceCenter) {
        sanitized.workplace_center = workplaceCenter;
    }
    const workplaceRadius = ensureOptionalNumber(input.workplace_radius, 'workplace_radius', {
        allowZero: false,
    });
    if (workplaceRadius !== undefined) {
        sanitized.workplace_radius = workplaceRadius;
    }
    const workplaceAddress = ensureOptionalString(input.workplaceAddress, 'workplaceAddress');
    if (workplaceAddress !== undefined) {
        sanitized.workplaceAddress = workplaceAddress;
    }
    const timeWindows = sanitizeTimeWindows(input.timeWindows, 'timeWindows');
    if (timeWindows) {
        sanitized.timeWindows = timeWindows;
    }
    const gracePeriods = sanitizeNumberRecord(input.gracePeriods, 'gracePeriods');
    if (gracePeriods) {
        sanitized.gracePeriods = gracePeriods;
    }
    const penaltyRules = sanitizePenaltyRules(input.penaltyRules, 'penaltyRules');
    if (penaltyRules) {
        sanitized.penaltyRules = penaltyRules;
    }
    const leavePolicy = sanitizeNumberRecord(input.leavePolicy, 'leavePolicy');
    if (leavePolicy) {
        sanitized.leavePolicy = leavePolicy;
    }
    const workingDays = sanitizeBooleanRecord(input.workingDays, 'workingDays');
    if (workingDays) {
        sanitized.workingDays = workingDays;
    }
    const holidays = sanitizeHolidays(input.holidays, 'holidays');
    if (holidays) {
        sanitized.holidays = holidays;
    }
    const geoFencingEnabled = ensureOptionalBoolean(input.geoFencingEnabled, 'geoFencingEnabled');
    if (geoFencingEnabled !== undefined) {
        sanitized.geoFencingEnabled = geoFencingEnabled;
    }
    const maxAttachmentSize = ensureOptionalNumber(input.maxLeaveAttachmentSizeMb, 'maxLeaveAttachmentSizeMb', {
        allowZero: false,
    });
    if (maxAttachmentSize !== undefined) {
        sanitized.maxLeaveAttachmentSizeMb = maxAttachmentSize;
    }
    if (input.allowedLeaveAttachmentTypes !== undefined) {
        if (!Array.isArray(input.allowedLeaveAttachmentTypes)) {
            throw new functions.https.HttpsError('invalid-argument', 'allowedLeaveAttachmentTypes must be an array.');
        }
        const sanitizedTypes = input.allowedLeaveAttachmentTypes.map((entry, index) => {
            const value = ensureOptionalString(entry, `allowedLeaveAttachmentTypes[${index}]`);
            return value?.toLowerCase();
        }).filter((entry) => typeof entry === 'string' && entry.length > 0);
        sanitized.allowedLeaveAttachmentTypes = sanitizedTypes;
    }
    if (input.leaveAttachmentRequiredTypes !== undefined) {
        if (!Array.isArray(input.leaveAttachmentRequiredTypes)) {
            throw new functions.https.HttpsError('invalid-argument', 'leaveAttachmentRequiredTypes must be an array.');
        }
        const sanitizedRequiredTypes = input.leaveAttachmentRequiredTypes
            .map((entry, index) => {
            const value = ensureOptionalString(entry, `leaveAttachmentRequiredTypes[${index}]`);
            return value?.toLowerCase();
        })
            .filter((entry) => typeof entry === 'string' && entry.length > 0);
        sanitized.leaveAttachmentRequiredTypes = sanitizedRequiredTypes;
    }
    return sanitized;
};
const updateCompanySettings = async (input, updatedBy) => {
    const sanitized = sanitizeCompanySettingsInput(input);
    const payload = {
        ...sanitized,
        updatedBy,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    if (sanitized.workplace_center) {
        const center = sanitized.workplace_center;
        payload.workplace_center = new firestore_1.GeoPoint(center.latitude, center.longitude);
    }
    await firestore_2.firestore.collection(SETTINGS_COLLECTION).doc('main').set(payload, { merge: true });
};
exports.updateCompanySettings = updateCompanySettings;
const getCompanySettings = async () => {
    const snapshot = await firestore_2.firestore.collection(SETTINGS_COLLECTION).doc('main').get();
    if (!snapshot.exists) {
        return {};
    }
    return snapshot.data();
};
exports.getCompanySettings = getCompanySettings;
