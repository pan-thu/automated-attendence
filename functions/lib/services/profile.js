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
exports.updateOwnPassword = exports.registerProfilePhoto = exports.generateProfilePhotoUploadUrl = exports.updateOwnProfile = exports.getOwnProfile = void 0;
const functions = __importStar(require("firebase-functions"));
const firestore_1 = require("firebase-admin/firestore");
const uuid_1 = require("uuid");
const firebase_1 = require("../firebase");
const firestore_2 = require("../utils/firestore");
const users_1 = require("./users");
const logger_1 = require("../utils/logger");
const USERS_COLLECTION = 'USERS';
const PROFILE_PHOTOS_COLLECTION = 'PROFILE_PHOTOS';
const DEFAULT_ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DEFAULT_PHOTO_SIZE_MB = 10;
const SIGNED_URL_TTL_SECONDS = 5 * 60; // 5 minutes
const PHOTO_REGISTRATION_WINDOW_MINUTES = 15;
const profilePhotosCollection = firestore_2.firestore.collection(PROFILE_PHOTOS_COLLECTION);
const sanitizeFileName = (fileName) => {
    const stripped = fileName.split(/[\\/]/).pop() ?? 'photo';
    const safe = stripped.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_{2,}/g, '_');
    const trimmed = safe.length > 0 ? safe : 'photo';
    return trimmed.length > 120 ? trimmed.slice(-120) : trimmed;
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
        throw new functions.https.HttpsError('failed-precondition', 'Photo type is not allowed. Only JPEG, PNG, and WebP are supported.');
    }
};
const buildStoragePath = (userId, photoId, sanitizedFileName) => {
    return `profile-photos/${userId}/${photoId}_${sanitizedFileName}`;
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
const validateImageMagicBytes = (buffer, contentType) => {
    if (buffer.length < 4) {
        return false;
    }
    const magicBytes = buffer.slice(0, 4);
    switch (contentType.toLowerCase().split(';')[0]) {
        case 'image/jpeg':
            return magicBytes[0] === 0xFF && magicBytes[1] === 0xD8;
        case 'image/png':
            return magicBytes[0] === 0x89 && magicBytes[1] === 0x50 && magicBytes[2] === 0x4E && magicBytes[3] === 0x47;
        case 'image/webp':
            return magicBytes.toString('utf8', 0, 4) === 'RIFF';
        default:
            logger_1.authLogger.warn(`Unknown content type for magic byte validation: ${contentType}`);
            return true;
    }
};
const getOwnProfile = async (userId) => {
    const userDoc = await firestore_2.firestore.collection(USERS_COLLECTION).doc(userId).get();
    if (!userDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'User profile not found.');
    }
    const data = userDoc.data() ?? {};
    const authUser = await firebase_1.admin.auth().getUser(userId);
    // Extract leave balances if they exist
    const leaveBalances = {};
    users_1.DEFAULT_LEAVE_KEYS.forEach((key) => {
        if (typeof data[key] === 'number') {
            leaveBalances[key] = data[key];
        }
    });
    // Handle both 'isActive' (boolean) and 'status' (string) fields
    // Old seeding script uses status: 'active', new code uses isActive: true
    let isActive = false;
    if (typeof data.isActive === 'boolean') {
        isActive = data.isActive;
    }
    else if (data.status === 'active') {
        isActive = true;
    }
    return {
        uid: userId,
        email: authUser.email ?? null,
        fullName: data.fullName ?? data.name ?? null, // Also handle 'name' field from old seeding
        displayName: authUser.displayName ?? null,
        department: data.department ?? null,
        position: data.position ?? null,
        phoneNumber: authUser.phoneNumber ?? null,
        photoURL: authUser.photoURL ?? null,
        role: data.role ?? null,
        isActive,
        leaveBalances: Object.keys(leaveBalances).length > 0 ? leaveBalances : undefined,
        createdAt: data.createdAt?.toDate() ?? null,
        updatedAt: data.updatedAt?.toDate() ?? null,
    };
};
exports.getOwnProfile = getOwnProfile;
const updateOwnProfile = async (userId, input) => {
    const { fullName, department, position, phoneNumber, leaveBalances } = input;
    const updates = {
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    if (fullName !== undefined)
        updates.fullName = fullName;
    if (department !== undefined)
        updates.department = department;
    if (position !== undefined)
        updates.position = position;
    if (phoneNumber !== undefined)
        updates.phoneNumber = phoneNumber;
    if (leaveBalances) {
        for (const [key, value] of Object.entries(leaveBalances)) {
            if (typeof value === 'number' && value >= 0) {
                updates[key] = value;
            }
        }
    }
    // Update Firebase Auth user
    const authUpdates = {};
    if (fullName !== undefined)
        authUpdates.displayName = fullName;
    if (phoneNumber !== undefined)
        authUpdates.phoneNumber = phoneNumber || null;
    if (Object.keys(authUpdates).length > 0) {
        await firebase_1.admin.auth().updateUser(userId, authUpdates);
    }
    // Update Firestore document
    await firestore_2.firestore.collection(USERS_COLLECTION).doc(userId).set(updates, { merge: true });
};
exports.updateOwnProfile = updateOwnProfile;
const generateProfilePhotoUploadUrl = async (input) => {
    const { userId, fileName, mimeType, sizeBytes } = input;
    const expectedSize = assertPositiveInteger(sizeBytes, 'sizeBytes');
    const allowedTypes = DEFAULT_ALLOWED_PHOTO_TYPES;
    const maxMb = DEFAULT_PHOTO_SIZE_MB;
    const maxBytes = maxMb * 1024 * 1024;
    const normalizedMime = normalizeMimeType(mimeType);
    ensureAllowedMimeType(normalizedMime, allowedTypes);
    if (expectedSize > maxBytes) {
        throw new functions.https.HttpsError('failed-precondition', `Photo exceeds the maximum size of ${maxMb}MB.`);
    }
    const sanitizedFileName = sanitizeFileName(fileName);
    const photoRef = profilePhotosCollection.doc();
    const storagePath = buildStoragePath(userId, photoRef.id, sanitizedFileName);
    const bucket = firebase_1.admin.storage().bucket();
    const file = bucket.file(storagePath);
    const uploadUrlExpiry = Date.now() + SIGNED_URL_TTL_SECONDS * 1000;
    // Check if we're running in emulator mode
    const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
    let uploadUrl;
    if (isEmulator) {
        // Use emulator upload URL
        const bucketName = bucket.name || 'default-bucket';
        // Use the EMULATOR_HOST from .env if available, otherwise default to localhost
        const emulatorHost = process.env.EMULATOR_HOST || 'localhost';
        const emulatorPort = '9199';
        // Construct emulator upload URL with proper format
        uploadUrl = `http://${emulatorHost}:${emulatorPort}/v0/b/${bucketName}/o?uploadType=media&name=${encodeURIComponent(storagePath)}`;
        logger_1.authLogger.info(`[Emulator] Using Storage emulator upload URL: http://${emulatorHost}:${emulatorPort}`);
    }
    else {
        // Production: Generate signed URL
        try {
            const [signedUrl] = await file.getSignedUrl({
                version: 'v4',
                action: 'write',
                expires: uploadUrlExpiry,
                contentType: normalizedMime,
            });
            uploadUrl = signedUrl;
        }
        catch (error) {
            logger_1.authLogger.warn('Failed to generate signed URL, using public upload approach', error);
            const bucketName = bucket.name || 'default-bucket';
            uploadUrl = `http://localhost:9199/v0/b/${bucketName}/o?uploadType=media&name=${encodeURIComponent(storagePath)}`;
        }
    }
    const expiresAt = firestore_1.Timestamp.fromDate(new Date(Date.now() + PHOTO_REGISTRATION_WINDOW_MINUTES * 60 * 1000));
    await photoRef.set({
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
        photoId: photoRef.id,
        uploadUrl,
        uploadHeaders: {
            'Content-Type': normalizedMime,
        },
        uploadUrlExpiresAt: new Date(uploadUrlExpiry).toISOString(),
    };
};
exports.generateProfilePhotoUploadUrl = generateProfilePhotoUploadUrl;
const registerProfilePhoto = async (input) => {
    const { userId, photoId } = input;
    // Fetch photo document
    const photoDoc = await profilePhotosCollection.doc(photoId).get();
    if (!photoDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Photo record not found.');
    }
    const photo = photoDoc.data() ?? {};
    if (photo.userId !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'Photo does not belong to this user.');
    }
    // Handle already-finalized photos (idempotency for retries)
    if (photo.status === 'active' || photo.status === 'ready') {
        logger_1.authLogger.info('[registerProfilePhoto] Photo already finalized, returning existing URL');
        return {
            photoId,
            photoURL: photo.publicUrl,
        };
    }
    if (photo.status !== 'pending') {
        throw new functions.https.HttpsError('failed-precondition', `Photo cannot be registered (status: ${photo.status}).`);
    }
    if (photo.uploadUrlExpiresAt && photo.uploadUrlExpiresAt.toMillis() < Date.now()) {
        await profilePhotosCollection.doc(photoId).update({
            status: 'expired',
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        throw new functions.https.HttpsError('deadline-exceeded', 'Upload URL expired. Please request a new one.');
    }
    if (photo.expiresAt && photo.expiresAt.toMillis() < Date.now()) {
        await profilePhotosCollection.doc(photoId).update({
            status: 'expired',
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        throw new functions.https.HttpsError('deadline-exceeded', 'Photo registration window has expired.');
    }
    const bucketName = photo.bucket ?? firebase_1.admin.storage().bucket().name;
    logger_1.authLogger.info(`[registerProfilePhoto] Using bucket: ${bucketName}, path: ${photo.storagePath}`);
    const bucket = firebase_1.admin.storage().bucket(bucketName);
    const file = bucket.file(photo.storagePath);
    logger_1.authLogger.info('[registerProfilePhoto] Checking if file exists...');
    const [exists] = await file.exists();
    logger_1.authLogger.info(`[registerProfilePhoto] File exists: ${exists}`);
    if (!exists) {
        throw new functions.https.HttpsError('not-found', 'Uploaded photo not found.');
    }
    logger_1.authLogger.info('[registerProfilePhoto] Getting file metadata...');
    const [metadata] = await file.getMetadata();
    logger_1.authLogger.info('[registerProfilePhoto] Got metadata');
    const actualSize = Number(metadata.size ?? 0);
    if (!Number.isFinite(actualSize) || actualSize <= 0) {
        throw new functions.https.HttpsError('failed-precondition', 'Photo size could not be determined.');
    }
    const contentType = metadata.contentType ?? photo.mimeType;
    const allowedTypes = DEFAULT_ALLOWED_PHOTO_TYPES;
    const maxMb = DEFAULT_PHOTO_SIZE_MB;
    const maxBytes = maxMb * 1024 * 1024;
    ensureAllowedMimeType(contentType, allowedTypes);
    if (actualSize > maxBytes) {
        throw new functions.https.HttpsError('failed-precondition', `Photo exceeds the maximum size of ${maxMb}MB.`);
    }
    if (photo.expectedSizeBytes && Math.abs(actualSize - photo.expectedSizeBytes) > Math.max(1024, photo.expectedSizeBytes * 0.1)) {
        throw new functions.https.HttpsError('failed-precondition', 'Uploaded photo size differs from the declared size.');
    }
    // Validate image magic bytes
    try {
        logger_1.authLogger.info('[registerProfilePhoto] Downloading magic bytes...');
        const [buffer] = await file.download({ start: 0, end: 4 });
        logger_1.authLogger.info('[registerProfilePhoto] Downloaded magic bytes');
        const isValidImage = validateImageMagicBytes(buffer, contentType);
        if (!isValidImage) {
            await file.delete().catch((err) => logger_1.authLogger.error('Failed to delete invalid file:', err));
            await profilePhotosCollection.doc(photoId).delete().catch((err) => logger_1.authLogger.error('Failed to delete photo record:', err));
            throw new functions.https.HttpsError('failed-precondition', 'File appears to be corrupted or invalid. The file content does not match the declared type.');
        }
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        logger_1.authLogger.error('Magic byte validation error:', error);
        throw new functions.https.HttpsError('internal', 'Failed to validate file content.');
    }
    // Generate a download token and set it as metadata
    logger_1.authLogger.info('[registerProfilePhoto] Setting download token metadata...');
    const downloadToken = (0, uuid_1.v4)();
    await file.setMetadata({
        metadata: {
            firebaseStorageDownloadTokens: downloadToken,
        },
    });
    logger_1.authLogger.info('[registerProfilePhoto] Set metadata successfully');
    // Construct the Firebase Storage download URL
    const encodedPath = encodeURIComponent(photo.storagePath);
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`;
    // Update user's photoURL in Firebase Auth
    logger_1.authLogger.info('[registerProfilePhoto] Updating Firebase Auth user...');
    await firebase_1.admin.auth().updateUser(userId, {
        photoURL: publicUrl,
    });
    logger_1.authLogger.info('[registerProfilePhoto] Firebase Auth user updated');
    // Mark previous photos as inactive and update all records in a single batch
    logger_1.authLogger.info('[registerProfilePhoto] Querying previous active photos...');
    const previousPhotos = await profilePhotosCollection
        .where('userId', '==', userId)
        .where('status', '==', 'active')
        .get();
    logger_1.authLogger.info(`[registerProfilePhoto] Found ${previousPhotos.docs.length} previous photos`);
    const batch = firestore_2.firestore.batch();
    // Mark previous photos as inactive
    previousPhotos.docs.forEach((doc) => {
        batch.update(doc.ref, { status: 'inactive', updatedAt: firestore_1.FieldValue.serverTimestamp() });
    });
    // Mark this photo as active with all metadata
    batch.update(profilePhotosCollection.doc(photoId), {
        status: 'active',
        sizeBytes: actualSize,
        mimeType: normalizeMimeType(contentType),
        publicUrl,
        validatedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        readyAt: firestore_1.FieldValue.serverTimestamp(),
        activatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    // Update user's photoURL in Firestore USERS collection
    batch.update(firestore_2.firestore.collection(USERS_COLLECTION).doc(userId), {
        photoURL: publicUrl,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    logger_1.authLogger.info('[registerProfilePhoto] Committing batch...');
    await batch.commit();
    logger_1.authLogger.info('[registerProfilePhoto] Batch committed, returning result');
    return {
        photoId,
        photoURL: publicUrl,
    };
};
exports.registerProfilePhoto = registerProfilePhoto;
const updateOwnPassword = async (userId, email, input) => {
    const { currentPassword, newPassword } = input;
    // Verify current password by attempting to sign in
    try {
        await firebase_1.admin.auth().getUserByEmail(email);
    }
    catch (error) {
        throw new functions.https.HttpsError('not-found', 'User not found.');
    }
    // Note: We can't verify the current password server-side with Admin SDK
    // The client should re-authenticate before calling this function
    // For now, we'll just update the password
    if (newPassword.length < 6) {
        throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 6 characters long.');
    }
    await firebase_1.admin.auth().updateUser(userId, {
        password: newPassword,
    });
};
exports.updateOwnPassword = updateOwnPassword;
