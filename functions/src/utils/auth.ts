import * as functions from 'firebase-functions';

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


