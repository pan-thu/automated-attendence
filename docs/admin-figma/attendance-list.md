# Attendance List – Implementation Workflow

Last updated: 2025-11-01
Figma Link: https://www.figma.com/design/zFhrSTYRqCIwzl7vMDUJi5/AttenDesk?node-id=15-5613

## 1. Overview & Scope

### Purpose
The Attendance Records page provides a comprehensive view of all employee attendance data with advanced filtering, real-time status monitoring, and the ability to manually adjust attendance records. It serves as the primary interface for tracking daily check-ins, breaks, and check-outs.

### Key User Flows
- **Primary**: View today's attendance → Monitor check-in/out times → Track status
- **Secondary**: Filter by date/employee → Search records → Export data
- **Tertiary**: View details → Manual adjustments → Handle exceptions

### Entry/Exit Points
- **Entry**: Dashboard navigation, sidebar menu, notification links
- **Exit**: Employee profile, detailed view modal, export downloads

### Dependencies
- Firebase Firestore for real-time attendance data
- `useAttendanceRecords` hook for data fetching
- `useManualAttendance` hook for adjustments
- Export utilities for CSV generation
- Real-time Firebase listeners for live updates

## 2. Component Inventory

| Component | Type | Figma Source | Implementation Path | Status |
|-----------|------|--------------|-------------------|---------|
| Filter Bar | Controls | Top Section | `components/attendance/FilterBar.tsx` | New |
| Date Range Picker | Input | Date Range | `components/ui/date-picker.tsx` | Exists |
| Status Filter | Select | Status Dropdown | `components/ui/select.tsx` | Exists |
| Employee Filter | Select | Employee Dropdown | `components/ui/combobox.tsx` | New |
| Source Filter | Select | Source Dropdown | `components/ui/select.tsx` | Exists |
| Quick Filters | Buttons | Tab Buttons | `components/ui/toggle-group.tsx` | New |
| Data Table | Table | Main Grid | `components/ui/table.tsx` | Exists |
| Status Badge | Display | Status Column | `components/ui/badge.tsx` | Exists |
| Time Display | Display | Time Columns | `components/attendance/TimeDisplay.tsx` | New |
| Export Button | Action | Top Right | `components/ui/button.tsx` | Exists |
| Refresh Button | Action | Top Right | `components/ui/button.tsx` | Exists |

### Design Tokens
```scss
// Table Specific
$row-height: 72px;
$header-height: 56px;
$avatar-size: 40px;

// Status Colors
$status-present: #10B981;
$status-late: #F59E0B;
$status-halfday: #F59E0B;
$status-absent: #EF4444;
$status-onleave: #3B82F6;
$status-vacation: #8B5CF6;

// Time Colors
$time-ontime: #10B981;
$time-late: #EF4444;
$time-missing: #9CA3AF;

// Filter Pills
$filter-active-bg: #111827;
$filter-inactive-bg: #F3F4F6;
```

## 3. Layout & Responsiveness

### Grid Layout
```css
.attendance-container {
  display: grid;
  grid-template-rows: auto auto auto 1fr auto;
  gap: 24px;
  padding: 24px;
}

.filter-section {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}

.quick-filters {
  display: flex;
  gap: 8px;
  padding: 4px;
  background: #F3F4F6;
  border-radius: 8px;
}

.table-container {
  overflow-x: auto;
  background: white;
  border-radius: 12px;
}

/* Column Layout */
.attendance-table {
  grid-template-columns:
    200px  /* Date */
    250px  /* Employee */
    120px  /* Check-in */
    120px  /* Break */
    120px  /* Check-out */
    120px  /* Status */
    100px; /* Actions */
}

@media (max-width: 1024px) {
  .hide-on-tablet {
    display: none;
  }
}

@media (max-width: 640px) {
  /* Switch to card view */
  .attendance-table {
    display: block;
  }

  .attendance-row {
    display: grid;
    grid-template-areas:
      "employee employee status"
      "checkin break checkout"
      "date date actions";
    padding: 16px;
    border-bottom: 1px solid #E5E7EB;
  }
}
```

## 4. State & Data Model Mapping

### Attendance State Model
```typescript
interface AttendanceListState {
  records: AttendanceRecord[];
  filters: {
    dateRange: {
      start: Date;
      end: Date;
    };
    quickFilter: 'today' | 'week' | 'late' | 'checkOut' | 'overtime';
    status: 'all' | 'present' | 'late' | 'absent' | 'halfday' | 'onleave';
    employee: string | null;
    source: 'all' | 'app' | 'manual' | 'system';
    missingCheck: boolean;
    search: string;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  summary: {
    present: number;
    late: number;
    absent: number;
    onLeave: number;
    issues: number;
  };
  ui: {
    isLoading: boolean;
    isRealtime: boolean;
    lastUpdated: Date;
  };
}

interface AttendanceRecord {
  id: string;
  date: Date;
  employee: {
    uid: string;
    name: string;
    employeeId: string;
    department: string;
    avatar?: string;
  };
  checks: {
    checkIn: {
      time: Date | null;
      status: 'on_time' | 'late' | null;
      location?: GeoPoint;
      isMocked?: boolean;
    };
    break: {
      out: Date | null;
      in: Date | null;
      duration: number;
    };
    checkOut: {
      time: Date | null;
      status: 'on_time' | 'early' | null;
      location?: GeoPoint;
    };
  };
  status: 'present' | 'late' | 'halfday' | 'absent' | 'onleave';
  workDuration: number;
  source: 'app' | 'manual' | 'system';
  notes?: string;
  modifiedBy?: string;
  modifiedAt?: Date;
}
```

## 5. API Contracts (Proposed)

### List Attendance Records
```typescript
// GET /api/attendance
interface AttendanceListRequest {
  startDate: string;
  endDate: string;
  employeeId?: string;
  status?: string[];
  source?: string;
  page?: number;
  pageSize?: number;
  includeRealtime?: boolean;
}

interface AttendanceListResponse {
  records: AttendanceRecord[];
  summary: {
    byStatus: Record<string, number>;
    issues: {
      missingCheckIn: number;
      missingCheckOut: number;
      lateArrivals: number;
    };
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}
```

### Manual Attendance Adjustment
```typescript
// POST /api/attendance/manual
interface ManualAttendanceRequest {
  employeeId: string;
  date: string;
  checks: {
    checkIn?: string;
    breakOut?: string;
    breakIn?: string;
    checkOut?: string;
  };
  reason: string;
}

interface ManualAttendanceResponse {
  success: boolean;
  recordId: string;
  auditLogId: string;
}
```

## 6. Interaction & Accessibility

### Table Interactions
```typescript
const tableInteractions = {
  row: {
    click: 'Open details modal',
    hover: 'Highlight row'
  },
  timeCell: {
    hover: 'Show tooltip with location/source',
    click: 'Open edit modal (if permitted)'
  },
  quickFilters: {
    today: 'Show today\'s records only',
    thisWeek: 'Current week records',
    lateArrivals: 'Filter late check-ins',
    missingCheckOut: 'Missing check-outs',
    overtime: 'Overtime records'
  },
  actions: {
    viewDetails: 'Open detailed view modal',
    edit: 'Manual adjustment modal',
    export: 'Export selected records'
  }
};
```

### Accessibility Implementation
```html
<table role="table" aria-label="Attendance records">
  <thead>
    <tr role="row">
      <th role="columnheader" aria-sort="descending">
        Date
      </th>
      <th role="columnheader">Employee</th>
      <th role="columnheader">Check-in</th>
    </tr>
  </thead>
  <tbody>
    <tr role="row" aria-label="Marcus Johnson attendance for Oct 19">
      <td role="cell">
        <time datetime="2025-10-19">Oct 19, 2025</time>
      </td>
      <td role="cell">
        <div aria-label="Employee: Marcus Johnson, Engineering">
          <!-- Employee info -->
        </div>
      </td>
      <td role="cell">
        <span aria-label="Checked in at 8:45 AM, on time">
          08:45 AM
          <span class="status-dot on-time" aria-hidden="true"></span>
        </span>
      </td>
    </tr>
  </tbody>
</table>
```

## 7. Validation Rules & Edge Cases

### Time Validation
```typescript
const timeValidation = {
  checkIn: {
    min: '06:00',
    max: '11:00',
    mustBeBefore: 'breakOut'
  },
  breakOut: {
    mustBeAfter: 'checkIn',
    mustBeBefore: 'breakIn'
  },
  breakIn: {
    mustBeAfter: 'breakOut',
    mustBeBefore: 'checkOut'
  },
  checkOut: {
    min: '15:00',
    max: '23:59',
    mustBeAfter: 'breakIn || checkIn'
  },
  totalWork: {
    min: 4, // hours
    max: 12 // hours
  }
};
```

### Edge Cases
- **Missing Check-in**: Red indicator, "No check-in" message
- **Missing Check-out**: Orange indicator, "Not checked out"
- **Future Dates**: Disable manual entry for future dates
- **Concurrent Edits**: Optimistic locking with conflict resolution
- **Network Issues**: Cache data locally, sync when online
- **Late Data**: Handle delayed check-ins from offline devices

### Status Calculation Logic
```typescript
const calculateStatus = (record: AttendanceRecord): string => {
  const checks = record.checks;

  if (!checks.checkIn.time && !record.isOnLeave) {
    return 'absent';
  }

  if (record.isOnLeave) {
    return 'onleave';
  }

  const checkCount = [
    checks.checkIn.time,
    checks.checkOut.time
  ].filter(Boolean).length;

  if (checkCount === 2) {
    if (checks.checkIn.status === 'late' ||
        checks.checkOut.status === 'early') {
      return 'late';
    }
    return 'present';
  }

  if (checkCount === 1) {
    return 'halfday';
  }

  return 'absent';
};
```

## 8. Styling & Theming

### Table Styles
```scss
.attendance-table {
  background: white;
  border-radius: 12px;
  overflow: hidden;

  thead {
    background: #F9FAFB;
    border-bottom: 1px solid #E5E7EB;

    th {
      padding: 16px;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      color: #6B7280;
    }
  }

  tbody {
    tr {
      border-bottom: 1px solid #F3F4F6;
      transition: background 0.15s;

      &:hover {
        background: #F9FAFB;
      }
    }

    td {
      padding: 16px;
      vertical-align: middle;
    }
  }
}

.time-cell {
  display: flex;
  align-items: center;
  gap: 8px;

  .time-value {
    font-weight: 500;
    font-size: 14px;
  }

  .status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;

    &.on-time {
      background: var(--status-present);
    }

    &.late {
      background: var(--status-late);
    }

    &.missing {
      background: var(--status-absent);
    }
  }
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;

  &.present {
    background: #D1FAE5;
    color: #065F46;
  }

  &.late {
    background: #FED7AA;
    color: #92400E;
  }

  &.absent {
    background: #FEE2E2;
    color: #991B1B;
  }

  &.on-leave {
    background: #DBEAFE;
    color: #1E40AF;
  }
}
```

## 9. Testing Plan (Playwright MCP)

### E2E Tests
```typescript
test.describe('Attendance List', () => {
  test('should display today\'s attendance by default', async ({ page }) => {
    await page.goto('/attendance');
    await expect(page.getByTestId('quick-filter-today')).toHaveClass(/active/);
    const dateRange = await page.getByTestId('date-range').textContent();
    expect(dateRange).toContain('Today');
  });

  test('should filter by employee', async ({ page }) => {
    await page.goto('/attendance');
    await page.getByTestId('employee-filter').click();
    await page.getByText('Marcus Johnson').click();

    const rows = await page.getByTestId('attendance-row').all();
    for (const row of rows) {
      await expect(row).toContainText('Marcus Johnson');
    }
  });

  test('should show missing check-outs', async ({ page }) => {
    await page.goto('/attendance');
    await page.getByTestId('quick-filter-missing').click();

    const rows = await page.getByTestId('attendance-row').all();
    for (const row of rows) {
      const checkOut = await row.getByTestId('check-out-time').textContent();
      expect(checkOut).toContain('Not checked out');
    }
  });

  test('should export to CSV', async ({ page }) => {
    await page.goto('/attendance');
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-csv').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('attendance');
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('should handle manual adjustment', async ({ page }) => {
    await page.goto('/attendance');
    await page.getByTestId('attendance-row').first().getByTestId('view-details').click();
    await page.getByTestId('edit-attendance').click();

    await page.getByTestId('check-in-time').clear();
    await page.getByTestId('check-in-time').fill('09:00');
    await page.getByTestId('adjustment-reason').fill('System error correction');
    await page.getByTestId('save-adjustment').click();

    await expect(page.getByText('Attendance updated successfully')).toBeVisible();
  });
});
```

## 10. Implementation Steps & Estimates

### Phase 1: Page Setup (3 hours)
- [ ] Create attendance list page structure
- [ ] Set up routing and navigation
- [ ] Implement basic layout

### Phase 2: Filter System (5 hours)
- [ ] Build date range picker integration
- [ ] Create quick filter toggles
- [ ] Implement employee/status/source filters
- [ ] Add search functionality
- [ ] Connect filters to state management

### Phase 3: Data Table (6 hours)
- [ ] Build responsive table component
- [ ] Implement time display with status indicators
- [ ] Add status badge variations
- [ ] Create mobile card view
- [ ] Add sorting functionality

### Phase 4: Real-time Updates (4 hours)
- [ ] Set up Firebase listeners
- [ ] Implement auto-refresh logic
- [ ] Add connection status indicator
- [ ] Handle offline/online transitions

### Phase 5: Manual Adjustments (5 hours)
- [ ] Create adjustment modal
- [ ] Build time input validation
- [ ] Implement reason requirement
- [ ] Add audit logging
- [ ] Handle conflicts

### Phase 6: Export & Summary (3 hours)
- [ ] Implement CSV export
- [ ] Add summary statistics
- [ ] Create print view
- [ ] Add batch operations

### Phase 7: Testing & Polish (4 hours)
- [ ] Write E2E tests
- [ ] Add loading states
- [ ] Implement error handling
- [ ] Performance optimization
- [ ] Accessibility audit

**Total Estimate: 30 hours**

## 11. Open Questions & Assumptions

### Questions
1. Should we allow bulk attendance adjustments?
2. How many days of history should be readily available?
3. Should we implement attendance approval workflow?
4. Do we need geolocation display for each check-in?
5. Should overtime calculations be automatic?

### Assumptions
1. Default view shows today's records
2. Maximum 90 days of history in main view
3. Real-time updates every 30 seconds
4. Manual adjustments require reason
5. All times displayed in local timezone

### Recommended UI Tweaks

1. **Add Map View** showing employee locations during check-in
2. **Include Trend Indicators** showing patterns (frequently late, etc.)
3. **Add Bulk Actions Bar** for multiple record selection
4. **Implement Smart Filters** with saved filter sets
5. **Add Anomaly Detection** highlighting unusual patterns
6. **Include Shift View** for shift-based organizations
7. **Add Comparison View** to compare periods
8. **Show Weather Data** for context on attendance patterns