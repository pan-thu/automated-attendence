# Cloud Functions Migration & Error Handling Workflow

## Executive Summary

This workflow addresses the "internal" error issues in Firebase Cloud Functions by:
1. Migrating from 1st-gen to 2nd-gen Cloud Functions (Node.js 22 compatible)
2. Implementing comprehensive error mapping with `HttpsError`
3. Adding structured logging for debugging
4. Fixing region configuration in the admin dashboard

**Timeline**: 2-3 hours
**Risk Level**: Medium (requires redeployment of all functions)
**Rollback Strategy**: Git branch with ability to redeploy 1st-gen if needed

---

## Current Issues Identified

### 🔴 Critical Issues
1. **Runtime Mismatch**: Using Node.js 22 with 1st-gen functions (unsupported)
2. **Missing Error Mapping**: Service errors thrown without `HttpsError` wrapper → "internal" on client
3. **Region Not Configured**: Admin dashboard doesn't specify function region
4. **No Logging**: Failed callables don't log detailed error information

### 🟡 Impact
- Admin dashboard users see cryptic "internal" errors with no actionable information
- Debugging requires manual Cloud Logging inspection
- Poor developer experience and operational visibility

---

## Implementation Workflow

### Phase 1: Preparation & Setup (15 minutes)

#### 1.1 Create Feature Branch
```bash
git checkout -b feature/migrate-2nd-gen-functions
```

#### 1.2 Backup Current State
```bash
# Tag current production state for easy rollback
git tag backup/pre-2nd-gen-migration
git push origin backup/pre-2nd-gen-migration
```

#### 1.3 Update Environment Variables
Create `admin/.env.local` (if not exists) and add:
```
NEXT_PUBLIC_FUNCTIONS_REGION=us-central1
```
*(Adjust region based on your Firebase project location)*

#### 1.4 Verify Firebase Project Region
```bash
firebase functions:list
# Note the region (e.g., us-central1, europe-west1)
```

---

### Phase 2: Migrate to 2nd-Gen Functions (45 minutes)

#### 2.1 Update Package Dependencies
**File**: `functions/package.json`

No changes needed - `firebase-functions@6.4.0` already supports 2nd-gen.
Node.js 22 is already configured correctly.

#### 2.2 Create Error Wrapper Utility
**File**: `functions/src/utils/callableWrapper.ts` (NEW FILE)

```typescript
import * as functions from 'firebase-functions';
import { HttpsError, CallableRequest } from 'firebase-functions/v2/https';

/**
 * Wraps a callable function handler with consistent error mapping and logging
 * Converts uncaught errors to HttpsError to prevent "internal" error on client
 */
export function wrapCallable<T = any, R = any>(
  handler: (request: CallableRequest<T>) => Promise<R>,
  functionName: string
) {
  return async (request: CallableRequest<T>): Promise<R> => {
    const startTime = Date.now();
    const userId = request.auth?.uid || 'unauthenticated';

    try {
      functions.logger.info(`[${functionName}] Started`, {
        userId,
        hasData: !!request.data,
      });

      const result = await handler(request);

      const duration = Date.now() - startTime;
      functions.logger.info(`[${functionName}] Completed successfully`, {
        userId,
        durationMs: duration,
      });

      return result;
    } catch (err: any) {
      const duration = Date.now() - startTime;

      // Log detailed error information
      functions.logger.error(`[${functionName}] Failed`, {
        userId,
        durationMs: duration,
        errorMessage: err?.message,
        errorCode: err?.code,
        errorStack: err?.stack,
        errorDetails: err?.details,
      });

      // If it's already an HttpsError, rethrow as-is
      if (err instanceof HttpsError) {
        throw err;
      }

      // If it's a functions.https.HttpsError (1st gen), convert to 2nd gen
      if (err?.code && typeof err.code === 'string' && err?.message) {
        throw new HttpsError(
          err.code as any,
          err.message,
          err.details
        );
      }

      // Convert unknown errors to structured HttpsError
      throw new HttpsError(
        'internal',
        'An unexpected error occurred. Please check server logs or contact support.',
        {
          functionName,
          timestamp: new Date().toISOString(),
          errorType: err?.constructor?.name,
        }
      );
    }
  };
}
```

#### 2.3 Create 2nd-Gen Compatible Auth Utils
**File**: `functions/src/utils/authV2.ts` (NEW FILE)

```typescript
import { HttpsError, CallableRequest } from 'firebase-functions/v2/https';

export type CallableRequestV2<T = any> = CallableRequest<T>;

/**
 * Asserts that the request is authenticated
 */
export function assertAuthenticated(request: CallableRequest): void {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }
}

/**
 * Asserts that the authenticated user has the admin role
 */
export function assertAdmin(request: CallableRequest): void {
  assertAuthenticated(request);
  const role = request.auth?.token?.role;
  if (role !== 'admin') {
    throw new HttpsError('permission-denied', 'Admin access required.');
  }
}

/**
 * Asserts that the authenticated user has the employee role
 */
export function assertEmployee(request: CallableRequest): void {
  assertAuthenticated(request);
  const role = request.auth?.token?.role;
  if (role !== 'employee') {
    throw new HttpsError('permission-denied', 'Employee access required.');
  }
}

/**
 * Gets the authenticated user's UID (throws if not authenticated)
 */
export function requireAuthUid(request: CallableRequest): string {
  assertAuthenticated(request);
  return request.auth!.uid;
}
```

#### 2.4 Migrate Functions to 2nd-Gen API
**File**: `functions/src/index.ts`

Replace imports:
```typescript
// OLD (1st gen)
import * as functions from 'firebase-functions';

// NEW (2nd gen for callables)
import * as functions from 'firebase-functions';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
```

Add wrapper import:
```typescript
import { wrapCallable } from './utils/callableWrapper';
import {
  assertAdmin,
  assertAuthenticated,
  assertEmployee,
  requireAuthUid,
  type CallableRequestV2,
} from './utils/authV2';
```

#### 2.5 Convert Individual Functions (Example Pattern)

**BEFORE (1st gen)**:
```typescript
export const updateCompanySettings = functions.https.onCall(async (data, context) => {
  const ctx = (context as unknown) as CallableContext;
  assertAdmin(ctx);
  const payload = assertPayload<Record<string, unknown>>(data);

  await updateCompanySettingsService(payload, requireAuthUid(ctx));

  await recordAuditLog({
    action: 'update_company_settings',
    resource: 'COMPANY_SETTINGS',
    resourceId: 'main',
    status: 'success',
    performedBy: requireAuthUid(ctx),
    newValues: payload,
  });

  return { success: true };
});
```

**AFTER (2nd gen with error wrapper)**:
```typescript
export const updateCompanySettings = onCall(
  wrapCallable(async (request: CallableRequestV2<Record<string, unknown>>) => {
    assertAdmin(request);
    const payload = assertPayload<Record<string, unknown>>(request.data);

    await updateCompanySettingsService(payload, requireAuthUid(request));

    await recordAuditLog({
      action: 'update_company_settings',
      resource: 'COMPANY_SETTINGS',
      resourceId: 'main',
      status: 'success',
      performedBy: requireAuthUid(request),
      newValues: payload,
    });

    return { success: true };
  }, 'updateCompanySettings')
);
```

**Key Changes**:
- `functions.https.onCall` → `onCall` (from v2/https)
- `(data, context)` → `(request)` with `request.data` and `request.auth`
- Wrapped with `wrapCallable()` for error handling
- Use `authV2` helpers instead of `auth.ts` (cast-free)

#### 2.6 Functions to Migrate (Complete List)

Admin Functions (16):
- `setUserRole`
- `createEmployee`
- `updateEmployee`
- `toggleUserStatus`
- `manualSetAttendance`
- `handleLeaveApproval`
- `updateCompanySettings`
- `waivePenalty`
- `calculateMonthlyViolations`
- `generateAttendanceReport`
- `getDashboardStats`
- `sendNotification`
- `sendBulkNotification`
- `triggerDailyAnalyticsAggregation`
- `triggerMonthlyAnalyticsAggregation`

Employee Functions (14):
- `handleClockIn`
- `getEmployeeProfile`
- `getEmployeeDashboard`
- `getCompanySettingsPublic`
- `listEmployeeAttendance`
- `getAttendanceDayDetail`
- `submitLeaveRequest`
- `cancelLeaveRequest`
- `listEmployeeLeaves`
- `generateLeaveAttachmentUploadUrl`
- `registerLeaveAttachment`
- `listEmployeeNotifications`
- `markNotificationRead`
- `listEmployeePenalties`
- `acknowledgePenalty`
- `registerDeviceToken`

Scheduled Functions (2):
- `scheduledPenaltyAutomation` (already 2nd gen)
- `scheduledDailyClockInReminder` (already 2nd gen)

---

### Phase 3: Update Admin Dashboard Client (20 minutes)

#### 3.1 Configure Region
**File**: `admin/src/lib/firebase/functions.ts`

```typescript
import { getFunctions, httpsCallable, type Functions } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/config";

let functionsInstance: Functions | null = null;

// Read region from environment variable
const FUNCTIONS_REGION = process.env.NEXT_PUBLIC_FUNCTIONS_REGION || "us-central1";

const getCallableInstance = () => {
  if (typeof window === "undefined") {
    throw new Error("Firebase Functions are only available in the browser environment.");
  }

  if (!functionsInstance) {
    // FIXED: Specify region explicitly
    functionsInstance = getFunctions(getFirebaseApp(), FUNCTIONS_REGION);
  }

  return functionsInstance;
};

// ... rest of file unchanged
```

#### 3.2 Add Better Error Handling (Optional Enhancement)
**File**: `admin/src/lib/error-handler.ts` (existing file)

Add function to parse structured errors:
```typescript
export function parseFirebaseError(error: any): string {
  if (error?.code === 'functions/unauthenticated') {
    return 'You must be logged in to perform this action.';
  }

  if (error?.code === 'functions/permission-denied') {
    return 'You do not have permission to perform this action.';
  }

  if (error?.code === 'functions/not-found') {
    return 'The requested resource was not found.';
  }

  if (error?.code === 'functions/invalid-argument') {
    return error?.message || 'Invalid request. Please check your input.';
  }

  if (error?.code === 'functions/failed-precondition') {
    return error?.message || 'The operation cannot be completed at this time.';
  }

  if (error?.code === 'functions/internal') {
    // With our new error mapping, this should include useful details
    return error?.message || 'An internal server error occurred. Please try again later.';
  }

  return error?.message || 'An unexpected error occurred.';
}
```

Update existing error handlers to use this function where Firebase Functions are called.

---

### Phase 4: Testing (30 minutes)

#### 4.1 Local Emulator Testing
```bash
cd functions

# Build TypeScript
npm run build

# Start emulators
npm run serve
```

Configure Flutter/Admin to use emulators:
- Admin: `connectFunctionsEmulator(functionsInstance, "localhost", 5001)`
- Flutter: Similar configuration in Firebase initialization

#### 4.2 Test Error Scenarios
Test each scenario and verify structured errors (not "internal"):

1. **Unauthenticated Call**
   - Expected: `functions/unauthenticated` with clear message

2. **Permission Denied**
   - Employee calling admin function
   - Expected: `functions/permission-denied` with clear message

3. **Invalid Input**
   - Missing required fields
   - Expected: `functions/invalid-argument` with validation message

4. **Business Logic Error**
   - E.g., approving already-approved leave
   - Expected: `functions/failed-precondition` with business reason

5. **Unexpected Service Error**
   - Simulate Firestore failure
   - Expected: `functions/internal` with generic message + detailed logs

#### 4.3 Verify Logging
Check emulator logs for:
- Function start/completion messages
- Duration tracking
- Detailed error information (stack traces, context)

#### 4.4 Admin Dashboard Integration Test
Test critical admin workflows:
- Update company settings
- Create/update employee
- Manual attendance adjustment
- Leave approval
- Waive penalty

Verify:
- No "internal" errors
- Clear error messages displayed to user
- Operations complete successfully

---

### Phase 5: Deployment (20 minutes)

#### 5.1 Build and Validate
```bash
cd functions
npm run build

# Check for TypeScript errors
npm run build -- --noEmit
```

#### 5.2 Deploy to Firebase
```bash
# Deploy ONLY functions (don't touch Firestore rules/indexes)
firebase deploy --only functions

# Alternative: Deploy specific functions first (test deployment)
firebase deploy --only functions:updateCompanySettings,functions:getDashboardStats
```

#### 5.3 Monitor Deployment
```bash
# Watch function logs during deployment
firebase functions:log --only updateCompanySettings
```

#### 5.4 Post-Deployment Verification
1. Check Firebase Console → Functions tab
   - Verify all functions show "2nd gen" label
   - Check deployment status (all green)

2. Test production admin dashboard
   - Clear browser cache (new functions instance)
   - Test critical operations
   - Verify no "internal" errors

3. Monitor Cloud Logging
   ```bash
   # Check for any deployment-related errors
   firebase functions:log --only updateCompanySettings,waivePenalty,getDashboardStats
   ```

---

### Phase 6: Rollback Plan (if needed)

#### 6.1 Immediate Rollback
If critical issues arise:

```bash
# Revert code changes
git checkout main

# Downgrade runtime
cd functions
# Change package.json: "node": "20"

# Restore 1st-gen function signatures
# Redeploy
npm run build
firebase deploy --only functions
```

#### 6.2 Restore Previous Version via Firebase Console
1. Go to Firebase Console → Functions
2. Select function → "Version History"
3. Rollback to previous version

---

## Validation Checklist

### Pre-Deployment
- [ ] All functions migrated to 2nd-gen API
- [ ] Error wrapper applied to all callables
- [ ] Auth helpers updated to v2 API
- [ ] Region configured in admin dashboard
- [ ] TypeScript compiles without errors
- [ ] Emulator tests pass for all error scenarios
- [ ] Admin dashboard connects to emulator successfully

### Post-Deployment
- [ ] All functions show "2nd gen" in Firebase Console
- [ ] No "internal" errors in admin dashboard
- [ ] Structured error messages display correctly
- [ ] Cloud Logging shows detailed error information
- [ ] Admin operations complete successfully
- [ ] Employee mobile app continues to work (if deployed)
- [ ] Scheduled functions trigger correctly

### Monitoring (48 hours)
- [ ] No error rate increase in Cloud Monitoring
- [ ] Function latency remains stable
- [ ] No unexpected "internal" errors in logs
- [ ] User-reported issues resolved

---

## Migration Script Reference

For bulk migration, consider this helper script pattern:

```typescript
// functions/src/migrations/convertTo2ndGen.ts
import * as fs from 'fs';
import * as path from 'path';

const FUNCTION_PATTERN = /export const (\w+) = functions\.https\.onCall\(async \(data, context\)/g;

function convertFunction(source: string): string {
  // Pattern matching and replacement logic
  // Converts 1st-gen signature to 2nd-gen + wrapper

  return source
    .replace(/functions\.https\.onCall\(/g, 'onCall(wrapCallable(')
    .replace(/async \(data, context\)/g, 'async (request: CallableRequestV2)')
    .replace(/const ctx = \(context as unknown\) as CallableContext;/g, '')
    .replace(/requireAuthUid\(ctx\)/g, 'requireAuthUid(request)')
    .replace(/assertAdmin\(ctx\)/g, 'assertAdmin(request)')
    .replace(/assertEmployee\(ctx\)/g, 'assertEmployee(request)')
    .replace(/assertPayload<([^>]+)>\(data\)/g, 'assertPayload<$1>(request.data)')
    // Add closing for wrapCallable
    + ', "functionName")';
}

// Usage: ts-node src/migrations/convertTo2ndGen.ts
const indexPath = path.join(__dirname, '../index.ts');
const content = fs.readFileSync(indexPath, 'utf8');
const converted = convertFunction(content);
fs.writeFileSync(indexPath, converted);
```

---

## Performance Considerations

### 2nd-Gen Benefits
- **Cold Start**: Similar to 1st-gen for Node.js functions
- **Concurrency**: Better handling of concurrent requests (default 80 vs 1)
- **Memory**: More flexible memory allocation
- **Timeout**: Up to 60 minutes (vs 9 minutes for 1st-gen)

### Potential Issues
- **Pricing**: 2nd-gen uses Cloud Run pricing (may differ from 1st-gen)
- **VPC**: Different VPC connector configuration if needed
- **Triggers**: Some trigger types work differently (mostly scheduled)

---

## Documentation Updates Required

After successful migration:

1. **Update README.md**
   - Note 2nd-gen requirement
   - Update deployment commands if changed

2. **Update docs/technical.md**
   - Document new error handling strategy
   - Update function signature examples

3. **Update CLAUDE.md**
   - Update "Backend Architecture" section
   - Note error wrapper pattern for new functions

---

## Estimated Timeline

| Phase | Duration | Parallelizable |
|-------|----------|----------------|
| Preparation | 15 min | No |
| Backend Migration | 45 min | Partially (multiple functions) |
| Client Updates | 20 min | Yes (admin + mobile) |
| Testing | 30 min | No |
| Deployment | 20 min | No |
| **Total** | **~2.5 hours** | |

**Note**: Timeline assumes familiarity with the codebase. First-time migration may take 3-4 hours.

---

## Success Metrics

Post-migration, track:

1. **Error Rate**: Should decrease (better error handling)
2. **Debug Time**: Faster issue resolution (better logging)
3. **User Experience**: Clear error messages, no "internal" errors
4. **Developer Experience**: Easier to add new functions with error wrapper

## Next Steps After Migration

1. **Add Integration Tests**: Test error scenarios in CI/CD
2. **Implement Error Monitoring**: Set up alerts for specific error codes
3. **Document Error Codes**: Create user-facing error code reference
4. **Optimize Logging**: Add structured logging for analytics

---

## Questions & Troubleshooting

### Q: What if I deploy and see "internal" errors still?
**A**: Check Cloud Logging for the actual error. Likely causes:
- Service function threw non-HttpsError (add wrapper there too)
- Region mismatch (double-check NEXT_PUBLIC_FUNCTIONS_REGION)
- App Check enforcement (verify configuration)

### Q: Can I migrate gradually (some functions at a time)?
**A**: No - mixing 1st-gen and 2nd-gen in same codebase causes issues. Migrate all or none.

### Q: Do I need to update Flutter client?
**A**: No - client SDK handles both 1st-gen and 2nd-gen transparently. Only region config matters.

### Q: What about Firebase Functions pricing changes?
**A**: 2nd-gen uses Cloud Run pricing. For most workloads, cost is similar or lower due to better concurrency. Monitor first month.

---

## References

- [Firebase Functions 2nd Gen Documentation](https://firebase.google.com/docs/functions/2nd-gen)
- [Migration Guide (1st → 2nd gen)](https://firebase.google.com/docs/functions/2nd-gen-upgrade)
- [HttpsError Codes](https://firebase.google.com/docs/reference/node/firebase.functions.https.HttpsError)
- [Error Handling Best Practices](https://firebase.google.com/docs/functions/callable#handle_errors)
