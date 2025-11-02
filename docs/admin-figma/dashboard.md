# Dashboard – Implementation Workflow

Last updated: 2025-11-01
Figma Link: https://www.figma.com/design/zFhrSTYRqCIwzl7vMDUJi5/AttenDesk?node-id=15-8502

## 1. Overview & Scope

### Purpose
The Dashboard provides a comprehensive overview of attendance metrics, leave requests, recent check-ins, and system activity for administrators to monitor and manage the workforce effectively.

### Key User Flows
- **Primary**: View real-time metrics → Review pending leaves → Monitor attendance
- **Secondary**: Access detailed reports → Navigate to specific sections
- **Tertiary**: Review audit logs → Track system changes

### Entry/Exit Points
- **Entry**: Post-login redirect, sidebar navigation
- **Exit**: Navigate to detailed views (Employees, Attendance, Leaves, etc.)

### Dependencies
- Firebase Firestore for real-time data
- Chart.js or Recharts for visualizations
- WebSocket/Firebase listeners for live updates
- Existing hooks: `useDashboardSummary`, `useAttendanceRecords`

## 2. Component Inventory

| Component | Type | Figma Source | Implementation Path | Status |
|-----------|------|--------------|-------------------|---------|
| Sidebar Navigation | Layout | Left Panel | `components/layout/Sidebar.tsx` | Exists |
| Top Header | Layout | Top Bar | `components/layout/Header.tsx` | Exists |
| Metric Cards | Data Display | Stats Row | New component needed | New |
| Attendance Chart | Chart | Line Graph | `components/charts/AttendanceChart.tsx` | New |
| Leave Requests | Table | Middle Section | `components/dashboard/LeaveRequests.tsx` | New |
| Attendance Checks | Table | Bottom Section | `components/dashboard/AttendanceTable.tsx` | New |
| Audit Log | List | Bottom Panel | `components/dashboard/AuditLog.tsx` | New |
| Progress Circles | Chart | Metric Visuals | `components/ui/ProgressCircle.tsx` | New |

### Design Tokens
```scss
// Colors - Dashboard Specific
$metric-green: #10B981;
$metric-red: #EF4444;
$metric-yellow: #F59E0B;
$metric-blue: #3B82F6;
$dark-sidebar: #111827;
$card-bg: #FFFFFF;
$border-light: #E5E7EB;

// Typography
$metric-value: 36px;
$metric-label: 14px;
$section-title: 18px;
$table-text: 14px;

// Spacing
$card-padding: 24px;
$section-gap: 24px;
$grid-gap: 16px;
```

## 3. Layout & Responsiveness

### Grid System
```css
/* Main Layout Grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: 250px 1fr; /* Sidebar + Content */
  grid-template-rows: auto 1fr;
  gap: 24px;
}

/* Content Grid */
.content-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
}

/* Responsive Breakpoints */
@media (max-width: 1280px) {
  grid-template-columns: repeat(3, 1fr);
}
@media (max-width: 768px) {
  grid-template-columns: 1fr;
}
```

### Component Layout Structure
```
└── Dashboard Container
    ├── Sidebar (Fixed 250px)
    │   ├── Logo
    │   ├── Navigation Menu
    │   └── User Profile
    └── Main Content
        ├── Header Bar
        ├── Metrics Row (5 cards)
        ├── Attendance Trends Chart
        ├── Leave Requests Table
        ├── Attendance Checks Table
        └── Audit Log Section
```

## 4. State & Data Model Mapping

### Dashboard State Model
```typescript
interface DashboardState {
  metrics: {
    totalEmployees: number;
    attendanceRate: number;
    pendingLeaves: number;
    activeViolations: number;
  };
  trends: {
    weekly: AttendanceTrend[];
    monthly: AttendanceTrend[];
  };
  leaveRequests: LeaveRequest[];
  recentCheckIns: CheckInRecord[];
  auditLogs: AuditEntry[];
  filters: {
    dateRange: DateRange;
    department?: string;
  };
  ui: {
    isLoading: boolean;
    refreshInterval: number;
  };
}

interface AttendanceTrend {
  date: string;
  present: number;
  absent: number;
  late: number;
}

interface LeaveRequest {
  id: string;
  employee: {
    id: string;
    name: string;
    avatar: string;
  };
  type: 'vacation' | 'sick' | 'personal';
  dates: {
    start: Date;
    end: Date;
  };
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
}
```

## 5. API Contracts (Proposed)

### Dashboard Summary Endpoint
```typescript
// GET /api/dashboard/summary
interface DashboardSummaryResponse {
  metrics: {
    employees: {
      total: number;
      active: number;
      onLeave: number;
    };
    attendance: {
      rate: number;
      present: number;
      absent: number;
      late: number;
    };
    leaves: {
      pending: number;
      approved: number;
      rejected: number;
    };
    violations: {
      active: number;
      resolved: number;
    };
  };
  timestamp: Date;
}

// Real-time subscription
const unsubscribe = onSnapshot(
  query(collection(db, 'ATTENDANCE_RECORDS'),
    where('date', '==', today),
    orderBy('timestamp', 'desc'),
    limit(10)
  ),
  (snapshot) => {
    // Update real-time metrics
  }
);
```

### Attendance Trends API
```typescript
// GET /api/dashboard/trends
interface TrendsRequest {
  startDate: string;
  endDate: string;
  groupBy: 'day' | 'week' | 'month';
}

interface TrendsResponse {
  data: Array<{
    date: string;
    metrics: {
      present: number;
      absent: number;
      late: number;
      onLeave: number;
    };
    percentage: number;
  }>;
}
```

## 6. Interaction & Accessibility

### Interactive Elements
```typescript
const interactions = {
  metricCards: {
    hover: 'Show tooltip with trend',
    click: 'Navigate to detailed view'
  },
  chart: {
    hover: 'Show data point details',
    click: 'Drill down to specific date',
    zoom: 'Pinch/scroll to zoom'
  },
  tables: {
    sort: 'Click column headers',
    filter: 'Inline search/filter',
    pagination: 'Load more on scroll',
    rowClick: 'Open detail modal'
  }
};
```

### Accessibility Features
```html
<!-- Metric Cards -->
<article role="region" aria-label="Attendance metrics">
  <h3 id="metric-title">Total Employees</h3>
  <div aria-labelledby="metric-title" aria-describedby="metric-detail">
    <span aria-label="Value">247</span>
    <span id="metric-detail" aria-label="Change">+12.5% from last month</span>
  </div>
</article>

<!-- Data Tables -->
<table role="table" aria-label="Recent attendance checks">
  <thead role="rowgroup">
    <tr role="row">
      <th role="columnheader" aria-sort="ascending">Employee</th>
    </tr>
  </thead>
</table>
```

### Keyboard Navigation
- `Tab`: Navigate between sections
- `Arrow Keys`: Navigate within tables
- `Enter/Space`: Activate buttons/links
- `Esc`: Close modals/dropdowns

## 7. Validation Rules & Edge Cases

### Data Validation
```typescript
const validationRules = {
  dateRange: {
    max: 90, // days
    min: 1,
    default: 30
  },
  refreshRate: {
    min: 30000, // 30 seconds
    max: 300000, // 5 minutes
    default: 60000 // 1 minute
  },
  pagination: {
    pageSize: 10,
    maxPages: 100
  }
};
```

### Edge Cases
- **No Data**: Show empty states with helpful messages
- **Partial Data**: Handle gracefully with loading skeletons
- **Stale Data**: Show last updated timestamp
- **Network Error**: Cache and show offline indicator
- **Permission Error**: Graceful degradation based on role

## 8. Styling & Theming

### Component Styles
```scss
// Metric Cards
.metric-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 24px;
  border: 1px solid var(--border-light);
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
  }

  .metric-value {
    font-size: 36px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .metric-change {
    font-size: 14px;
    color: var(--metric-green);

    &.negative {
      color: var(--metric-red);
    }
  }
}

// Progress Indicators
.progress-circle {
  --progress-color: var(--metric-blue);
  --track-color: var(--gray-200);
  stroke-dasharray: calc(2 * 3.14159 * var(--radius));
  stroke-dashoffset: calc(2 * 3.14159 * var(--radius) * (1 - var(--progress)));
  transition: stroke-dashoffset 0.5s ease;
}
```

## 9. Testing Plan (Playwright MCP)

### Dashboard Tests
```typescript
// tests/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Dashboard Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="dashboard-content"]');
  });

  test('should display all metric cards', async ({ page }) => {
    const metrics = ['total-employees', 'attendance-rate', 'pending-leaves', 'active-violations'];
    for (const metric of metrics) {
      await expect(page.getByTestId(`metric-${metric}`)).toBeVisible();
    }
  });

  test('should refresh data on interval', async ({ page }) => {
    const initialValue = await page.getByTestId('metric-total-employees').textContent();
    await page.waitForTimeout(60000); // Wait for refresh
    const newValue = await page.getByTestId('metric-total-employees').textContent();
    // Value might change if real-time
  });

  test('should filter attendance by date', async ({ page }) => {
    await page.getByTestId('date-filter').click();
    await page.getByTestId('date-today').click();
    await expect(page.getByTestId('attendance-table')).toContainText('Today');
  });

  test('should navigate to leave detail on click', async ({ page }) => {
    await page.getByTestId('leave-request-row').first().click();
    await expect(page).toHaveURL(/\/leaves\/\d+/);
  });
});
```

### Visual Regression
```typescript
test('dashboard visual regression', async ({ page }) => {
  const viewports = [
    { width: 1920, height: 1080, name: 'desktop' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 375, height: 812, name: 'mobile' }
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot(`dashboard-${viewport.name}.png`);
  }
});
```

## 10. Implementation Steps & Estimates

### Phase 1: Layout & Structure (4 hours)
- [ ] Set up dashboard page with sidebar layout
- [ ] Create responsive grid system
- [ ] Implement header with user info

### Phase 2: Metric Cards (3 hours)
- [ ] Build MetricCard component
- [ ] Add progress indicators
- [ ] Implement hover states and tooltips

### Phase 3: Charts & Visualizations (6 hours)
- [ ] Integrate charting library (Recharts recommended)
- [ ] Build AttendanceTrends component
- [ ] Add interactive features (zoom, hover, click)
- [ ] Create responsive chart sizing

### Phase 4: Data Tables (5 hours)
- [ ] Build LeaveRequests table component
- [ ] Create AttendanceChecks table
- [ ] Add sorting, filtering, pagination
- [ ] Implement row actions (approve/reject)

### Phase 5: Real-time Updates (4 hours)
- [ ] Set up Firebase listeners
- [ ] Implement WebSocket connections
- [ ] Add refresh indicators
- [ ] Handle connection errors

### Phase 6: Audit Log (3 hours)
- [ ] Create AuditLog component
- [ ] Add filtering by action type
- [ ] Implement infinite scroll
- [ ] Add export functionality

### Phase 7: Testing & Polish (4 hours)
- [ ] Write E2E tests with Playwright
- [ ] Add loading skeletons
- [ ] Implement error boundaries
- [ ] Performance optimization

**Total Estimate: 29 hours**

## 11. Open Questions & Assumptions

### Questions
1. Should metrics auto-refresh or manual refresh only?
2. What's the data retention period for audit logs?
3. Should we add export functionality for charts?
4. Do we need role-based metric visibility?
5. Should dashboard be customizable per admin?

### Assumptions
1. Real-time updates via Firebase listeners
2. 30-day default view for trends
3. Maximum 100 audit log entries shown
4. All admins see same dashboard layout
5. No drag-and-drop customization initially

### Recommended UI Tweaks

1. **Add Date Range Picker** in header for global filtering
2. **Include Quick Actions** dropdown for common tasks
3. **Add Notification Bell** with unread count
4. **Implement Dark Mode Toggle** in header
5. **Add Export Button** for each data section
6. **Include Search Bar** for global employee search
7. **Add Refresh Button** with last updated timestamp
8. **Show Loading Progress** for long-running operations

### Architecture Alignment Notes
- Leverage existing `useDashboardSummary` hook
- Reuse `Card`, `Table`, and `Badge` components from Shadcn/ui
- Apply consistent error handling from `error-handler.ts`
- Use newly implemented logging system for debugging
- Integrate rate limiting for API calls
- Cache dashboard data in localStorage for offline viewing