import * as functions from 'firebase-functions';
import { admin } from '../firebase';

export interface CallableContext {
  auth?: {
    uid: string;
    token: Record<string, unknown>;
  };
}

export class AuthorizationError extends functions.https.HttpsError {
  constructor(message: string) {
    super('permission-denied', message);
  }
}

export class AuthenticationError extends functions.https.HttpsError {
  constructor(message: string) {
    super('unauthenticated', message);
  }
}

export const assertAuthenticated = (context: CallableContext): void => {
  if (!context.auth) {
    throw new AuthenticationError('Authentication required.');
  }
};

export const assertAdmin = (context: CallableContext): void => {
  assertAuthenticated(context);
  const role = context.auth?.token?.role;
  if (role !== 'admin') {
    throw new AuthorizationError('Admin privileges required.');
  }
};

export const assertEmployee = (context: CallableContext): void => {
  assertAuthenticated(context);
  const role = context.auth?.token?.role;
  if (role !== 'employee') {
    throw new AuthorizationError('Employee privileges required.');
  }
};

export const requireAuthUid = (context: CallableContext): string => {
  assertAuthenticated(context);
  return context.auth!.uid;
};

/**
 * Assert that user is authenticated, has admin role, AND has active status.
 * Bug Fix #5: Add status check to prevent inactive admins from accessing functions.
 */
export const assertActiveAdmin = async (context: CallableContext): Promise<string> => {
  assertAdmin(context);
  const uid = context.auth!.uid;

  const userDoc = await admin.firestore().collection('USERS').doc(uid).get();

  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User profile not found.');
  }

  const userData = userDoc.data();
  if (userData?.status !== 'active') {
    throw new AuthorizationError('User account is not active.');
  }

  return uid;
};

/**
 * Assert that user is authenticated, has employee role, AND has active status.
 * Bug Fix #5: Add status check to prevent inactive employees from accessing functions.
 */
export const assertActiveEmployee = async (context: CallableContext): Promise<string> => {
  assertEmployee(context);
  const uid = context.auth!.uid;

  const userDoc = await admin.firestore().collection('USERS').doc(uid).get();

  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User profile not found.');
  }

  const userData = userDoc.data();
  if (userData?.status !== 'active') {
    throw new AuthorizationError('User account is not active.');
  }

  return uid;
};


