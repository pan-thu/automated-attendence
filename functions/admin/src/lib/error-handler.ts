/**
 * Bug Fix #28: User-friendly error message handler for Admin Dashboard
 *
 * Converts Firebase errors into user-friendly messages for display in the UI.
 */

interface FirebaseError {
  code?: string;
  message?: string;
}

/**
 * Converts Firebase and generic errors into user-friendly messages
 */
export function getUserFriendlyMessage(error: unknown): string {
  // Handle Firebase errors with code property
  if (isFirebaseError(error)) {
    return handleFirebaseError(error);
  }

  // Handle Error objects
  if (error instanceof Error) {
    return error.message || 'An unexpected error occurred.';
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Fallback for unknown error types
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Type guard to check if error is a Firebase error
 */
function isFirebaseError(error: unknown): error is FirebaseError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as FirebaseError).code === 'string'
  );
}

/**
 * Handles Firebase-specific errors
 */
function handleFirebaseError(error: FirebaseError): string {
  const code = error.code || '';

  // Cloud Functions errors
  switch (code) {
    case 'functions/permission-denied':
    case 'permission-denied':
      return 'You do not have permission to perform this action.';

    case 'functions/unauthenticated':
    case 'unauthenticated':
      return 'Please log in to continue.';

    case 'functions/not-found':
    case 'not-found':
      return 'The requested resource was not found.';

    case 'functions/failed-precondition':
    case 'failed-precondition':
      // Use server message if available (often contains specific details)
      return error.message || 'Cannot complete this action right now.';

    case 'functions/invalid-argument':
    case 'invalid-argument':
      // Use server message for validation errors
      return error.message || 'Invalid input provided. Please check your data.';

    case 'functions/deadline-exceeded':
    case 'deadline-exceeded':
    case 'functions/unavailable':
    case 'unavailable':
      return 'Request timed out. Please check your connection and try again.';

    case 'functions/resource-exhausted':
    case 'resource-exhausted':
      return 'Service temporarily unavailable. Please try again later.';

    case 'functions/aborted':
    case 'aborted':
      return 'Operation was aborted. Please try again.';

    case 'functions/already-exists':
    case 'already-exists':
      return 'This item already exists.';

    case 'functions/out-of-range':
    case 'out-of-range':
      return 'Value is out of acceptable range.';

    case 'functions/unimplemented':
    case 'unimplemented':
      return 'This feature is not yet available.';

    case 'functions/internal':
    case 'internal':
      return 'An internal server error occurred. Please try again.';

    case 'functions/data-loss':
    case 'data-loss':
      return 'Data loss or corruption detected. Please contact support.';

    // Firebase Auth errors
    case 'auth/user-not-found':
      return 'No account found with this email.';

    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please try again.';

    case 'auth/invalid-email':
      return 'Invalid email address format.';

    case 'auth/user-disabled':
      return 'This account has been disabled. Contact your administrator.';

    case 'auth/email-already-in-use':
      return 'This email is already registered.';

    case 'auth/weak-password':
      return 'Password is too weak. Use at least 6 characters.';

    case 'auth/operation-not-allowed':
      return 'This operation is not allowed.';

    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';

    case 'auth/too-many-requests':
      return 'Too many login attempts. Please try again later.';

    case 'auth/user-token-expired':
    case 'auth/requires-recent-login':
      return 'Session expired. Please log in again.';

    // Firestore errors
    case 'firestore/permission-denied':
      return 'You do not have permission to access this data.';

    case 'firestore/not-found':
      return 'Document not found.';

    case 'firestore/unavailable':
      return 'Database temporarily unavailable. Please try again.';

    default:
      // Return the original message if available, otherwise a generic message
      return error.message || 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Checks if an error is network-related
 */
export function isNetworkError(error: unknown): boolean {
  if (isFirebaseError(error)) {
    const code = error.code || '';
    return (
      code.includes('unavailable') ||
      code.includes('deadline-exceeded') ||
      code.includes('network-request-failed')
    );
  }

  const message = String(error).toLowerCase();
  return (
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('timeout') ||
    message.includes('unreachable')
  );
}

/**
 * Checks if an error requires user re-authentication
 */
export function isAuthError(error: unknown): boolean {
  if (isFirebaseError(error)) {
    const code = error.code || '';
    return (
      code === 'functions/unauthenticated' ||
      code === 'unauthenticated' ||
      code === 'auth/user-token-expired' ||
      code === 'auth/requires-recent-login' ||
      code === 'auth/user-not-found'
    );
  }

  return false;
}

/**
 * Gets appropriate retry message based on error type
 */
export function getRetryMessage(error: unknown): string {
  if (isNetworkError(error)) {
    return 'Please check your internet connection and try again.';
  }

  if (isAuthError(error)) {
    return 'Please log in again to continue.';
  }

  return 'Please try again.';
}
