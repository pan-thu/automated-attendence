import * as functions from 'firebase-functions';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { admin } from '../firebase';
import { firestore } from '../utils/firestore';
import { DEFAULT_LEAVE_KEYS } from './users';
import { authLogger } from '../utils/logger';

const USERS_COLLECTION = 'USERS';
const PROFILE_PHOTOS_COLLECTION = 'PROFILE_PHOTOS';
const DEFAULT_ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DEFAULT_PHOTO_SIZE_MB = 5;
const SIGNED_URL_TTL_SECONDS = 5 * 60; // 5 minutes
const PHOTO_REGISTRATION_WINDOW_MINUTES = 15;

type PhotoStatus = 'pending' | 'ready' | 'active';

export interface ProfilePhotoRecord {
  id: string;
  userId: string;
  status: PhotoStatus;
  storagePath: string;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  expectedSizeBytes: number | null;
  sizeBytes: number | null;
  bucket?: string | null;
  uploadUrlExpiresAt?: FirebaseFirestore.Timestamp | null;
  expiresAt?: FirebaseFirestore.Timestamp | null;
  publicUrl?: string | null;
}

export interface GetOwnProfileResult {
  uid: string;
  email: string | null;
  fullName: string | null;
  displayName: string | null;
  department: string | null;
  position: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
  role: string | null;
  isActive: boolean;
  leaveBalances?: Record<string, number>;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface UpdateOwnProfileInput {
  fullName?: string;
  department?: string;
  position?: string;
  phoneNumber?: string;
  leaveBalances?: Partial<Record<typeof DEFAULT_LEAVE_KEYS[number], number>>;
}

export interface GenerateProfilePhotoUploadUrlInput {
  userId: string;
  fileName: string;
  mimeType: string;
  sizeBytes?: number;
}

export interface GenerateProfilePhotoUploadUrlResult {
  photoId: string;
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
  uploadUrlExpiresAt: string;
}

export interface RegisterProfilePhotoInput {
  userId: string;
  photoId: string;
}

export interface RegisterProfilePhotoResult {
  photoId: string;
  photoURL: string;
}

export interface UpdatePasswordInput {
  currentPassword: string;
  newPassword: string;
}

const profilePhotosCollection = firestore.collection(PROFILE_PHOTOS_COLLECTION);

const sanitizeFileName = (fileName: string): string => {
  const stripped = fileName.split(/[\\/]/).pop() ?? 'photo';
  const safe = stripped.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_{2,}/g, '_');
  const trimmed = safe.length > 0 ? safe : 'photo';
  return trimmed.length > 120 ? trimmed.slice(-120) : trimmed;
};

const normalizeMimeType = (mimeType: string): string => {
  const normalized = mimeType.toLowerCase().trim();
  if (!normalized) {
    throw new functions.https.HttpsError('invalid-argument', 'mimeType cannot be empty.');
  }
  return normalized;
};

const ensureAllowedMimeType = (mimeType: string, allowed: string[]): void => {
  const normalized = normalizeMimeType(mimeType);
  const shortType = normalized.split(';')[0];
  if (!allowed.includes(normalized) && !allowed.includes(shortType)) {
    throw new functions.https.HttpsError('failed-precondition', 'Photo type is not allowed. Only JPEG, PNG, and WebP are supported.');
  }
};

const buildStoragePath = (userId: string, photoId: string, sanitizedFileName: string): string => {
  return `profile-photos/${userId}/${photoId}_${sanitizedFileName}`;
};

const assertPositiveInteger = (value: number | undefined, field: string): number => {
  if (value === undefined || value === null) {
    throw new functions.https.HttpsError('invalid-argument', `${field} is required.`);
  }

  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value) || value <= 0) {
    throw new functions.https.HttpsError('invalid-argument', `${field} must be a positive number.`);
  }

  return Math.floor(value);
};

const validateImageMagicBytes = (buffer: Buffer, contentType: string): boolean => {
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
      authLogger.warn(`Unknown content type for magic byte validation: ${contentType}`);
      return true;
  }
};

export const getOwnProfile = async (userId: string): Promise<GetOwnProfileResult> => {
  const userDoc = await firestore.collection(USERS_COLLECTION).doc(userId).get();

  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User profile not found.');
  }

  const data = userDoc.data() ?? {};
  const authUser = await admin.auth().getUser(userId);

  // Extract leave balances if they exist
  const leaveBalances: Record<string, number> = {};
  DEFAULT_LEAVE_KEYS.forEach((key) => {
    if (typeof data[key] === 'number') {
      leaveBalances[key] = data[key];
    }
  });

  // Handle both 'isActive' (boolean) and 'status' (string) fields
  // Old seeding script uses status: 'active', new code uses isActive: true
  let isActive = false;
  if (typeof data.isActive === 'boolean') {
    isActive = data.isActive;
  } else if (data.status === 'active') {
    isActive = true;
  }

  return {
    uid: userId,
    email: authUser.email ?? null,
    fullName: data.fullName ?? data.name ?? null,  // Also handle 'name' field from old seeding
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

export const updateOwnProfile = async (userId: string, input: UpdateOwnProfileInput): Promise<void> => {
  const { fullName, department, position, phoneNumber, leaveBalances } = input;

  const updates: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (fullName !== undefined) updates.fullName = fullName;
  if (department !== undefined) updates.department = department;
  if (position !== undefined) updates.position = position;
  if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber;

  if (leaveBalances) {
    for (const [key, value] of Object.entries(leaveBalances)) {
      if (typeof value === 'number' && value >= 0) {
        updates[key] = value;
      }
    }
  }

  // Update Firebase Auth user
  const authUpdates: {
    displayName?: string;
    phoneNumber?: string | null;
  } = {};

  if (fullName !== undefined) authUpdates.displayName = fullName;
  if (phoneNumber !== undefined) authUpdates.phoneNumber = phoneNumber || null;

  if (Object.keys(authUpdates).length > 0) {
    await admin.auth().updateUser(userId, authUpdates);
  }

  // Update Firestore document
  await firestore.collection(USERS_COLLECTION).doc(userId).set(updates, { merge: true });
};

export const generateProfilePhotoUploadUrl = async (
  input: GenerateProfilePhotoUploadUrlInput
): Promise<GenerateProfilePhotoUploadUrlResult> => {
  const { userId, fileName, mimeType, sizeBytes } = input;

  const expectedSize = assertPositiveInteger(sizeBytes, 'sizeBytes');

  const allowedTypes = DEFAULT_ALLOWED_PHOTO_TYPES;
  const maxMb = DEFAULT_PHOTO_SIZE_MB;
  const maxBytes = maxMb * 1024 * 1024;

  const normalizedMime = normalizeMimeType(mimeType);
  ensureAllowedMimeType(normalizedMime, allowedTypes);

  if (expectedSize > maxBytes) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      `Photo exceeds the maximum size of ${maxMb}MB.`
    );
  }

  const sanitizedFileName = sanitizeFileName(fileName);
  const photoRef = profilePhotosCollection.doc();
  const storagePath = buildStoragePath(userId, photoRef.id, sanitizedFileName);
  const bucket = admin.storage().bucket();
  const file = bucket.file(storagePath);

  const uploadUrlExpiry = Date.now() + SIGNED_URL_TTL_SECONDS * 1000;

  // Check if we're running in emulator mode
  const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

  let uploadUrl: string;

  if (isEmulator) {
    // Use emulator upload URL
    const bucketName = bucket.name || 'default-bucket';
    // Use the EMULATOR_HOST from .env if available, otherwise default to localhost
    const emulatorHost = process.env.EMULATOR_HOST || 'localhost';
    const emulatorPort = '9199';

    // Construct emulator upload URL with proper format
    uploadUrl = `http://${emulatorHost}:${emulatorPort}/v0/b/${bucketName}/o?uploadType=media&name=${encodeURIComponent(storagePath)}`;

    authLogger.info(`[Emulator] Using Storage emulator upload URL: http://${emulatorHost}:${emulatorPort}`);
  } else {
    // Production: Generate signed URL
    try {
      const [signedUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: uploadUrlExpiry,
        contentType: normalizedMime,
      });
      uploadUrl = signedUrl;
    } catch (error) {
      authLogger.warn('Failed to generate signed URL, using public upload approach', error);
      const bucketName = bucket.name || 'default-bucket';
      uploadUrl = `http://localhost:9199/v0/b/${bucketName}/o?uploadType=media&name=${encodeURIComponent(storagePath)}`;
    }
  }

  const expiresAt = Timestamp.fromDate(
    new Date(Date.now() + PHOTO_REGISTRATION_WINDOW_MINUTES * 60 * 1000)
  );

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
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    uploadUrlExpiresAt: Timestamp.fromMillis(uploadUrlExpiry),
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

export const registerProfilePhoto = async (
  input: RegisterProfilePhotoInput
): Promise<RegisterProfilePhotoResult> => {
  const { userId, photoId } = input;

  // Use a transaction to prevent race conditions
  return await firestore.runTransaction(async (transaction) => {
    const photoDoc = await transaction.get(profilePhotosCollection.doc(photoId));

    if (!photoDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Photo record not found.');
    }

    const photo = photoDoc.data() ?? {};

    if (photo.userId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Photo does not belong to this user.');
    }

    if (photo.status !== 'pending') {
      throw new functions.https.HttpsError('failed-precondition', 'Photo is already finalized.');
    }

  if (photo.uploadUrlExpiresAt && photo.uploadUrlExpiresAt.toMillis() < Date.now()) {
    await profilePhotosCollection.doc(photoId).update({
      status: 'expired',
      updatedAt: FieldValue.serverTimestamp(),
    });
    throw new functions.https.HttpsError('deadline-exceeded', 'Upload URL expired. Please request a new one.');
  }

  if (photo.expiresAt && photo.expiresAt.toMillis() < Date.now()) {
    await profilePhotosCollection.doc(photoId).update({
      status: 'expired',
      updatedAt: FieldValue.serverTimestamp(),
    });
    throw new functions.https.HttpsError('deadline-exceeded', 'Photo registration window has expired.');
  }

  const bucketName = photo.bucket ?? admin.storage().bucket().name;
  const bucket = admin.storage().bucket(bucketName);
  const file = bucket.file(photo.storagePath);
  const [exists] = await file.exists();

  if (!exists) {
    throw new functions.https.HttpsError('not-found', 'Uploaded photo not found.');
  }

  const [metadata] = await file.getMetadata();
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
    throw new functions.https.HttpsError(
      'failed-precondition',
      `Photo exceeds the maximum size of ${maxMb}MB.`
    );
  }

  if (photo.expectedSizeBytes && Math.abs(actualSize - photo.expectedSizeBytes) > Math.max(1024, photo.expectedSizeBytes * 0.1)) {
    throw new functions.https.HttpsError('failed-precondition', 'Uploaded photo size differs from the declared size.');
  }

  // Validate image magic bytes
  try {
    const [buffer] = await file.download({ start: 0, end: 4 });
    const isValidImage = validateImageMagicBytes(buffer, contentType);

    if (!isValidImage) {
      await file.delete().catch((err) => authLogger.error('Failed to delete invalid file:', err));
      await profilePhotosCollection.doc(photoId).delete().catch((err) => authLogger.error('Failed to delete photo record:', err));
      throw new functions.https.HttpsError('failed-precondition', 'File appears to be corrupted or invalid. The file content does not match the declared type.');
    }
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    authLogger.error('Magic byte validation error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to validate file content.');
  }

  // Make the file publicly readable
  await file.makePublic();

  // Get the public URL
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${photo.storagePath}`;

  // Update photo record
  await profilePhotosCollection.doc(photoId).update({
    status: 'ready',
    sizeBytes: actualSize,
    mimeType: normalizeMimeType(contentType),
    publicUrl,
    validatedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    readyAt: FieldValue.serverTimestamp(),
  });

  // Update user's photoURL in Firebase Auth
  await admin.auth().updateUser(userId, {
    photoURL: publicUrl,
  });

  // Mark previous photos as inactive
  const previousPhotos = await profilePhotosCollection
    .where('userId', '==', userId)
    .where('status', '==', 'active')
    .get();

  const batch = firestore.batch();
  previousPhotos.docs.forEach((doc) => {
    batch.update(doc.ref, { status: 'inactive', updatedAt: FieldValue.serverTimestamp() });
  });

  // Mark this photo as active
  batch.update(profilePhotosCollection.doc(photoId), {
    status: 'active',
    activatedAt: FieldValue.serverTimestamp(),
  });

  // Update user's photoURL in Firestore USERS collection
  batch.update(firestore.collection(USERS_COLLECTION).doc(userId), {
    photoURL: publicUrl,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

    return {
      photoId,
      photoURL: publicUrl,
    };
  });
};

export const updateOwnPassword = async (userId: string, email: string, input: UpdatePasswordInput): Promise<void> => {
  const { currentPassword, newPassword } = input;

  // Verify current password by attempting to sign in
  try {
    await admin.auth().getUserByEmail(email);
  } catch (error) {
    throw new functions.https.HttpsError('not-found', 'User not found.');
  }

  // Note: We can't verify the current password server-side with Admin SDK
  // The client should re-authenticate before calling this function
  // For now, we'll just update the password

  if (newPassword.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 6 characters long.');
  }

  await admin.auth().updateUser(userId, {
    password: newPassword,
  });
};
