# Leave List – Implementation Workflow

Last updated: 2025-11-01
Figma Link: https://www.figma.com/design/zFhrSTYRqCIwzl7vMDUJi5/AttenDesk?node-id=15-5819

## 1. Overview & Scope

### Purpose
The Leave Management page provides a comprehensive interface for managing employee leave requests, tracking leave balances, and handling approval workflows. It features advanced filtering, bulk operations, and real-time status updates.

### Key User Flows
- **Primary**: Review pending requests → Approve/Reject → Track balances
- **Secondary**: Filter by status/type → Search employees → Export reports
- **Tertiary**: Bulk approve → View request details → Handle cancellations

### Entry/Exit Points
- **Entry**: Dashboard notifications, sidebar navigation, employee profile links
- **Exit**: Employee detail, leave calendar view, export downloads

### Dependencies
- Firebase Firestore for leave data
- `useLeaves` hook for data fetching
- `useLeaveApproval` hook for approval actions
- Cloud Storage for attachment handling
- Export utilities for CSV/Excel generation

## 2. Component Inventory

| Component | Type | Figma Source | Implementation Path | Status |
|-----------|------|--------------|-------------------|---------|
| Status Pills | Filter | Top Pills | `components/leaves/StatusPills.tsx` | New |
| Filter Controls | Controls | Filter Row | `components/leaves/LeaveFilters.tsx` | New |
| Date Range Picker | Input | Date Filter | `components/ui/date-range-picker.tsx` | Exists |
| Leave Type Filter | Select | Type Dropdown | `components/ui/select.tsx` | Exists |
| Employee Search | Search | Employee Field | `components/ui/combobox.tsx` | New |
| Department Filter | Select | Dept Dropdown | `components/ui/select.tsx` | Exists |
| Data Table | Table | Main Grid | `components/ui/table.tsx` | Exists |
| Status Badge | Display | Status Column | `components/ui/badge.tsx` | Exists |
| Leave Type Badge | Display | Type Column | `components/leaves/TypeBadge.tsx` | New |
| Action Buttons | Actions | Row Actions | `components/ui/button.tsx` | Exists |
| Bulk Actions | Toolbar | Selection Bar | `components/leaves/BulkActions.tsx` | New |
| Export Button | Action | Top Right | `components/ui/button.tsx` | Exists |

### Design Tokens
```scss
// Status Colors
$status-pending: #F59E0B;
$status-approved: #10B981;
$status-rejected: #EF4444;
$status-cancelled: #6B7280;

// Leave Type Colors
$type-vacation: #3B82F6;
$type-sick: #EF4444;
$type-personal: #8B5CF6;
$type-maternity: #EC4899;
$type-emergency: #F97316;

// Pill Counts
$pill-bg-gray: #F3F4F6;
$pill-bg-active: #111827;
$pill-text-active: #FFFFFF;

// Table Specific
$row-height: 64px;
$avatar-size: 36px;
```

## 3. Layout & Responsiveness

### Grid Layout
```css
.leaves-container {
  display: grid;
  grid-template-rows: auto auto auto 1fr auto;
  gap: 24px;
  padding: 24px;
}

.status-pills {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.filter-bar {
  display: grid;
  grid-template-columns: 150px 1fr repeat(3, 200px) auto;
  gap: 16px;
  align-items: center;
}

.table-wrapper {
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.bulk-actions-bar {
  position: sticky;
  top: 0;
  background: #1F2937;
  color: white;
  padding: 12px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 10;
}

@media (max-width: 1024px) {
  .filter-bar {
    grid-template-columns: 1fr 1fr;
  }

  .hide-on-tablet {
    display: none;
  }
}

@media (max-width: 640px) {
  .status-pills {
    width: 100%;
    -webkit-overflow-scrolling: touch;
  }

  .table-wrapper {
    overflow-x: auto;
  }
}
```

## 4. State & Data Model Mapping

### Leave List State Model
```typescript
interface LeaveListState {
  requests: LeaveRequest[];
  filters: {
    status: 'all' | 'pending' | 'approved' | 'rejected' | 'cancelled';
    dateRange: {
      start: Date;
      end: Date;
    };
    leaveType: string | null;
    employeeName: string;
    department: string | null;
  };
  statistics: {
    all: number;
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
  };
  selection: Set<string>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  ui: {
    isLoading: boolean;
    bulkActionMode: boolean;
    showFilters: boolean;
  };
}

interface LeaveRequest {
  id: string;
  employee: {
    uid: string;
    name: string;
    employeeId: string;
    department: string;
    avatar?: string;
  };
  type: 'vacation' | 'sick' | 'personal' | 'maternity' | 'emergency' | 'other';
  dates: {
    start: Date;
    end: Date;
    totalDays: number;
    workingDays: number;
  };
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reason: string;
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
  }>;
  requestedAt: Date;
  reviewer?: {
    uid: string;
    name: string;
    reviewedAt: Date;
    comments?: string;
  };
  balance: {
    before: number;
    after: number;
    type: string;
  };
}
```

## 5. API Contracts (Proposed)

### List Leave Requests
```typescript
// GET /api/leaves
interface LeaveListRequest {
  status?: string[];
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  department?: string;
  leaveType?: string[];
  page?: number;
  pageSize?: number;
  sortBy?: 'date' | 'employee' | 'status';
  sortOrder?: 'asc' | 'desc';
}

interface LeaveListResponse {
  requests: LeaveRequest[];
  statistics: {
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    upcomingCount: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}
```

### Leave Approval Actions
```typescript
// POST /api/leaves/{id}/approve
interface ApproveLeaveRequest {
  leaveId: string;
  comments?: string;
  adjustBalance?: boolean;
}

// POST /api/leaves/{id}/reject
interface RejectLeaveRequest {
  leaveId: string;
  reason: string;
  comments?: string;
}

// POST /api/leaves/bulk-approve
interface BulkApprovalRequest {
  leaveIds: string[];
  comments?: string;
}
```

## 6. Interaction & Accessibility

### Table Interactions
```typescript
const interactions = {
  statusPills: {
    click: 'Filter by status',
    hover: 'Show count tooltip'
  },
  tableRow: {
    checkbox: 'Select for bulk action',
    click: 'Open detail modal',
    actions: {
      view: 'View full details',
      approve: 'Approve request',
      reject: 'Reject with reason',
      cancel: 'Cancel request'
    }
  },
  bulkActions: {
    selectAll: 'Select all visible',
    approve: 'Bulk approve selected',
    export: 'Export selected'
  },
  filters: {
    clear: 'Reset all filters',
    save: 'Save filter preset'
  }
};
```

### Accessibility Features
```html
<div role="region" aria-label="Leave management filters">
  <div role="group" aria-label="Status filters">
    <button
      role="radio"
      aria-checked="true"
      aria-label="All leaves, 188 total"
    >
      All Leaves
      <span aria-hidden="true">188</span>
    </button>
  </div>
</div>

<table role="table" aria-label="Leave requests">
  <thead>
    <tr role="row">
      <th role="columnheader" aria-sort="none">
        <input
          type="checkbox"
          aria-label="Select all leave requests"
        />
      </th>
      <th role="columnheader">Employee</th>
    </tr>
  </thead>
  <tbody>
    <tr role="row" aria-selected="false">
      <td role="cell">
        <input
          type="checkbox"
          aria-label="Select leave request for Sarah Williams"
        />
      </td>
    </tr>
  </tbody>
</table>
```

## 7. Validation Rules & Edge Cases

### Approval Validation
```typescript
const approvalRules = {
  balance: {
    checkSufficient: true,
    allowNegative: false,
    maxNegative: -5
  },
  dates: {
    allowPastDates: false,
    maxFutureDays: 365,
    blockBlackoutDates: true
  },
  attachments: {
    requiredFor: ['medical', 'maternity'],
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['pdf', 'jpg', 'png']
  },
  overlap: {
    checkTeamConflicts: true,
    maxTeamAbsence: 0.3 // 30%
  }
};
```

### Edge Cases
- **Insufficient Balance**: Show warning, allow override with reason
- **Overlapping Leaves**: Highlight conflicts, require confirmation
- **Past Date Requests**: Special handling for retroactive approvals
- **Attachment Issues**: Handle missing/corrupt attachments gracefully
- **Bulk Conflicts**: Show detailed error report for failed items
- **Holiday Overlap**: Adjust working days calculation

### Business Rules
```typescript
const businessRules = {
  autoApproval: {
    enabled: false,
    conditions: {
      maxDays: 2,
      leaveTypes: ['sick', 'emergency'],
      requiresAttachment: true
    }
  },
  carryForward: {
    enabled: true,
    maxDays: 10,
    deadline: '03-31' // March 31st
  },
  minNotice: {
    vacation: 7, // days
    personal: 2,
    sick: 0,
    emergency: 0
  }
};
```

## 8. Styling & Theming

### Component Styles
```scss
.status-pills {
  .pill {
    padding: 8px 16px;
    border-radius: 20px;
    background: var(--pill-bg-gray);
    color: #374151;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;

    &.active {
      background: var(--pill-bg-active);
      color: white;
    }

    .count {
      font-weight: 600;
      font-size: 14px;
    }

    &.pending .count {
      color: var(--status-pending);
    }

    &.approved .count {
      color: var(--status-approved);
    }
  }
}

.leave-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;

  &.vacation {
    background: #DBEAFE;
    color: #1E40AF;

    &::before {
      content: '●';
      color: #3B82F6;
    }
  }

  &.sick {
    background: #FEE2E2;
    color: #991B1B;

    &::before {
      content: '●';
      color: #EF4444;
    }
  }

  &.personal {
    background: #EDE9FE;
    color: #5B21B6;

    &::before {
      content: '●';
      color: #8B5CF6;
    }
  }
}

.reviewer-info {
  display: flex;
  align-items: center;
  gap: 8px;

  .avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
  }

  .name {
    font-size: 14px;
    color: #6B7280;
  }
}
```

## 9. Testing Plan (Playwright MCP)

### E2E Tests
```typescript
test.describe('Leave Management', () => {
  test('should filter by pending status', async ({ page }) => {
    await page.goto('/leaves');
    await page.getByTestId('status-pending').click();

    const badges = await page.getByTestId('status-badge').all();
    for (const badge of badges) {
      await expect(badge).toHaveText('Pending');
    }
  });

  test('should approve leave request', async ({ page }) => {
    await page.goto('/leaves');
    await page.getByTestId('status-pending').click();

    const firstRow = page.getByTestId('leave-row').first();
    await firstRow.getByTestId('action-approve').click();

    await page.getByTestId('approval-comments').fill('Approved for vacation');
    await page.getByTestId('confirm-approve').click();

    await expect(page.getByText('Leave approved successfully')).toBeVisible();
    await expect(firstRow.getByTestId('status-badge')).toHaveText('Approved');
  });

  test('should handle bulk approval', async ({ page }) => {
    await page.goto('/leaves');
    await page.getByTestId('status-pending').click();

    await page.getByTestId('select-all').check();
    await page.getByTestId('bulk-approve').click();

    await page.getByTestId('bulk-approve-confirm').click();
    await expect(page.getByText(/\d+ leaves approved/)).toBeVisible();
  });

  test('should reject with reason', async ({ page }) => {
    await page.goto('/leaves');
    const firstRow = page.getByTestId('leave-row').first();
    await firstRow.getByTestId('action-reject').click();

    await page.getByTestId('rejection-reason').selectOption('insufficient_notice');
    await page.getByTestId('rejection-comments').fill('Please apply 7 days in advance');
    await page.getByTestId('confirm-reject').click();

    await expect(page.getByText('Leave rejected')).toBeVisible();
  });

  test('should export filtered results', async ({ page }) => {
    await page.goto('/leaves');
    await page.getByTestId('type-filter').selectOption('vacation');

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-csv').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain('leaves');
    expect(download.suggestedFilename()).toContain('vacation');
  });
});
```

## 10. Implementation Steps & Estimates

### Phase 1: Page Structure (3 hours)
- [ ] Create leave list page layout
- [ ] Set up routing and navigation
- [ ] Implement responsive grid

### Phase 2: Status Pills & Filters (4 hours)
- [ ] Build status pill components
- [ ] Implement filter controls
- [ ] Create date range picker
- [ ] Add employee/department search

### Phase 3: Data Table (5 hours)
- [ ] Build leave request table
- [ ] Implement type badges
- [ ] Add reviewer information
- [ ] Create row actions
- [ ] Add sorting functionality

### Phase 4: Approval Workflow (5 hours)
- [ ] Create approval modal
- [ ] Build rejection flow
- [ ] Implement balance validation
- [ ] Add attachment viewer
- [ ] Handle edge cases

### Phase 5: Bulk Operations (4 hours)
- [ ] Implement row selection
- [ ] Create bulk action bar
- [ ] Build bulk approval logic
- [ ] Add conflict resolution
- [ ] Create summary report

### Phase 6: Export & Reports (3 hours)
- [ ] Implement CSV export
- [ ] Add Excel export
- [ ] Create print view
- [ ] Generate summary stats

### Phase 7: Testing & Polish (4 hours)
- [ ] Write E2E tests
- [ ] Add loading states
- [ ] Implement error handling
- [ ] Performance optimization
- [ ] Accessibility audit

**Total Estimate: 28 hours**

## 11. Open Questions & Assumptions

### Questions
1. Should we allow partial approvals (approve some days)?
2. How should we handle team capacity conflicts?
3. Should managers see only their team's requests?
4. Do we need approval delegation for manager absence?
5. Should we implement leave request templates?

### Assumptions
1. All leave types share the same approval flow
2. Attachments stored in Cloud Storage
3. Email notifications sent on status changes
4. Balance calculated in working days
5. Historical requests kept indefinitely

### Recommended UI Tweaks

1. **Add Calendar View** for visual leave planning
2. **Include Team Availability** widget showing who's out
3. **Add Quick Approve** shortcuts for common scenarios
4. **Implement Smart Suggestions** for conflict resolution
5. **Show Balance Forecast** after approval
6. **Add Leave Patterns Analysis** to identify trends
7. **Include Delegation Settings** for manager absence
8. **Create Leave Policy Reference** inline help