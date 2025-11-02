# Penalty List – Implementation Workflow

Last updated: 2025-11-01
Figma Link: https://www.figma.com/design/zFhrSTYRqCIwzl7vMDUJi5/AttenDesk?node-id=15-6031

## 1. Overview & Scope

### Purpose
The Penalties page provides a comprehensive view of all employee penalties, violations tracking, and fine management. It enables administrators to review penalties, waive fines with proper justification, and export penalty reports for payroll processing.

### Key User Flows
- **Primary**: View active penalties → Review reasons → Process payments
- **Secondary**: Filter by status/date → Search employees → Waive penalties
- **Tertiary**: Export for payroll → Bulk actions → Generate reports

### Entry/Exit Points
- **Entry**: Dashboard alerts, sidebar navigation, notification links, employee profiles
- **Exit**: Employee detail, payment processing, export downloads, audit logs

### Dependencies
- Firebase Firestore for penalty data
- `usePenalties` hook for data fetching
- `waivePenalty` Cloud Function for waiving
- Audit logging for all modifications
- Export utilities for payroll integration

## 2. Component Inventory

| Component | Type | Figma Source | Implementation Path | Status |
|-----------|------|--------------|-------------------|---------|
| Filter Bar | Controls | Top Section | `components/penalties/FilterBar.tsx` | New |
| Status Tabs | Tabs | Status Filter | `components/ui/tabs.tsx` | Exists |
| Date Range | Input | Date Filter | `components/ui/date-range-picker.tsx` | Exists |
| Status Filter | Select | Status Dropdown | `components/ui/select.tsx` | Exists |
| Reason Filter | Select | Reason Type | `components/ui/select.tsx` | Exists |
| Amount Filter | Input | Amount Range | `components/penalties/AmountRange.tsx` | New |
| Search Bar | Search | Employee Search | `components/ui/search.tsx` | Exists |
| Data Table | Table | Main Grid | `components/ui/table.tsx` | Exists |
| Status Badge | Display | Status Column | `components/ui/badge.tsx` | Exists |
| Amount Display | Display | Amount Column | `components/penalties/AmountCell.tsx` | New |
| Action Menu | Dropdown | Row Actions | `components/ui/dropdown-menu.tsx` | Exists |
| Bulk Actions | Toolbar | Multi-select Bar | `components/penalties/BulkActions.tsx` | New |
| Export Button | Action | Top Right | `components/ui/button.tsx` | Exists |
| Statistics Cards | Display | Summary Row | `components/penalties/StatsCards.tsx` | New |

### Design Tokens
```scss
// Status Colors
$status-active: #F59E0B;
$status-paid: #10B981;
$status-waived: #3B82F6;
$status-disputed: #EF4444;

// Tab Indicators
$tab-active-bg: #FEF3C7;
$tab-active-border: #F59E0B;

// Amount Colors
$amount-low: #10B981;    // < $25
$amount-medium: #F59E0B; // $25-$50
$amount-high: #EF4444;   // > $50

// Statistics Cards
$stat-card-height: 80px;
$stat-icon-size: 24px;
```

## 3. Layout & Responsiveness

### Page Layout
```css
.penalties-container {
  display: grid;
  grid-template-rows: auto auto auto auto 1fr auto;
  gap: 24px;
  padding: 24px;
}

.filter-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
}

.status-tabs {
  display: flex;
  gap: 24px;
  border-bottom: 1px solid #E5E7EB;
  margin-bottom: 20px;
}

.filter-controls {
  display: grid;
  grid-template-columns: 180px 1fr repeat(4, 150px) auto;
  gap: 16px;
  align-items: center;
}

.statistics-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.table-section {
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

@media (max-width: 1024px) {
  .filter-controls {
    grid-template-columns: 1fr 1fr;
  }

  .statistics-row {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 640px) {
  .status-tabs {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
}
```

## 4. State & Data Model Mapping

### Penalty State Model
```typescript
interface PenaltyListState {
  penalties: Penalty[];
  filters: {
    status: 'all' | 'active' | 'paid' | 'waived' | 'disputed';
    dateRange: {
      start: Date;
      end: Date;
    };
    reason: 'all' | 'late_arrival' | 'absence' | 'early_departure' | 'policy_violation';
    amountRange: {
      min: number;
      max: number;
    };
    employee: string;
  };
  statistics: {
    totalPenalties: number;
    totalAmount: number;
    activeCount: number;
    paidCount: number;
    waivedCount: number;
  };
  selection: Set<string>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  ui: {
    isLoading: boolean;
    activeTab: string;
    showBulkActions: boolean;
  };
}

interface Penalty {
  id: string;
  employee: {
    uid: string;
    name: string;
    employeeId: string;
    department: string;
    avatar?: string;
  };
  violation: {
    type: 'late_arrival' | 'absence' | 'early_departure' | 'policy_violation';
    date: Date;
    details: string;
    duration?: number; // minutes late/early
  };
  penalty: {
    amount: number;
    currency: string;
    calculation: string; // How amount was calculated
  };
  status: 'active' | 'paid' | 'waived' | 'disputed';
  issuedBy: {
    system: boolean;
    adminId?: string;
    adminName?: string;
  };
  issuedAt: Date;
  dueDate?: Date;
  payment?: {
    paidAt: Date;
    method: string;
    reference: string;
  };
  waiver?: {
    waivedBy: string;
    waivedAt: Date;
    reason: string;
  };
  dispute?: {
    raisedAt: Date;
    reason: string;
    status: 'pending' | 'resolved';
  };
}
```

## 5. API Contracts (Proposed)

### List Penalties
```typescript
// GET /api/penalties
interface PenaltyListRequest {
  status?: string[];
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  reason?: string[];
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  pageSize?: number;
}

interface PenaltyListResponse {
  penalties: Penalty[];
  statistics: {
    total: number;
    totalAmount: number;
    byStatus: Record<string, number>;
    byReason: Record<string, number>;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}
```

### Penalty Actions
```typescript
// POST /api/penalties/{id}/waive
interface WaivePenaltyRequest {
  penaltyId: string;
  reason: string;
  comments?: string;
}

// POST /api/penalties/{id}/mark-paid
interface MarkPaidRequest {
  penaltyId: string;
  paymentMethod: string;
  reference?: string;
}

// POST /api/penalties/bulk-export
interface BulkExportRequest {
  penaltyIds: string[];
  format: 'csv' | 'excel' | 'pdf';
  includeDetails: boolean;
}
```

## 6. Interaction & Accessibility

### Table Interactions
```typescript
const interactions = {
  statusTabs: {
    click: 'Filter by status',
    keyboard: 'Arrow keys to navigate'
  },
  tableRow: {
    hover: 'Highlight row',
    click: 'Open detail modal',
    checkbox: 'Select for bulk action'
  },
  actions: {
    view: 'View full details',
    waive: 'Open waive dialog',
    markPaid: 'Mark as paid',
    export: 'Export single record',
    dispute: 'Raise dispute'
  },
  bulkActions: {
    export: 'Export selected to CSV',
    waiveSelected: 'Bulk waive (with reason)',
    markPaid: 'Mark selected as paid'
  }
};
```

### Accessibility Implementation
```html
<div role="tablist" aria-label="Penalty status filters">
  <button
    role="tab"
    aria-selected="true"
    aria-controls="panel-active"
    id="tab-active"
  >
    Active
    <span aria-label="24 active penalties">24</span>
  </button>
</div>

<table role="table" aria-label="Employee penalties list">
  <thead>
    <tr role="row">
      <th role="columnheader" aria-sort="descending">
        Date
      </th>
      <th role="columnheader">Employee</th>
      <th role="columnheader">Reason</th>
      <th role="columnheader">Amount</th>
    </tr>
  </thead>
  <tbody>
    <tr role="row" aria-label="Penalty for David Chen on Oct 19">
      <td role="cell">
        <time datetime="2025-10-19">Oct 19, 2025</time>
      </td>
      <td role="cell">
        <span aria-label="David Chen, Sales Department">
          David Chen
        </span>
      </td>
    </tr>
  </tbody>
</table>
```

## 7. Validation Rules & Edge Cases

### Waiver Validation
```typescript
const waiverRules = {
  authorization: {
    requireAdminRole: true,
    requireReason: true,
    minReasonLength: 20,
    requireAuditLog: true
  },
  restrictions: {
    maxWaiverPercentage: 100,
    maxWaiversPerMonth: 5,
    blockAfterPayment: true,
    requireApprovalAbove: 100 // Amount
  },
  reasons: [
    'first_offense',
    'system_error',
    'justified_absence',
    'management_discretion',
    'policy_exception',
    'other'
  ]
};
```

### Edge Cases
- **Disputed Penalties**: Lock modifications until resolved
- **Partial Payments**: Track remaining balance
- **Retroactive Penalties**: Handle past date violations
- **Bulk Waiver Limits**: Max 10 at once with same reason
- **Currency Conversion**: Handle multi-currency if needed
- **Payroll Integration**: Lock after payroll export

### Business Rules
```typescript
const penaltyRules = {
  calculation: {
    lateArrival: {
      first15Min: 10,
      next15Min: 15,
      beyond30Min: 25
    },
    absence: {
      unexcused: 50,
      noNotification: 75
    },
    earlyDeparture: {
      standard: 20
    }
  },
  escalation: {
    repeatOffenseMultiplier: 1.5,
    maxPenaltyPerDay: 100,
    gracePeriodDays: 3
  },
  payment: {
    dueDays: 30,
    reminderDays: [7, 3, 1],
    deductFromSalary: true
  }
};
```

## 8. Styling & Theming

### Component Styles
```scss
.penalty-table {
  .status-cell {
    .badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;

      &.active {
        background: #FEF3C7;
        color: #92400E;
      }

      &.paid {
        background: #D1FAE5;
        color: #065F46;
      }

      &.waived {
        background: #DBEAFE;
        color: #1E40AF;
      }

      &.disputed {
        background: #FEE2E2;
        color: #991B1B;
      }
    }
  }

  .amount-cell {
    font-weight: 600;
    font-size: 15px;

    &.high {
      color: #DC2626;
    }

    &.medium {
      color: #D97706;
    }

    &.low {
      color: #059669;
    }

    .currency {
      font-size: 12px;
      color: #6B7280;
      margin-left: 2px;
    }
  }

  .reason-cell {
    .reason-type {
      font-weight: 500;
      color: #111827;
    }

    .reason-detail {
      font-size: 13px;
      color: #6B7280;
      margin-top: 2px;
    }
  }
}

.statistics-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #E5E7EB;

  .stat-value {
    font-size: 28px;
    font-weight: 700;
    color: #111827;
  }

  .stat-label {
    font-size: 14px;
    color: #6B7280;
    margin-top: 4px;
  }

  .stat-change {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    margin-top: 8px;

    &.positive {
      color: #10B981;
    }

    &.negative {
      color: #EF4444;
    }
  }
}
```

## 9. Testing Plan (Playwright MCP)

### E2E Tests
```typescript
test.describe('Penalty Management', () => {
  test('should display penalties with filters', async ({ page }) => {
    await page.goto('/penalties');
    await expect(page.getByTestId('penalty-table')).toBeVisible();

    // Test status filter
    await page.getByRole('tab', { name: 'Active' }).click();
    const badges = await page.getByTestId('status-badge').all();
    for (const badge of badges) {
      await expect(badge).toHaveText('Active');
    }
  });

  test('should waive penalty with reason', async ({ page }) => {
    await page.goto('/penalties');
    const firstRow = page.getByTestId('penalty-row').first();

    await firstRow.getByTestId('action-menu').click();
    await page.getByTestId('action-waive').click();

    await page.getByTestId('waiver-reason').selectOption('first_offense');
    await page.getByTestId('waiver-comments').fill('First time violation, verbal warning issued');
    await page.getByTestId('confirm-waiver').click();

    await expect(page.getByText('Penalty waived successfully')).toBeVisible();
    await expect(firstRow.getByTestId('status-badge')).toHaveText('Waived');
  });

  test('should handle bulk export', async ({ page }) => {
    await page.goto('/penalties');

    // Select multiple penalties
    await page.getByTestId('select-all').check();

    // Export
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('bulk-export').click();
    await page.getByTestId('export-format-csv').click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('penalties');
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('should filter by amount range', async ({ page }) => {
    await page.goto('/penalties');

    await page.getByTestId('amount-min').fill('25');
    await page.getByTestId('amount-max').fill('50');
    await page.getByTestId('apply-filters').click();

    const amounts = await page.getByTestId('penalty-amount').all();
    for (const amount of amounts) {
      const value = parseFloat(await amount.textContent());
      expect(value).toBeGreaterThanOrEqual(25);
      expect(value).toBeLessThanOrEqual(50);
    }
  });

  test('should show penalty details', async ({ page }) => {
    await page.goto('/penalties');

    await page.getByTestId('penalty-row').first().click();

    await expect(page.getByTestId('penalty-detail-modal')).toBeVisible();
    await expect(page.getByTestId('violation-history')).toBeVisible();
    await expect(page.getByTestId('calculation-breakdown')).toBeVisible();
  });
});
```

## 10. Implementation Steps & Estimates

### Phase 1: Page Structure (3 hours)
- [ ] Create penalties page layout
- [ ] Set up routing
- [ ] Implement responsive container

### Phase 2: Filtering System (5 hours)
- [ ] Build status tabs
- [ ] Create filter controls
- [ ] Implement date range picker
- [ ] Add amount range filter
- [ ] Build employee search

### Phase 3: Data Table (5 hours)
- [ ] Implement penalty table
- [ ] Create status badges
- [ ] Build amount display
- [ ] Add reason details
- [ ] Create action menus

### Phase 4: Statistics Cards (3 hours)
- [ ] Build statistics row
- [ ] Calculate aggregates
- [ ] Add trend indicators
- [ ] Implement real-time updates

### Phase 5: Waiver Workflow (4 hours)
- [ ] Create waiver modal
- [ ] Build reason selection
- [ ] Implement validation
- [ ] Add audit logging
- [ ] Handle edge cases

### Phase 6: Bulk Operations (4 hours)
- [ ] Implement row selection
- [ ] Create bulk action bar
- [ ] Build bulk export
- [ ] Add bulk waiver
- [ ] Generate reports

### Phase 7: Testing & Polish (4 hours)
- [ ] Write E2E tests
- [ ] Add loading states
- [ ] Implement error handling
- [ ] Performance optimization
- [ ] Accessibility audit

**Total Estimate: 28 hours**

## 11. Open Questions & Assumptions

### Questions
1. Should penalties affect performance reviews?
2. Can employees dispute penalties directly?
3. Should we implement payment installments?
4. How long to retain penalty history?
5. Should managers see team penalties only?

### Assumptions
1. Penalties calculated automatically by system
2. Manual penalties require admin approval
3. Waived penalties remain in history
4. Export includes all filtered results
5. Currency is company-wide setting

### Recommended UI Tweaks

1. **Add Violation Timeline** showing pattern of violations
2. **Include Payment Integration** for online payment
3. **Show Department Comparison** for penalty trends
4. **Add Appeal Workflow** for employee disputes
5. **Implement Auto-Waiver Rules** for defined scenarios
6. **Create Penalty Forecasting** based on current violations
7. **Add Email Reminders** for pending payments
8. **Include Manager Dashboard** for team penalty overview