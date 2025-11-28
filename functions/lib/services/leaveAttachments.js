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
exports.attachAttachmentToLeave = exports.getLeaveAttachmentDownloadUrl = exports.assertAttachmentReady = exports.assertAttachmentOwnedByUser = exports.getAttachmentById = exports.registerLeaveAttachment = exports.generateLeaveAttachmentUploadUrl = void 0;
const functions = __importStar(require("firebase-functions"));
const firestore_1 = require("firebase-admin/firestore");
const firebase_1 = require("../firebase");
const firestore_2 = require("../utils/firestore");
const settings_1 = require("./settings");
const logger_1 = require("../utils/logger");
const ATTACHMENTS_COLLECTION = 'LEAVE_ATTACHMENTS';
const DEFAULT_ALLOWED_ATTACHMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const DEFAULT_ATTACHMENT_SIZE_MB = 5;
const SIGNED_URL_TTL_SECONDS = 5 * 60; // 5 minutes
const ATTACHMENT_REGISTRATION_WINDOW_MINUTES = 15;
const attachmentsCollection = firestore_2.firestore.collection(ATTACHMENTS_COLLECTION);
const sanitizeFileName = (fileName) => {
    const stripped = fileName.split(/[\\/]/).pop() ?? 'attachment';
    const safe = stripped.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_{2,}/g, '_');
    const trimmed = safe.length > 0 ? safe : 'attachment';
    return trimmed.length > 120 ? trimmed.slice(-120) : trimmed;
};
const resolveAllowedTypes = (raw) => {
    const list = (raw ?? []).map((entry) => entry.toLowerCase()).filter((entry) => entry.length > 0);
    return list.length > 0 ? list : DEFAULT_ALLOWED_ATTACHMENT_TYPES;
};
const resolveMaxSizeConfig = (value) => {
    const maxMb = typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : DEFAULT_ATTACHMENT_SIZE_MB;
    return { maxBytes: maxMb * 1024 * 1024, maxMb };
};
const assertPositiveInteger = (value, field) => {
    if (value === undefined || value === null) {
        throw new functions.https.HttpsError('invalid-argument', `${field} is required.`);
    }
    if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value) || value <= 0) {
        throw new functions.https.HttpsError('invalid-argument', `${field} must be a positive number.`);
    }
    return Math.floor(value);
};
const normalizeMimeType = (mimeType) => {
    const normalized = mimeType.toLowerCase().trim();
    if (!normalized) {
        throw new functions.https.HttpsError('invalid-argument', 'mimeType cannot be empty.');
    }
    return normalized;
};
const ensureAllowedMimeType = (mimeType, allowed) => {
    const normalized = normalizeMimeType(mimeType);
    const shortType = normalized.split(';')[0];
    if (!allowed.includes(normalized) && !allowed.includes(shortType)) {
        throw new functions.https.HttpsError('failed-precondition', 'Attachment type is not allowed.');
    }
};
const buildStoragePath = (userId, attachmentId, sanitizedFileName) => {
    return `leave-attachments/${userId}/${attachmentId}_${sanitizedFileName}`;
};
/**
 * Validate file magic bytes to ensure file integrity and prevent file type spoofing.
 * Bug Fix #22: Enhanced attachment security with content validation.
 */
const validateFileMagicBytes = (buffer, contentType) => {
    if (buffer.length < 4) {
        return false;
    }
    const magicBytes = buffer.slice(0, 4);
    switch (contentType.toLowerCase().split(';')[0]) {
        case 'application/pdf':
            return magicBytes.toString('utf8', 0, 4) === '%PDF';
        case 'image/jpeg':
            return magicBytes[0] === 0xFF && magicBytes[1] === 0xD8;
        case 'image/png':
            return magicBytes[0] === 0x89 && magicBytes[1] === 0x50 && magicBytes[2] === 0x4E && magicBytes[3] === 0x47;
        default:
            // Unknown type - allow but log warning
            logger_1.leaveLogger.warn(`Unknown content type for magic byte validation: ${contentType}`);
            return true;
    }
};
const generateLeaveAttachmentUploadUrl = async (input) => {
    const { userId, fileName, mimeType, sizeBytes } = input;
    const expectedSize = assertPositiveInteger(sizeBytes, 'sizeBytes');
    const settings = await (0, settings_1.getCompanySettings)();
    const allowedTypes = resolveAllowedTypes(settings.allowedLeaveAttachmentTypes);
    const { maxBytes, maxMb } = resolveMaxSizeConfig(settings.maxLeaveAttachmentSizeMb);
    const normalizedMime = normalizeMimeType(mimeType);
    ensureAllowedMimeType(normalizedMime, allowedTypes);
    if (expectedSize > maxBytes) {
        throw new functions.https.HttpsError('failed-precondition', `Attachment exceeds the maximum size of ${maxMb}MB.`);
    }
    const sanitizedFileName = sanitizeFileName(fileName);
    const attachmentRef = attachmentsCollection.doc();
    const storagePath = buildStoragePath(userId, attachmentRef.id, sanitizedFileName);
    const bucket = firebase_1.admin.storage().bucket();
    const file = bucket.file(storagePath);
    const uploadUrlExpiry = Date.now() + SIGNED_URL_TTL_SECONDS * 1000;
    const [uploadUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: uploadUrlExpiry,
        contentType: normalizedMime,
    });
    const expiresAt = firestore_1.Timestamp.fromDate(new Date(Date.now() + ATTACHMENT_REGISTRATION_WINDOW_MINUTES * 60 * 1000));
    await attachmentRef.set({
        userId,
        status: 'pending',
        storagePath,
        bucket: bucket.name,
        fileName: sanitizedFileName,
        originalFileName: fileName,
        mimeType: normalizedMime,
        expectedSizeBytes: expectedSize,
        sizeBytes: null,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        uploadUrlExpiresAt: firestore_1.Timestamp.fromMillis(uploadUrlExpiry),
        expiresAt,
    });
    return {
        attachmentId: attachmentRef.id,
        uploadUrl,
        uploadHeaders: {
            'Content-Type': normalizedMime,
        },
        uploadUrlExpiresAt: new Date(uploadUrlExpiry).toISOString(),
    };
};
exports.generateLeaveAttachmentUploadUrl = generateLeaveAttachmentUploadUrl;
const registerLeaveAttachment = async (input) => {
    const { userId, attachmentId } = input;
    const attachment = await (0, exports.getAttachmentById)(attachmentId);
    if (attachment.userId !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'Attachment does not belong to this user.');
    }
    if (attachment.status !== 'pending') {
        throw new functions.https.HttpsError('failed-precondition', 'Attachment is already finalized.');
    }
    if (attachment.uploadUrlExpiresAt && attachment.uploadUrlExpiresAt.toMillis() < Date.now()) {
        await attachmentsCollection.doc(attachmentId).update({
            status: 'expired',
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        throw new functions.https.HttpsError('deadline-exceeded', 'Upload URL expired. Please request a new one.');
    }
    if (attachment.expiresAt && attachment.expiresAt.toMillis() < Date.now()) {
        await attachmentsCollection.doc(attachmentId).update({
            status: 'expired',
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        throw new functions.https.HttpsError('deadline-exceeded', 'Attachment registration window has expired.');
    }
    const bucketName = attachment.bucket ?? firebase_1.admin.storage().bucket().name;
    const bucket = firebase_1.admin.storage().bucket(bucketName);
    const file = bucket.file(attachment.storagePath);
    const [exists] = await file.exists();
    if (!exists) {
        throw new functions.https.HttpsError('not-found', 'Uploaded attachment not found.');
    }
    const [metadata] = await file.getMetadata();
    const actualSize = Number(metadata.size ?? 0);
    if (!Number.isFinite(actualSize) || actualSize <= 0) {
        throw new functions.https.HttpsError('failed-precondition', 'Attachment size could not be determined.');
    }
    const contentType = metadata.contentType ?? attachment.mimeType;
    const settings = await (0, settings_1.getCompanySettings)();
    const allowedTypes = resolveAllowedTypes(settings.allowedLeaveAttachmentTypes);
    const { maxBytes, maxMb } = resolveMaxSizeConfig(settings.maxLeaveAttachmentSizeMb);
    ensureAllowedMimeType(contentType, allowedTypes);
    if (actualSize > maxBytes) {
        throw new functions.https.HttpsError('failed-precondition', `Attachment exceeds the configured maximum size of ${maxMb}MB.`);
    }
    if (attachment.expectedSizeBytes && Math.abs(actualSize - attachment.expectedSizeBytes) > Math.max(1024, attachment.expectedSizeBytes * 0.1)) {
        throw new functions.https.HttpsError('failed-precondition', 'Uploaded attachment size differs from the declared size.');
    }
    // Bug Fix #22: Validate file magic bytes to prevent file type spoofing
    try {
        const [buffer] = await file.download({ start: 0, end: 4 });
        const isValidFile = validateFileMagicBytes(buffer, contentType);
        if (!isValidFile) {
            // Delete invalid file
            await file.delete().catch((err) => logger_1.leaveLogger.error('Failed to delete invalid file:', err));
            await attachmentsCollection.doc(attachmentId).delete().catch((err) => logger_1.leaveLogger.error('Failed to delete attachment record:', err));
            throw new functions.https.HttpsError('failed-precondition', 'File appears to be corrupted or invalid. The file content does not match the declared type.');
        }
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        logger_1.leaveLogger.error('Magic byte validation error:', error);
        throw new functions.https.HttpsError('internal', 'Failed to validate file content.');
    }
    const docRef = attachmentsCollection.doc(attachmentId);
    await docRef.update({
        status: 'ready',
        sizeBytes: actualSize,
        mimeType: normalizeMimeType(contentType),
        validatedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        readyAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return {
        attachmentId,
        storagePath: attachment.storagePath,
        sizeBytes: actualSize,
        mimeType: normalizeMimeType(contentType),
    };
};
exports.registerLeaveAttachment = registerLeaveAttachment;
const getAttachmentById = async (attachmentId) => {
    const snapshot = await attachmentsCollection.doc(attachmentId).get();
    if (!snapshot.exists) {
        throw new functions.https.HttpsError('not-found', 'Attachment not found.');
    }
    const data = snapshot.data() ?? {};
    return {
        id: snapshot.id,
        userId: data.userId ?? '',
        status: data.status ?? 'pending',
        storagePath: data.storagePath ?? '',
        fileName: data.fileName ?? 'attachment',
        originalFileName: data.originalFileName ?? data.fileName ?? 'attachment',
        mimeType: data.mimeType ?? 'application/octet-stream',
        expectedSizeBytes: typeof data.expectedSizeBytes === 'number' ? data.expectedSizeBytes : null,
        sizeBytes: typeof data.sizeBytes === 'number' ? data.sizeBytes : null,
        bucket: data.bucket ?? null,
        uploadUrlExpiresAt: data.uploadUrlExpiresAt,
        expiresAt: data.expiresAt,
        attachedToLeave: data.attachedToLeave ?? null,
    };
};
exports.getAttachmentById = getAttachmentById;
const assertAttachmentOwnedByUser = (attachment, userId) => {
    if (!attachment) {
        throw new functions.https.HttpsError('not-found', 'Attachment not found.');
    }
    if (attachment.userId !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'Attachment does not belong to this user.');
    }
    return attachment;
};
exports.assertAttachmentOwnedByUser = assertAttachmentOwnedByUser;
const assertAttachmentReady = (attachment) => {
    if (attachment.status !== 'ready') {
        throw new functions.https.HttpsError('failed-precondition', 'Attachment is not finalized.');
    }
};
exports.assertAttachmentReady = assertAttachmentReady;
const DOWNLOAD_URL_TTL_SECONDS = 15 * 60; // 15 minutes
const getLeaveAttachmentDownloadUrl = async (input) => {
    const { attachmentId } = input;
    const attachment = await (0, exports.getAttachmentById)(attachmentId);
    if (attachment.status !== 'attached' && attachment.status !== 'ready') {
        throw new functions.https.HttpsError('failed-precondition', 'Attachment is not available for download.');
    }
    const bucketName = attachment.bucket ?? firebase_1.admin.storage().bucket().name;
    const bucket = firebase_1.admin.storage().bucket(bucketName);
    const file = bucket.file(attachment.storagePath);
    const [exists] = await file.exists();
    if (!exists) {
        throw new functions.https.HttpsError('not-found', 'Attachment file not found in storage.');
    }
    const expiresAt = Date.now() + DOWNLOAD_URL_TTL_SECONDS * 1000;
    const [downloadUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: expiresAt,
        responseDisposition: `attachment; filename="${attachment.originalFileName}"`,
    });
    return {
        downloadUrl,
        fileName: attachment.originalFileName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        expiresAt: new Date(expiresAt).toISOString(),
    };
};
exports.getLeaveAttachmentDownloadUrl = getLeaveAttachmentDownloadUrl;
const attachAttachmentToLeave = async ({ attachment, leaveRequestId, }) => {
    await (0, firestore_2.runTransaction)(async (tx) => {
        const docRef = attachmentsCollection.doc(attachment.id);
        const snapshot = await tx.get(docRef);
        if (!snapshot.exists) {
            throw new functions.https.HttpsError('not-found', 'Attachment not found.');
        }
        const data = snapshot.data() ?? {};
        const status = data.status ?? 'pending';
        const attachedToLeave = data.attachedToLeave ?? null;
        const ownerId = data.userId ?? null;
        if (ownerId !== attachment.userId) {
            throw new functions.https.HttpsError('permission-denied', 'Attachment ownership mismatch.');
        }
        if (status === 'attached' && attachedToLeave && attachedToLeave !== leaveRequestId) {
            throw new functions.https.HttpsError('failed-precondition', 'Attachment is already linked to another leave request.');
        }
        if (status !== 'ready' && status !== 'attached') {
            throw new functions.https.HttpsError('failed-precondition', 'Attachment is not ready to attach.');
        }
        tx.update(docRef, {
            status: 'attached',
            attachedToLeave: leaveRequestId,
            attachedAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
    });
};
exports.attachAttachmentToLeave = attachAttachmentToLeave;
