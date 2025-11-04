# Backend API Requirements - UI/UX Overhaul

## Overview
This document specifies new backend API endpoints required for the mobile app UI/UX overhaul. These endpoints provide data that is currently not available but needed for the new designs.

**Backend Technology**: Cloud Functions (Firebase Functions)

**API Base URL**: `/api` (configured in client)

---

## New Endpoints Required

### 1. Leave Balance/Quota API

**Endpoint**: `GET /api/leaves/balance`

**Purpose**: Get employee's leave quota and usage summary

**Authentication**: Required (Firebase Auth token)

**Referenced in**: `04-leave-management.md`

#### Request
```http
GET /api/leaves/balance
Authorization: Bearer <firebase-token>
```

#### Response
```json
{
  "total": 12,
  "used": 2,
  "remaining": 10,
  "year": 2025,
  "breakdown": {
    "sick": {
      "total": 5,
      "used": 1,
      "remaining": 4
    },
    "casual": {
      "total": 7,
      "used": 1,
      "remaining": 6
    }
  }
}
```

#### Response Fields
| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Total leave days allocated for the year |
| `used` | number | Number of leave days used |
| `remaining` | number | Remaining leave days |
| `year` | number | Year for which the balance applies |
| `breakdown` | object | Optional breakdown by leave type |

#### Error Responses
- `401 Unauthorized` - Invalid or missing auth token
- `404 Not Found` - Employee not found
- `500 Internal Server Error` - Server error

#### Implementation Notes
```typescript
// functions/src/services/leaves.ts
export async function getLeaveBalance(employeeId: string, year?: number): Promise<LeaveBalance> {
  const currentYear = year || new Date().getFullYear();

  // Get company settings for total leave allocation
  const settings = await getCompanySettings();
  const totalLeaves = settings.leaveQuota || 12;

  // Query approved/pending leaves for the year
  const leavesSnapshot = await db.collection('leaves')
    .where('employeeId', '==', employeeId)
    .where('status', 'in', ['approved', 'pending'])
    .where('startDate', '>=', new Date(currentYear, 0, 1))
    .where('startDate', '<=', new Date(currentYear, 11, 31))
    .get();

  // Calculate used days
  let usedDays = 0;
  leavesSnapshot.forEach(doc => {
    const leave = doc.data();
    const start = leave.startDate.toDate();
    const end = leave.endDate.toDate();
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    usedDays += days;
  });

  return {
    total: totalLeaves,
    used: usedDays,
    remaining: totalLeaves - usedDays,
    year: currentYear,
  };
}
```

---

### 2. Penalty Summary API

**Endpoint**: `GET /api/penalties/summary`

**Purpose**: Get aggregated penalty statistics

**Authentication**: Required (Firebase Auth token)

**Referenced in**: `07-penalties.md`, `08-resources.md`

#### Request
```http
GET /api/penalties/summary
Authorization: Bearer <firebase-token>
```

#### Response
```json
{
  "activeCount": 3,
  "totalAmount": 245,
  "byStatus": {
    "active": {
      "count": 3,
      "amount": 245
    },
    "waived": {
      "count": 1,
      "amount": 50
    },
    "paid": {
      "count": 2,
      "amount": 100
    },
    "disputed": {
      "count": 0,
      "amount": 0
    }
  }
}
```

#### Response Fields
| Field | Type | Description |
|-------|------|-------------|
| `activeCount` | number | Number of active penalties |
| `totalAmount` | number | Total amount of active penalties |
| `byStatus` | object | Penalty counts and amounts by status |
| `byStatus.<status>.count` | number | Count of penalties with this status |
| `byStatus.<status>.amount` | number | Total amount for this status |

#### Error Responses
- `401 Unauthorized` - Invalid or missing auth token
- `404 Not Found` - Employee not found
- `500 Internal Server Error` - Server error

#### Implementation Notes
```typescript
// functions/src/services/penalties.ts
export async function getPenaltySummary(employeeId: string): Promise<PenaltySummary> {
  const penaltiesSnapshot = await db.collection('penalties')
    .where('employeeId', '==', employeeId)
    .get();

  const summary = {
    activeCount: 0,
    totalAmount: 0,
    byStatus: {
      active: { count: 0, amount: 0 },
      waived: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      disputed: { count: 0, amount: 0 },
    },
  };

  penaltiesSnapshot.forEach(doc => {
    const penalty = doc.data();
    const status = penalty.status || 'active';
    const amount = penalty.amount || 0;

    summary.byStatus[status].count++;
    summary.byStatus[status].amount += amount;

    if (status === 'active') {
      summary.activeCount++;
      summary.totalAmount += amount;
    }
  });

  return summary;
}
```

---

### 3. Holiday List API

**Endpoint**: `GET /api/holidays`

**Purpose**: Get list of company holidays

**Authentication**: Required (Firebase Auth token)

**Referenced in**: `08-resources.md`

#### Request
```http
GET /api/holidays?year=2025
Authorization: Bearer <firebase-token>
```

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `year` | number | No | Year to fetch holidays for (defaults to current year) |

#### Response
```json
{
  "holidays": [
    {
      "id": "holiday-1",
      "name": "New Year's Day",
      "date": "2025-01-01",
      "type": "public",
      "description": "New Year celebration"
    },
    {
      "id": "holiday-2",
      "name": "Independence Day",
      "date": "2025-08-15",
      "type": "public",
      "description": "National Independence Day"
    }
  ]
}
```

#### Response Fields
| Field | Type | Description |
|-------|------|-------------|
| `holidays` | array | Array of holiday objects |
| `holidays[].id` | string | Unique holiday identifier |
| `holidays[].name` | string | Holiday name |
| `holidays[].date` | string | Holiday date (ISO 8601 format) |
| `holidays[].type` | string | Holiday type ('public', 'company', 'optional') |
| `holidays[].description` | string | Optional description |

#### Error Responses
- `401 Unauthorized` - Invalid or missing auth token
- `500 Internal Server Error` - Server error

#### Firestore Collection Structure
```
holidays/
  {holidayId}/
    name: string
    date: Timestamp
    type: string
    description?: string
    year: number
    companyId?: string
```

#### Implementation Notes
```typescript
// functions/src/services/holidays.ts
export async function getHolidays(year?: number): Promise<Holiday[]> {
  const currentYear = year || new Date().getFullYear();

  const holidaysSnapshot = await db.collection('holidays')
    .where('year', '==', currentYear)
    .orderBy('date', 'asc')
    .get();

  return holidaysSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    date: doc.data().date.toDate().toISOString().split('T')[0],
  }));
}

// Admin function to create holidays
export async function createHoliday(holiday: CreateHolidayRequest): Promise<string> {
  const docRef = await db.collection('holidays').add({
    name: holiday.name,
    date: admin.firestore.Timestamp.fromDate(new Date(holiday.date)),
    type: holiday.type || 'public',
    description: holiday.description || null,
    year: new Date(holiday.date).getFullYear(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return docRef.id;
}
```

---

### 4. Mark All Notifications as Read

**Endpoint**: `POST /api/notifications/mark-all-read`

**Purpose**: Mark all notifications as read for the user

**Authentication**: Required (Firebase Auth token)

**Referenced in**: `06-notifications.md`

#### Request
```http
POST /api/notifications/mark-all-read
Authorization: Bearer <firebase-token>
```

#### Response
```json
{
  "success": true,
  "markedCount": 15
}
```

#### Response Fields
| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the operation succeeded |
| `markedCount` | number | Number of notifications marked as read |

#### Error Responses
- `401 Unauthorized` - Invalid or missing auth token
- `500 Internal Server Error` - Server error

#### Implementation Notes
```typescript
// functions/src/services/notifications.ts
export async function markAllNotificationsAsRead(employeeId: string): Promise<number> {
  const batch = db.batch();

  const unreadNotifications = await db.collection('notifications')
    .where('employeeId', '==', employeeId)
    .where('isRead', '==', false)
    .get();

  unreadNotifications.forEach(doc => {
    batch.update(doc.ref, {
      isRead: true,
      readAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();

  return unreadNotifications.size;
}
```

---

## Existing Endpoints (Verify & Enhance)

### Password Reset Email
**Endpoint**: Uses Firebase Auth directly (no custom endpoint needed)

**Implementation**:
```typescript
// Client-side (already exists in Firebase Auth)
await firebase.auth().sendPasswordResetEmail(email);
```

**Referenced in**: `01-login.md`

---

## Security Considerations

### Authentication
All endpoints require Firebase Auth token in Authorization header:
```
Authorization: Bearer <firebase-id-token>
```

### Authorization
- Employees can only access their own data
- Admin users can access all employees' data
- Verify user permissions in each endpoint

### Rate Limiting
Implement rate limiting for:
- Login attempts
- Password reset requests
- API calls (general)

---

## Testing Requirements

### Unit Tests
Each new endpoint should have:
- Valid request test
- Invalid auth test
- Error handling test
- Edge case tests

### Integration Tests
- Full flow tests for each feature
- Multi-user scenarios
- Performance tests

---

## Implementation Priority

### Phase 1 - Critical (Week 1)
1. Leave Balance API
2. Penalty Summary API

### Phase 2 - Important (Week 2)
3. Holiday List API
4. Mark All Notifications as Read

### Phase 3 - Enhancements (Week 3)
- Performance optimizations
- Caching strategies
- Additional error handling

---

## Related Documents

- `04-leave-management.md` - Leave balance usage
- `07-penalties.md` - Penalty summary usage
- `08-resources.md` - Resources hub (penalties badge, holiday list)
- `06-notifications.md` - Mark all read feature
- `01-login.md` - Password reset flow

---

## API Documentation

Once implemented, add to:
- `docs/api/openapi.yaml` - OpenAPI specification
- `docs/api/README.md` - API documentation

---

## Notes

- All dates should be in ISO 8601 format
- All amounts should be numbers (not strings)
- Use proper HTTP status codes
- Include descriptive error messages
- Log all errors for debugging
- Consider pagination for large datasets (holidays, notifications)
