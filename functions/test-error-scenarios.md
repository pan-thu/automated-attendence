# Error Scenario Test Suite

## Purpose

Verify that all error scenarios return structured `HttpsError` codes instead of generic "internal" errors after migration to 2nd-gen Cloud Functions.

---

## Test Scenarios

### Scenario 1: Unauthenticated Request ❌ AUTH

**Test**: Call admin function without authentication

**Function**: `getDashboardStats`

**Expected Error**:
```json
{
  "code": "functions/unauthenticated",
  "message": "Authentication required."
}
```

**How to Test**:

**Via Emulator UI**:
1. Open `http://localhost:4000`
2. Go to Functions tab
3. Select `getDashboardStats`
4. Click "Run" without auth token
5. Verify error code and message

**Via curl**:
```bash
curl -X POST http://localhost:5001/automated-attendence-6fc07/us-central1/getDashboardStats \
  -H "Content-Type: application/json" \
  -d '{"data":{"date":"2025-10-12"}}'
```

**Via Admin Dashboard**:
1. Log out of admin dashboard
2. Try to access `/` (dashboard page)
3. Should redirect to `/login`
4. Open browser console and try calling function directly:
```javascript
const functions = getFunctions(getFirebaseApp());
const callable = httpsCallable(functions, 'getDashboardStats');
callable({ date: '2025-10-12' }).catch(console.error);
// Should log: { code: 'functions/unauthenticated', message: '...' }
```

---

### Scenario 2: Permission Denied (Employee calling Admin function) 🚫 PERMISSION

**Test**: Authenticated employee calls admin-only function

**Function**: `updateCompanySettings`

**Expected Error**:
```json
{
  "code": "functions/permission-denied",
  "message": "Admin access required."
}
```

**How to Test**:

**Via Admin Dashboard (with employee account)**:
1. Create employee account via admin dashboard
2. Log in as employee
3. Try to access `/settings` page (admin only)
4. Should show error or redirect

**Via curl** (with employee ID token):
```bash
# Get employee ID token first
EMPLOYEE_TOKEN="<get-from-firebase-auth-emulator>"

curl -X POST http://localhost:5001/automated-attendence-6fc07/us-central1/updateCompanySettings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
  -d '{"data":{"companyName":"Test Corp"}}'
```

---

### Scenario 3: Invalid Input ⚠️ VALIDATION

**Test**: Call function with missing required fields

**Function**: `createEmployee`

**Expected Error**:
```json
{
  "code": "functions/invalid-argument",
  "message": "Invalid email format" // or similar validation message
}
```

**How to Test**:

**Via Admin Dashboard**:
1. Log in as admin
2. Go to Employees page → "Add Employee"
3. Leave email field empty or enter invalid email
4. Submit form
5. Should show validation error (not "internal")

**Test Cases**:
- Missing email: `{ fullName: "John Doe", password: "password123" }`
- Invalid email: `{ email: "not-an-email", fullName: "John", password: "pass123" }`
- Short password: `{ email: "test@example.com", fullName: "John", password: "123" }`
- Missing fullName: `{ email: "test@example.com", password: "password123" }`

**Via curl**:
```bash
# Missing email
curl -X POST http://localhost:5001/automated-attendence-6fc07/us-central1/createEmployee \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"data":{"fullName":"John Doe","password":"password123"}}'

# Expected: functions/invalid-argument
```

---

### Scenario 4: Business Logic Error (Failed Precondition) ❌ BUSINESS

**Test**: Try to approve an already-approved leave request

**Function**: `handleLeaveApproval`

**Expected Error**:
```json
{
  "code": "functions/failed-precondition",
  "message": "Leave request is already approved" // or similar business error
}
```

**How to Test**:

**Via Admin Dashboard**:
1. Log in as admin
2. Create a leave request (or have employee create one)
3. Approve the leave request
4. Try to approve it again
5. Should show business logic error (not "internal")

**Via curl**:
```bash
# Approve leave twice
curl -X POST http://localhost:5001/automated-attendence-6fc07/us-central1/handleLeaveApproval \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"data":{"requestId":"<leave-id>","action":"approve"}}'

# Run again - should fail
curl -X POST http://localhost:5001/automated-attendence-6fc07/us-central1/handleLeaveApproval \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"data":{"requestId":"<leave-id>","action":"approve"}}'

# Expected: functions/failed-precondition
```

---

### Scenario 5: Not Found Error 🔍 NOT FOUND

**Test**: Try to operate on non-existent resource

**Function**: `updateEmployee`

**Expected Error**:
```json
{
  "code": "functions/not-found",
  "message": "The specified user does not exist." // or similar
}
```

**How to Test**:

**Via curl**:
```bash
# Try to update non-existent employee
curl -X POST http://localhost:5001/automated-attendence-6fc07/us-central1/updateEmployee \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"data":{"uid":"nonexistent-uid-12345","fullName":"Updated Name"}}'

# Expected: functions/not-found
```

---

### Scenario 6: Unexpected Service Error (Fallback to Internal) 💥 INTERNAL

**Test**: Simulate unexpected error in service layer

**Function**: Any function with complex business logic

**Expected Error**:
```json
{
  "code": "functions/internal",
  "message": "An unexpected error occurred. Please check server logs or contact support.",
  "details": {
    "functionName": "updateCompanySettings",
    "timestamp": "2025-10-12T..."
  }
}
```

**Note**: This scenario requires:
- Uncaught exception in service layer
- Check emulator logs for detailed error information
- Verify detailed logging (stack trace, context)

**How to Test**:

**Temporarily introduce error** (for testing only):
1. Edit a service function to throw error
2. Call the function
3. Verify structured error response
4. Check emulator logs for detailed error info
5. Revert the test error

**Example**:
```typescript
// In functions/src/services/settings.ts (temporary test code)
export async function updateCompanySettings(payload: any, requesterUid: string) {
  throw new Error('Simulated unexpected error'); // TEST ONLY
  // ... rest of function
}
```

Then call `updateCompanySettings` and verify:
- Client receives `functions/internal` with generic message
- Emulator logs show detailed error with stack trace

---

## Test Matrix

| Scenario | Function | Error Code | Message Contains | Verified |
|----------|----------|------------|------------------|----------|
| Unauthenticated | `getDashboardStats` | `unauthenticated` | "Authentication required" | ⬜ |
| Permission Denied | `updateCompanySettings` | `permission-denied` | "Admin access required" | ⬜ |
| Invalid Input - Missing | `createEmployee` | `invalid-argument` | Validation message | ⬜ |
| Invalid Input - Format | `createEmployee` | `invalid-argument` | Email/password validation | ⬜ |
| Business Logic | `handleLeaveApproval` | `failed-precondition` | Business reason | ⬜ |
| Not Found | `updateEmployee` | `not-found` | "does not exist" | ⬜ |
| Unexpected Error | Any | `internal` | "unexpected error" | ⬜ |

---

## Logging Verification Checklist

For each error scenario, verify emulator logs show:

### Success Logs (when function succeeds)
```
INFO: [functionName] Started { userId: '...', hasAuth: true, hasData: true }
INFO: [functionName] Completed successfully { userId: '...', durationMs: 123 }
```

### Error Logs (when function fails)
```
ERROR: [functionName] Failed {
  userId: '...',
  durationMs: 89,
  errorMessage: 'Authentication required',
  errorCode: 'unauthenticated',
  errorStack: '...' // if available
}
```

---

## Expected vs Actual Results

### ✅ Success Criteria

**Before Migration (1st-gen)**:
- ❌ Most errors: `functions/internal` with no details
- ❌ Minimal logging
- ❌ Hard to debug

**After Migration (2nd-gen)**:
- ✅ Structured error codes: `unauthenticated`, `permission-denied`, `invalid-argument`, `failed-precondition`, `not-found`
- ✅ Clear, actionable error messages
- ✅ Detailed logging with context
- ✅ Easy to debug from logs

---

## Automated Test Script (Optional)

Create a test script to run all scenarios:

```bash
#!/bin/bash
# functions/test-errors.sh

echo "Testing Error Scenarios..."

# Test 1: Unauthenticated
echo "\n1. Testing Unauthenticated..."
curl -s -X POST http://localhost:5001/automated-attendence-6fc07/us-central1/getDashboardStats \
  -H "Content-Type: application/json" \
  -d '{"data":{"date":"2025-10-12"}}' | jq

# Test 2: Invalid Input
echo "\n2. Testing Invalid Input..."
curl -s -X POST http://localhost:5001/automated-attendence-6fc07/us-central1/createEmployee \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"data":{"fullName":"John"}}' | jq

# Add more tests...
```

---

## Next Steps After Testing

1. ✅ Verify all error scenarios return structured errors
2. ✅ Check emulator logs for detailed error information
3. ✅ Confirm no "internal" errors in normal scenarios
4. ✅ Test admin dashboard error display
5. ➡️ Proceed to Phase 4 (Admin Operations Testing)
