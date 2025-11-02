# Employee List – Implementation Workflow

Last updated: 2025-11-01
Figma Link: https://www.figma.com/design/zFhrSTYRqCIwzl7vMDUJi5/AttenDesk?node-id=15-7479

## 1. Overview & Scope

### Purpose
The Employee List page provides a comprehensive view of all employees with advanced search, filtering, and management capabilities. It serves as the central hub for employee administration, allowing quick access to profiles, status updates, and bulk operations.

### Key User Flows
- **Primary**: Browse employees → Search/Filter → View details
- **Secondary**: Add new employee → Edit existing → Change status
- **Tertiary**: Export data → Bulk operations → Generate reports

### Entry/Exit Points
- **Entry**: Dashboard link, sidebar navigation, search results
- **Exit**: Employee profile detail, Create employee form, Department view

### Dependencies
- Firebase Firestore for employee data
- Cloud Functions for CRUD operations
- Existing hooks: `useEmployees`, `useCreateEmployee`
- CSV export utilities

## 2. Component Inventory

| Component | Type | Figma Source | Implementation Path | Status |
|-----------|------|--------------|-------------------|---------|
| Search Bar | Input | Top Search | `components/ui/search.tsx` | New |
| Filter Controls | Controls | Status/Dept/Date | `components/filters/EmployeeFilters.tsx` | New |
| Data Table | Table | Main Grid | `components/ui/table.tsx` | Exists |
| Pagination | Navigation | Bottom Bar | `components/ui/pagination.tsx` | New |
| Action Menu | Dropdown | Row Actions | `components/ui/dropdown-menu.tsx` | Exists |
| Status Badge | Display | Status Column | `components/ui/badge.tsx` | Exists |
| Avatar | Display | Employee Photo | `components/ui/avatar.tsx` | Exists |
| Export Button | Action | Top Right | `components/ui/button.tsx` | Exists |
| Add Employee CTA | Button | Top Right | `components/ui/button.tsx` | Exists |

### Design Tokens
```scss
// Table Specific
$row-height: 64px;
$header-height: 48px;
$checkbox-size: 20px;
$avatar-size: 40px;

// Status Colors
$status-active: #10B981;
$status-inactive: #F59E0B;
$status-terminated: #EF4444;
$status-onleave: #3B82F6;

// Table Colors
$table-header-bg: #F9FAFB;
$table-border: #E5E7EB;
$table-hover: #F3F4F6;
$selected-row: #EFF6FF;
```

## 3. Layout & Responsiveness

### Grid Layout
```css
.employee-list-container {
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  gap: 24px;
  height: 100%;
}

.filter-bar {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.table-container {
  overflow-x: auto;
  min-width: 100%;
}

/* Responsive Table */
@media (max-width: 1024px) {
  .hide-on-tablet {
    display: none;
  }
}

@media (max-width: 640px) {
  .table-container {
    /* Switch to card view */
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
```

### Table Column Configuration
```typescript
const columns = [
  { key: 'select', width: '40px', fixed: true },
  { key: 'employee', width: '280px', sortable: true },
  { key: 'email', width: '200px', responsive: 'desktop' },
  { key: 'role', width: '150px', sortable: true },
  { key: 'department', width: '150px', filterable: true },
  { key: 'status', width: '120px', filterable: true },
  { key: 'created', width: '120px', sortable: true, responsive: 'desktop' },
  { key: 'actions', width: '80px', fixed: 'right' }
];
```

## 4. State & Data Model Mapping

### Component State
```typescript
interface EmployeeListState {
  data: Employee[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  filters: {
    search: string;
    status: 'all' | 'active' | 'inactive' | 'onleave';
    department: string | null;
    dateRange: { start: Date; end: Date } | null;
  };
  sorting: {
    field: string;
    direction: 'asc' | 'desc';
  };
  selection: Set<string>;
  ui: {
    isLoading: boolean;
    view: 'table' | 'grid' | 'card';
  };
}

interface Employee {
  id: string;
  profile: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    avatar?: string;
  };
  employment: {
    employeeId: string;
    role: string;
    department: string;
    position: string;
    joinDate: Date;
  };
  status: {
    current: 'active' | 'inactive' | 'onleave' | 'terminated';
    lastActive?: Date;
  };
  leave: {
    balance: LeaveBalance;
    currentLeave?: LeaveRequest;
  };
}
```

## 5. API Contracts (Proposed)

### List Employees Endpoint
```typescript
// GET /api/employees
interface EmployeeListRequest {
  page: number;
  pageSize: number;
  search?: string;
  filters?: {
    status?: string[];
    department?: string[];
    dateRange?: {
      start: string;
      end: string;
    };
  };
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
}

interface EmployeeListResponse {
  data: Employee[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  aggregations?: {
    byStatus: Record<string, number>;
    byDepartment: Record<string, number>;
  };
}
```

### Bulk Operations
```typescript
// POST /api/employees/bulk
interface BulkOperationRequest {
  operation: 'activate' | 'deactivate' | 'delete' | 'export';
  employeeIds: string[];
  params?: Record<string, any>;
}

interface BulkOperationResponse {
  success: number;
  failed: number;
  errors?: Array<{
    employeeId: string;
    error: string;
  }>;
}
```

## 6. Interaction & Accessibility

### Table Interactions
```typescript
const tableInteractions = {
  row: {
    hover: 'Highlight row with background',
    click: 'Navigate to employee profile',
    doubleClick: 'Open quick edit modal'
  },
  checkbox: {
    single: 'Select individual row',
    header: 'Select all visible rows',
    shift: 'Range selection'
  },
  sort: {
    click: 'Sort by column',
    doubleClick: 'Clear sorting'
  },
  actions: {
    click: 'Open context menu',
    keyboard: 'Space/Enter to open'
  }
};
```

### Accessibility Implementation
```html
<table role="table" aria-label="Employee list" aria-rowcount="247">
  <thead role="rowgroup">
    <tr role="row">
      <th role="columnheader" aria-sort="ascending">
        <button aria-label="Sort by name">Employee</button>
      </th>
    </tr>
  </thead>
  <tbody role="rowgroup">
    <tr role="row" aria-rowindex="2" tabindex="0">
      <td role="cell">
        <div role="button" aria-label="Employee Marcus Johnson">
          <!-- Content -->
        </div>
      </td>
    </tr>
  </tbody>
</table>
```

### Keyboard Shortcuts
```typescript
const keyboardShortcuts = {
  '/': 'Focus search',
  'a': 'Select all',
  'esc': 'Clear selection',
  'n': 'Add new employee',
  'e': 'Export selected',
  'delete': 'Delete selected (with confirmation)',
  'arrow keys': 'Navigate rows',
  'enter': 'Open employee profile',
  'space': 'Toggle row selection'
};
```

## 7. Validation Rules & Edge Cases

### Search & Filter Validation
```typescript
const searchValidation = {
  minLength: 2,
  maxLength: 100,
  debounceMs: 300,
  escapeRegex: true
};

const filterValidation = {
  maxFilters: 10,
  dateRange: {
    maxDays: 365,
    minDate: '2020-01-01'
  }
};
```

### Edge Cases
- **Empty State**: "No employees found" with CTA to add
- **Search No Results**: Suggest clearing filters
- **Bulk Operation Limit**: Max 100 items at once
- **Offline Mode**: Show cached data with indicator
- **Permission Denied**: Hide actions based on role
- **Large Dataset**: Virtual scrolling for 1000+ rows

### Security Considerations
- PII data masking for export
- Audit log for all operations
- Rate limiting on searches
- SQL injection prevention
- CSRF protection for bulk operations

## 8. Styling & Theming

### Table Styles
```scss
.employee-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;

  thead {
    background: var(--table-header-bg);
    position: sticky;
    top: 0;
    z-index: 10;

    th {
      padding: 12px 16px;
      font-weight: 600;
      text-align: left;
      border-bottom: 2px solid var(--table-border);
    }
  }

  tbody {
    tr {
      border-bottom: 1px solid var(--table-border);
      transition: background-color 0.15s;

      &:hover {
        background: var(--table-hover);
      }

      &.selected {
        background: var(--selected-row);
      }
    }

    td {
      padding: 16px;
      vertical-align: middle;
    }
  }
}

.status-badge {
  &.active {
    background: var(--status-active);
    color: white;
  }

  &.inactive {
    background: var(--status-inactive);
    color: white;
  }
}
```

## 9. Testing Plan (Playwright MCP)

### E2E Test Suite
```typescript
// tests/employee-list.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Employee List', () => {
  test('should display employee table with data', async ({ page }) => {
    await page.goto('/employees');
    await expect(page.getByTestId('employee-table')).toBeVisible();
    await expect(page.getByTestId('employee-row')).toHaveCount(10);
  });

  test('should search employees by name', async ({ page }) => {
    await page.goto('/employees');
    await page.getByTestId('search-input').fill('Marcus');
    await page.waitForResponse('**/api/employees*');
    await expect(page.getByText('Marcus Johnson')).toBeVisible();
  });

  test('should filter by status', async ({ page }) => {
    await page.goto('/employees');
    await page.getByTestId('status-filter').selectOption('active');
    const badges = await page.getByTestId('status-badge').all();
    for (const badge of badges) {
      await expect(badge).toHaveClass(/active/);
    }
  });

  test('should sort by column', async ({ page }) => {
    await page.goto('/employees');
    await page.getByRole('columnheader', { name: 'Name' }).click();
    const firstRow = await page.getByTestId('employee-row').first().textContent();
    await page.getByRole('columnheader', { name: 'Name' }).click();
    const newFirstRow = await page.getByTestId('employee-row').first().textContent();
    expect(firstRow).not.toBe(newFirstRow);
  });

  test('should handle bulk selection', async ({ page }) => {
    await page.goto('/employees');
    await page.getByTestId('select-all-checkbox').check();
    const checkboxes = await page.getByTestId('row-checkbox').all();
    for (const checkbox of checkboxes) {
      await expect(checkbox).toBeChecked();
    }
  });

  test('should export to CSV', async ({ page }) => {
    await page.goto('/employees');
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-csv-button').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('employees');
    expect(download.suggestedFilename()).toContain('.csv');
  });
});
```

### Performance Tests
```typescript
test('should handle large datasets efficiently', async ({ page }) => {
  await page.goto('/employees?pageSize=100');
  const startTime = Date.now();
  await page.waitForSelector('[data-testid="employee-table"]');
  const loadTime = Date.now() - startTime;
  expect(loadTime).toBeLessThan(3000); // 3 seconds max
});
```

## 10. Implementation Steps & Estimates

### Phase 1: Table Setup (4 hours)
- [ ] Create EmployeeList page component
- [ ] Set up data table with columns
- [ ] Implement basic pagination

### Phase 2: Search & Filters (4 hours)
- [ ] Build search input with debouncing
- [ ] Create filter dropdowns (status, dept)
- [ ] Add date range picker
- [ ] Implement filter state management

### Phase 3: Data Integration (5 hours)
- [ ] Connect to Firebase/API
- [ ] Implement useEmployees hook updates
- [ ] Add loading and error states
- [ ] Set up real-time updates

### Phase 4: Interactions (4 hours)
- [ ] Add row selection logic
- [ ] Implement bulk operations
- [ ] Create action menus
- [ ] Add keyboard navigation

### Phase 5: Export & Import (3 hours)
- [ ] Build CSV export functionality
- [ ] Add Excel export option
- [ ] Create import validation

### Phase 6: Responsive Design (3 hours)
- [ ] Create mobile card view
- [ ] Adjust tablet layout
- [ ] Test on various devices

### Phase 7: Testing & Polish (4 hours)
- [ ] Write E2E tests
- [ ] Add performance monitoring
- [ ] Implement virtual scrolling
- [ ] Final UI polish

**Total Estimate: 27 hours**

## 11. Open Questions & Assumptions

### Questions
1. Should we implement infinite scroll or pagination?
2. What's the maximum number for bulk operations?
3. Should deleted employees be soft-deleted or hard-deleted?
4. Do we need audit trails for all operations?
5. Should we add employee import from Excel/CSV?

### Assumptions
1. Maximum 1000 employees initially
2. Pagination with 10/25/50/100 options
3. Soft delete with restoration capability
4. All operations logged to audit trail
5. Export includes filtered results only

### Recommended UI Tweaks

1. **Add Quick Actions Bar** when rows are selected
2. **Include Column Customization** for personal preferences
3. **Add Saved Filters** for common queries
4. **Implement Undo** for bulk operations
5. **Add Inline Editing** for quick updates
6. **Include Employee Preview** on hover
7. **Add Keyboard Shortcut Guide** in help menu
8. **Show Recent Activity** indicator per employee

### Architecture Alignment Notes
- Extend existing `useEmployees` hook for filtering
- Reuse Table component from Shadcn/ui
- Apply consistent pagination pattern
- Use new rate limiting for search
- Cache employee data with React Query
- Implement virtual scrolling with react-window