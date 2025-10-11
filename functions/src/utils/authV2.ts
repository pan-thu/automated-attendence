import { HttpsError, CallableRequest } from 'firebase-functions/v2/https';

/**
 * Type alias for 2nd-gen callable request
 */
export type CallableRequestV2<T = any> = CallableRequest<T>;

/**
 * Asserts that the request is authenticated.
 * Throws unauthenticated HttpsError if not authenticated.
 *
 * @param request - The callable request object
 * @throws {HttpsError} unauthenticated if request.auth is null/undefined
 *
 * @example
 * ```typescript
 * export const myFunction = onCall(
 *   wrapCallable(async (request: CallableRequest) => {
 *     assertAuthenticated(request);
 *     // ... user is authenticated here
 *   }, 'myFunction')
 * );
 * ```
 */
export function assertAuthenticated(request: CallableRequest): void {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }
}

/**
 * Asserts that the authenticated user has the admin role.
 * Checks custom claims for role === 'admin'.
 *
 * @param request - The callable request object
 * @throws {HttpsError} unauthenticated if not authenticated
 * @throws {HttpsError} permission-denied if role is not admin
 *
 * @example
 * ```typescript
 * export const adminFunction = onCall(
 *   wrapCallable(async (request: CallableRequest) => {
 *     assertAdmin(request);
 *     // ... user is admin here
 *   }, 'adminFunction')
 * );
 * ```
 */
export function assertAdmin(request: CallableRequest): void {
  assertAuthenticated(request);
  const role = request.auth?.token?.role;
  if (role !== 'admin') {
    throw new HttpsError('permission-denied', 'Admin access required.');
  }
}

/**
 * Asserts that the authenticated user has the employee role.
 * Checks custom claims for role === 'employee'.
 *
 * @param request - The callable request object
 * @throws {HttpsError} unauthenticated if not authenticated
 * @throws {HttpsError} permission-denied if role is not employee
 *
 * @example
 * ```typescript
 * export const employeeFunction = onCall(
 *   wrapCallable(async (request: CallableRequest) => {
 *     assertEmployee(request);
 *     // ... user is employee here
 *   }, 'employeeFunction')
 * );
 * ```
 */
export function assertEmployee(request: CallableRequest): void {
  assertAuthenticated(request);
  const role = request.auth?.token?.role;
  if (role !== 'employee') {
    throw new HttpsError('permission-denied', 'Employee access required.');
  }
}

/**
 * Gets the authenticated user's UID.
 * Throws if not authenticated.
 *
 * @param request - The callable request object
 * @returns The user's UID
 * @throws {HttpsError} unauthenticated if request.auth is null/undefined
 *
 * @example
 * ```typescript
 * export const myFunction = onCall(
 *   wrapCallable(async (request: CallableRequest) => {
 *     const userId = requireAuthUid(request);
 *     // ... use userId
 *   }, 'myFunction')
 * );
 * ```
 */
export function requireAuthUid(request: CallableRequest): string {
  assertAuthenticated(request);
  return request.auth!.uid;
}
