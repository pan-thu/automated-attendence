import * as functions from 'firebase-functions';
import { admin } from '../firebase';
import { firestore, runTransaction } from '../utils/firestore';
import { getCompanySettings } from './settings';

const ATTACHMENTS_COLLECTION = 'LEAVE_ATTACHMENTS';
const DEFAULT_ALLOWED_ATTACHMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const DEFAULT_ATTACHMENT_SIZE_MB = 5;
const SIGNED_URL_TTL_SECONDS = 5 * 60; // 5 minutes
const ATTACHMENT_REGISTRATION_WINDOW_MINUTES = 15;

type AttachmentStatus = 'pending' | 'ready' | 'attached' | 'expired';

export interface LeaveAttachmentRecord {
  id: string;
  userId: string;
  status: AttachmentStatus;
  storagePath: string;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  expectedSizeBytes: number | null;
  sizeBytes: number | null;
  bucket?: string | null;
  uploadUrlExpiresAt?: FirebaseFirestore.Timestamp | null;
  expiresAt?: FirebaseFirestore.Timestamp | null;
  attachedToLeave?: string | null;
}

export interface GenerateLeaveAttachmentUploadUrlInput {
  userId: string;
  fileName: string;
  mimeType: string;
  sizeBytes?: number;
}

export interface GenerateLeaveAttachmentUploadUrlResult {
  attachmentId: string;
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
  uploadUrlExpiresAt: string;
}

export interface RegisterLeaveAttachmentInput {
  userId: string;
  attachmentId: string;
}

export interface RegisterLeaveAttachmentResult {
  attachmentId: string;
  storagePath: string;
  sizeBytes: number;
  mimeType: string;
}

const attachmentsCollection = firestore.collection(ATTACHMENTS_COLLECTION);

const sanitizeFileName = (fileName: string): string => {
  const stripped = fileName.split(/[\\/]/).pop() ?? 'attachment';
  const safe = stripped.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_{2,}/g, '_');
  const trimmed = safe.length > 0 ? safe : 'attachment';
  return trimmed.length > 120 ? trimmed.slice(-120) : trimmed;
};

const resolveAllowedTypes = (raw: string[] | undefined): string[] => {
  const list = (raw ?? []).map((entry) => entry.toLowerCase()).filter((entry) => entry.length > 0);
  return list.length > 0 ? list : DEFAULT_ALLOWED_ATTACHMENT_TYPES;
};

const resolveMaxSizeConfig = (value: number | undefined): { maxBytes: number; maxMb: number } => {
  const maxMb = typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : DEFAULT_ATTACHMENT_SIZE_MB;
  return { maxBytes: maxMb * 1024 * 1024, maxMb };
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
    throw new functions.https.HttpsError('failed-precondition', 'Attachment type is not allowed.');
  }
};

const buildStoragePath = (userId: string, attachmentId: string, sanitizedFileName: string): string => {
  return `leave-attachments/${userId}/${attachmentId}_${sanitizedFileName}`;
};

/**
 * Validate file magic bytes to ensure file integrity and prevent file type spoofing.
 * Bug Fix #22: Enhanced attachment security with content validation.
 */
const validateFileMagicBytes = (buffer: Buffer, contentType: string): boolean => {
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
      console.warn(`Unknown content type for magic byte validation: ${contentType}`);
      return true;
  }
};

export const generateLeaveAttachmentUploadUrl = async (
  input: GenerateLeaveAttachmentUploadUrlInput
): Promise<GenerateLeaveAttachmentUploadUrlResult> => {
  const { userId, fileName, mimeType, sizeBytes } = input;

  const expectedSize = assertPositiveInteger(sizeBytes, 'sizeBytes');

  const settings = await getCompanySettings();
  const allowedTypes = resolveAllowedTypes(settings.allowedLeaveAttachmentTypes);
  const { maxBytes, maxMb } = resolveMaxSizeConfig(settings.maxLeaveAttachmentSizeMb);

  const normalizedMime = normalizeMimeType(mimeType);
  ensureAllowedMimeType(normalizedMime, allowedTypes);

  if (expectedSize > maxBytes) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      `Attachment exceeds the maximum size of ${maxMb}MB.`
    );
  }

  const sanitizedFileName = sanitizeFileName(fileName);
  const attachmentRef = attachmentsCollection.doc();
  const storagePath = buildStoragePath(userId, attachmentRef.id, sanitizedFileName);
  const bucket = admin.storage().bucket();
  const file = bucket.file(storagePath);

  const uploadUrlExpiry = Date.now() + SIGNED_URL_TTL_SECONDS * 1000;
  const [uploadUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: uploadUrlExpiry,
    contentType: normalizedMime,
  });

  const expiresAt = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + ATTACHMENT_REGISTRATION_WINDOW_MINUTES * 60 * 1000)
  );

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
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    uploadUrlExpiresAt: admin.firestore.Timestamp.fromMillis(uploadUrlExpiry),
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

export const registerLeaveAttachment = async (
  input: RegisterLeaveAttachmentInput
): Promise<RegisterLeaveAttachmentResult> => {
  const { userId, attachmentId } = input;

  const attachment = await getAttachmentById(attachmentId);

  if (attachment.userId !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'Attachment does not belong to this user.');
  }

  if (attachment.status !== 'pending') {
    throw new functions.https.HttpsError('failed-precondition', 'Attachment is already finalized.');
  }

  if (attachment.uploadUrlExpiresAt && attachment.uploadUrlExpiresAt.toMillis() < Date.now()) {
    await attachmentsCollection.doc(attachmentId).update({
      status: 'expired',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    throw new functions.https.HttpsError('deadline-exceeded', 'Upload URL expired. Please request a new one.');
  }

  if (attachment.expiresAt && attachment.expiresAt.toMillis() < Date.now()) {
    await attachmentsCollection.doc(attachmentId).update({
      status: 'expired',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    throw new functions.https.HttpsError('deadline-exceeded', 'Attachment registration window has expired.');
  }

  const bucketName = attachment.bucket ?? admin.storage().bucket().name;
  const bucket = admin.storage().bucket(bucketName);
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

  const settings = await getCompanySettings();
  const allowedTypes = resolveAllowedTypes(settings.allowedLeaveAttachmentTypes);
  const { maxBytes, maxMb } = resolveMaxSizeConfig(settings.maxLeaveAttachmentSizeMb);
  ensureAllowedMimeType(contentType, allowedTypes);

  if (actualSize > maxBytes) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      `Attachment exceeds the configured maximum size of ${maxMb}MB.`
    );
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
      await file.delete().catch((err) => console.error('Failed to delete invalid file:', err));
      await attachmentsCollection.doc(attachmentId).delete().catch((err) => console.error('Failed to delete attachment record:', err));
      throw new functions.https.HttpsError('failed-precondition', 'File appears to be corrupted or invalid. The file content does not match the declared type.');
    }
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    console.error('Magic byte validation error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to validate file content.');
  }

  const docRef = attachmentsCollection.doc(attachmentId);
  await docRef.update({
    status: 'ready',
    sizeBytes: actualSize,
    mimeType: normalizeMimeType(contentType),
    validatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    readyAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    attachmentId,
    storagePath: attachment.storagePath,
    sizeBytes: actualSize,
    mimeType: normalizeMimeType(contentType),
  };
};

export const getAttachmentById = async (attachmentId: string): Promise<LeaveAttachmentRecord> => {
  const snapshot = await attachmentsCollection.doc(attachmentId).get();
  if (!snapshot.exists) {
    throw new functions.https.HttpsError('not-found', 'Attachment not found.');
  }

  const data = snapshot.data() ?? {};
  return {
    id: snapshot.id,
    userId: (data.userId as string) ?? '',
    status: (data.status as AttachmentStatus) ?? 'pending',
    storagePath: (data.storagePath as string) ?? '',
    fileName: (data.fileName as string) ?? 'attachment',
    originalFileName: (data.originalFileName as string) ?? (data.fileName as string) ?? 'attachment',
    mimeType: (data.mimeType as string) ?? 'application/octet-stream',
    expectedSizeBytes: typeof data.expectedSizeBytes === 'number' ? data.expectedSizeBytes : null,
    sizeBytes: typeof data.sizeBytes === 'number' ? data.sizeBytes : null,
    bucket: (data.bucket as string | undefined) ?? null,
    uploadUrlExpiresAt: data.uploadUrlExpiresAt as FirebaseFirestore.Timestamp | undefined,
    expiresAt: data.expiresAt as FirebaseFirestore.Timestamp | undefined,
    attachedToLeave: (data.attachedToLeave as string | undefined) ?? null,
  };
};

export const assertAttachmentOwnedByUser = (
  attachment: LeaveAttachmentRecord | null,
  userId: string
): LeaveAttachmentRecord => {
  if (!attachment) {
    throw new functions.https.HttpsError('not-found', 'Attachment not found.');
  }

  if (attachment.userId !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'Attachment does not belong to this user.');
  }

  return attachment;
};

export const assertAttachmentReady = (attachment: LeaveAttachmentRecord): void => {
  if (attachment.status !== 'ready') {
    throw new functions.https.HttpsError('failed-precondition', 'Attachment is not finalized.');
  }
};

export const attachAttachmentToLeave = async ({
  attachment,
  leaveRequestId,
}: {
  attachment: LeaveAttachmentRecord;
  leaveRequestId: string;
}): Promise<void> => {
  await runTransaction(async (tx) => {
    const docRef = attachmentsCollection.doc(attachment.id);
    const snapshot = await tx.get(docRef);
    if (!snapshot.exists) {
      throw new functions.https.HttpsError('not-found', 'Attachment not found.');
    }

    const data = snapshot.data() ?? {};
    const status = (data.status as AttachmentStatus) ?? 'pending';
    const attachedToLeave = (data.attachedToLeave as string | undefined) ?? null;
    const ownerId = (data.userId as string | undefined) ?? null;

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
      attachedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
};


