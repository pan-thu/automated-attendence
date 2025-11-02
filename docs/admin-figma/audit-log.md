# Audit Log – Implementation Workflow

Last updated: 2025-11-01
Figma Link: https://www.figma.com/design/zFhrSTYRqCIwzl7vMDUJi5/AttenDesk?node-id=15-6222

## 1. Overview & Scope

### Purpose
The Audit Log page provides a comprehensive, searchable record of all system activities and user actions. It enables administrators to track changes, investigate issues, ensure compliance, and maintain accountability across the attendance management system.

### Key User Flows
- **Primary**: View recent activities → Filter by action type → Search specific events
- **Secondary**: Filter by date/user → View action details → Export audit trail
- **Tertiary**: Investigate issues → Track user behavior → Generate compliance reports

### Entry/Exit Points
- **Entry**: Dashboard navigation, sidebar menu, security alerts, compliance requirements
- **Exit**: User profiles, related records, export downloads, detailed investigation views

### Dependencies
- Firebase Firestore for audit log storage
- `useAuditLogs` hook for data fetching
- Real-time Firestore listeners for live updates
- Export utilities for compliance reporting
- Column customization preferences

## 2. Component Inventory

| Component | Type | Figma Source | Implementation Path | Status |
|-----------|------|--------------|-------------------|---------|
| Advanced Filters | Controls | Top Section | `components/audit/AdvancedFilters.tsx` | New |
| Date Range Picker | Input | Date Filter | `components/ui/date-range-picker.tsx` | Exists |
| Actor Filter | Combobox | User Select | `components/ui/combobox.tsx` | Exists |
| Target Filter | Select | Target Type | `components/ui/select.tsx` | Exists |
| Action Filter | Multi-select | Action Types | `components/ui/multi-select.tsx` | New |
| Quick Filters | Pills | Filter Row | `components/audit/QuickFilters.tsx` | New |
| Data Table | Table | Main Grid | `components/ui/table.tsx` | Exists |
| Actor Cell | Display | User Info | `components/audit/ActorCell.tsx` | New |
| Action Badge | Display | Action Type | `components/audit/ActionBadge.tsx` | New |
| Target Link | Link | Target Column | `components/audit/TargetLink.tsx` | New |
| Result Icon | Icon | Success/Fail | `components/ui/icon.tsx` | Exists |
| Column Toggle | Control | Column Select | `components/ui/column-toggle.tsx` | New |
| Export Button | Action | Top Right | `components/ui/button.tsx` | Exists |

### Design Tokens
```scss
// Action Type Colors
$action-create: #10B981;
$action-update: #3B82F6;
$action-delete: #EF4444;
$action-login: #8B5CF6;
$action-system: #F59E0B;
$action-failed: #DC2626;

// Quick Filter Colors
$filter-active: #1F2937;
$filter-inactive: #F3F4F6;
$filter-hover: #E5E7EB;

// Result Indicators
$result-success: #10B981;
$result-failed: #EF4444;
$result-warning: #F59E0B;

// Table Specific
$row-height: 56px;
$actor-avatar-size: 32px;
```

## 3. Layout & Responsiveness

### Page Layout
```css
.audit-log-container {
  display: grid;
  grid-template-rows: auto auto auto 1fr auto;
  gap: 20px;
  padding: 24px;
  background: #F9FAFB;
}

.filters-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
}

.advanced-filters {
  display: grid;
  grid-template-columns: 200px 1fr repeat(3, 180px) auto;
  gap: 16px;
  align-items: center;
}

.quick-filters {
  display: flex;
  gap: 12px;
  padding: 16px 0;
  border-top: 1px solid #E5E7EB;
  margin-top: 16px;
}

.table-section {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.table-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #E5E7EB;
}

@media (max-width: 1280px) {
  .advanced-filters {
    grid-template-columns: 1fr 1fr 1fr;
  }
}

@media (max-width: 768px) {
  .advanced-filters {
    grid-template-columns: 1fr;
  }

  .quick-filters {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
}
```

## 4. State & Data Model Mapping

### Audit Log State Model
```typescript
interface AuditLogState {
  entries: AuditEntry[];
  filters: {
    dateRange: {
      start: Date;
      end: Date;
    };
    actor: string | null;
    targetType: 'all' | 'employee' | 'attendance' | 'leave' | 'system';
    actions: string[];
    result: 'all' | 'success' | 'failed';
    search: string;
  };
  quickFilters: {
    active: 'today' | 'failed' | 'admin' | 'employee' | 'settings' | null;
  };
  columns: {
    visible: Set<string>;
    order: string[];
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
  ui: {
    isLoading: boolean;
    isRealtime: boolean;
    lastUpdated: Date;
  };
}

interface AuditEntry {
  id: string;
  timestamp: Date;
  actor: {
    uid: string;
    name: string;
    email: string;
    avatar?: string;
    role: 'admin' | 'employee' | 'system';
    ipAddress?: string;
  };
  action: {
    type: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'approve' | 'reject' | 'waive';
    category: 'employee' | 'attendance' | 'leave' | 'penalty' | 'system' | 'settings';
    description: string;
  };
  target: {
    type: string;
    id: string;
    name: string;
    url?: string;
  };
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  metadata: {
    userAgent?: string;
    location?: string;
    sessionId?: string;
    requestId?: string;
  };
  result: {
    status: 'success' | 'failed' | 'partial';
    error?: string;
    affectedRecords?: number;
  };
}
```

## 5. API Contracts (Proposed)

### List Audit Logs
```typescript
// GET /api/audit-logs
interface AuditLogRequest {
  startDate?: string;
  endDate?: string;
  actorId?: string;
  targetType?: string;
  actions?: string[];
  result?: 'success' | 'failed';
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'timestamp' | 'actor' | 'action';
  sortOrder?: 'asc' | 'desc';
}

interface AuditLogResponse {
  entries: AuditEntry[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
  aggregations?: {
    byAction: Record<string, number>;
    byActor: Record<string, number>;
    byResult: Record<string, number>;
  };
}
```

### Export Audit Trail
```typescript
// POST /api/audit-logs/export
interface ExportAuditRequest {
  filters: AuditLogRequest;
  format: 'csv' | 'json' | 'pdf';
  columns: string[];
  includeMetadata: boolean;
}

interface ExportAuditResponse {
  downloadUrl: string;
  expiresAt: Date;
  recordCount: number;
}
```

## 6. Interaction & Accessibility

### Interactive Elements
```typescript
const interactions = {
  filters: {
    dateRange: 'Select custom date range',
    quickFilters: 'Toggle predefined filters',
    clearAll: 'Reset all filters'
  },
  table: {
    rowClick: 'Expand for detailed view',
    actorClick: 'Navigate to user profile',
    targetClick: 'Navigate to target record',
    columnSort: 'Sort by column',
    columnToggle: 'Show/hide columns'
  },
  actions: {
    export: 'Export filtered results',
    refresh: 'Refresh audit logs',
    realtime: 'Toggle real-time updates'
  },
  pagination: {
    loadMore: 'Infinite scroll or pagination',
    pageSize: 'Adjust items per page'
  }
};
```

### Accessibility Implementation
```html
<div role="region" aria-label="Audit log filters">
  <div role="group" aria-label="Quick filters">
    <button
      role="checkbox"
      aria-checked="true"
      aria-label="Today's activity"
    >
      Today's Activity
    </button>
    <button
      role="checkbox"
      aria-checked="false"
      aria-label="Failed logins"
    >
      Failed Logins
    </button>
  </div>
</div>

<table role="table" aria-label="System audit log">
  <thead>
    <tr role="row">
      <th role="columnheader" aria-sort="descending">
        <button aria-label="Sort by time">Time</button>
      </th>
      <th role="columnheader">Actor</th>
      <th role="columnheader">Action</th>
    </tr>
  </thead>
  <tbody>
    <tr role="row" aria-expanded="false">
      <td role="cell">
        <time datetime="2025-10-19T10:23:47">
          Oct 19, 10:23:47
        </time>
      </td>
      <td role="cell">
        <a href="/users/sarah-chen" aria-label="Sarah Chen, Administrator">
          Sarah Chen
        </a>
      </td>
    </tr>
  </tbody>
</table>
```

## 7. Validation Rules & Edge Cases

### Filter Validation
```typescript
const filterValidation = {
  dateRange: {
    maxDays: 365,
    minDate: new Date('2020-01-01'),
    maxDate: new Date() // Today
  },
  search: {
    minLength: 3,
    maxLength: 100,
    sanitize: true
  },
  export: {
    maxRecords: 10000,
    retentionDays: 7
  }
};
```

### Edge Cases
- **Large Result Sets**: Implement pagination or infinite scroll
- **Real-time Conflicts**: Handle concurrent updates gracefully
- **Missing Actor Data**: Display "System" for automated actions
- **Deleted Targets**: Show "[Deleted]" with ID reference
- **Failed Actions**: Highlight in red with error details
- **Sensitive Data**: Mask based on viewer permissions

### Security Considerations
```typescript
const securityRules = {
  access: {
    requireRole: 'admin',
    sensitiveActions: ['delete', 'waive', 'approve'],
    maskSensitiveData: true
  },
  retention: {
    standardLogs: 365, // days
    securityLogs: 730, // days
    complianceLogs: 2555 // 7 years
  },
  export: {
    requireApproval: true,
    trackExports: true,
    watermark: true
  }
};
```

## 8. Styling & Theming

### Component Styles
```scss
.audit-table {
  .actor-cell {
    display: flex;
    align-items: center;
    gap: 12px;

    .actor-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #E5E7EB;
    }

    .actor-info {
      .name {
        font-weight: 500;
        color: #111827;
      }

      .role {
        font-size: 12px;
        color: #6B7280;
      }
    }
  }

  .action-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;

    &.create {
      background: #D1FAE5;
      color: #065F46;
    }

    &.update {
      background: #DBEAFE;
      color: #1E40AF;
    }

    &.delete {
      background: #FEE2E2;
      color: #991B1B;
    }

    &.login {
      background: #EDE9FE;
      color: #5B21B6;
    }

    .icon {
      width: 12px;
      height: 12px;
    }
  }

  .target-cell {
    .target-link {
      color: #3B82F6;
      text-decoration: none;
      font-weight: 500;

      &:hover {
        text-decoration: underline;
      }
    }

    .target-type {
      font-size: 12px;
      color: #6B7280;
      margin-top: 2px;
    }
  }

  .result-cell {
    display: flex;
    align-items: center;
    gap: 6px;

    .result-icon {
      width: 16px;
      height: 16px;

      &.success {
        color: #10B981;
      }

      &.failed {
        color: #EF4444;
      }
    }
  }
}

.quick-filter-pill {
  padding: 6px 14px;
  border-radius: 20px;
  background: #F3F4F6;
  border: 1px solid transparent;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #E5E7EB;
  }

  &.active {
    background: #1F2937;
    color: white;
    border-color: #1F2937;
  }
}
```

## 9. Testing Plan (Playwright MCP)

### E2E Tests
```typescript
test.describe('Audit Log Page', () => {
  test('should display audit log entries', async ({ page }) => {
    await page.goto('/audit-logs');
    await expect(page.getByTestId('audit-table')).toBeVisible();

    const entries = await page.getByTestId('audit-entry').all();
    expect(entries.length).toBeGreaterThan(0);
  });

  test('should filter by date range', async ({ page }) => {
    await page.goto('/audit-logs');

    await page.getByTestId('date-range-picker').click();
    await page.getByTestId('date-today').click();

    const timestamps = await page.getByTestId('entry-timestamp').all();
    for (const timestamp of timestamps) {
      const text = await timestamp.textContent();
      expect(text).toContain('Today');
    }
  });

  test('should filter by action type', async ({ page }) => {
    await page.goto('/audit-logs');

    await page.getByTestId('action-filter').click();
    await page.getByTestId('action-login').click();

    const actions = await page.getByTestId('action-badge').all();
    for (const action of actions) {
      await expect(action).toHaveText(/Login/);
    }
  });

  test('should use quick filters', async ({ page }) => {
    await page.goto('/audit-logs');

    await page.getByTestId('quick-filter-failed').click();

    const results = await page.getByTestId('result-icon').all();
    for (const result of results) {
      await expect(result).toHaveClass(/failed/);
    }
  });

  test('should search audit logs', async ({ page }) => {
    await page.goto('/audit-logs');

    await page.getByTestId('search-input').fill('Employee');
    await page.getByTestId('search-button').click();

    await expect(page.getByTestId('audit-table')).toContainText('Employee');
  });

  test('should export audit trail', async ({ page }) => {
    await page.goto('/audit-logs');

    await page.getByTestId('date-range-picker').click();
    await page.getByTestId('date-last-7-days').click();

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-csv').click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('audit-log');
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('should toggle columns', async ({ page }) => {
    await page.goto('/audit-logs');

    await page.getByTestId('column-toggle').click();
    await page.getByTestId('column-ip-address').uncheck();

    await expect(page.getByRole('columnheader', { name: 'IP Address' })).not.toBeVisible();
  });

  test('should navigate to actor profile', async ({ page }) => {
    await page.goto('/audit-logs');

    await page.getByTestId('actor-link').first().click();
    await expect(page).toHaveURL(/\/users\/.+/);
  });
});
```

## 10. Implementation Steps & Estimates

### Phase 1: Page Structure (3 hours)
- [ ] Create audit log page layout
- [ ] Set up routing
- [ ] Implement responsive grid

### Phase 2: Filtering System (5 hours)
- [ ] Build advanced filters
- [ ] Create date range picker
- [ ] Implement actor/target filters
- [ ] Add action multi-select
- [ ] Build quick filter pills

### Phase 3: Data Table (5 hours)
- [ ] Implement audit log table
- [ ] Create actor cells with avatars
- [ ] Build action badges
- [ ] Add target links
- [ ] Implement result indicators

### Phase 4: Column Management (3 hours)
- [ ] Create column toggle
- [ ] Implement column ordering
- [ ] Save preferences
- [ ] Add responsive hiding

### Phase 5: Search & Export (4 hours)
- [ ] Implement text search
- [ ] Build export functionality
- [ ] Add format selection
- [ ] Create download handler

### Phase 6: Real-time Updates (3 hours)
- [ ] Set up Firestore listeners
- [ ] Implement live updates
- [ ] Add update indicators
- [ ] Handle connection status

### Phase 7: Testing & Polish (4 hours)
- [ ] Write E2E tests
- [ ] Add loading states
- [ ] Implement error handling
- [ ] Performance optimization
- [ ] Accessibility audit

**Total Estimate: 27 hours**

## 11. Open Questions & Assumptions

### Questions
1. Should we implement audit log archiving?
2. How long should logs be retained?
3. Should certain actions require supervisor approval to view?
4. Do we need to track audit log exports?
5. Should we add anomaly detection for suspicious activity?

### Assumptions
1. All admin actions are logged automatically
2. Logs are immutable once created
3. Default retention is 1 year
4. Export limited to 10,000 records
5. Real-time updates enabled by default

### Recommended UI Tweaks

1. **Add Activity Graph** showing trends over time
2. **Include Risk Score** for security-related events
3. **Add Saved Searches** for common investigations
4. **Implement Alert Rules** for specific patterns
5. **Show Related Events** for investigation context
6. **Add Compliance Reports** generation
7. **Include Session Timeline** for user activity
8. **Add Bulk Analysis** tools for patterns