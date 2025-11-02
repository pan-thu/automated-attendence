# Notification List – Implementation Workflow

Last updated: 2025-11-01
Figma Link: https://www.figma.com/design/zFhrSTYRqCIwzl7vMDUJi5/AttenDesk?node-id=15-6613

## 1. Overview & Scope

### Purpose
The Notification Management page provides a centralized interface for composing, sending, and managing system notifications to employees. It enables administrators to communicate important updates, policy changes, and targeted messages with tracking of delivery and read status.

### Key User Flows
- **Primary**: Compose notification → Select recipients → Send → Track delivery
- **Secondary**: View sent notifications → Monitor read rates → Export reports
- **Tertiary**: Filter by status/date → Search notifications → Resend messages

### Entry/Exit Points
- **Entry**: Dashboard navigation, sidebar menu, quick compose shortcuts
- **Exit**: Notification details, recipient lists, export downloads, compose modal

### Dependencies
- Firebase Cloud Messaging for push notifications
- `useNotifications` hook for data fetching
- `sendNotification` and `sendBulkNotification` Cloud Functions
- Real-time read status tracking
- Export utilities for reporting

## 2. Component Inventory

| Component | Type | Figma Source | Implementation Path | Status |
|-----------|------|--------------|-------------------|---------|
| Compose Button | Action | Top Right | `components/ui/button.tsx` | Exists |
| Filter Bar | Controls | Top Section | `components/notifications/FilterBar.tsx` | New |
| Date Range | Input | Date Filter | `components/ui/date-picker.tsx` | Exists |
| Status Filter | Select | Read Status | `components/ui/select.tsx` | Exists |
| Recipient Filter | Select | Recipient Scope | `components/ui/select.tsx` | Exists |
| Search Bar | Search | Title/Content | `components/ui/search.tsx` | Exists |
| Data Table | Table | Main Grid | `components/ui/table.tsx` | Exists |
| Priority Badge | Display | Priority Column | `components/notifications/PriorityBadge.tsx` | New |
| Read Status | Display | Status Column | `components/notifications/ReadStatus.tsx` | New |
| Recipient Count | Display | Recipients | `components/notifications/RecipientCount.tsx` | New |
| Action Menu | Dropdown | Row Actions | `components/ui/dropdown-menu.tsx` | Exists |
| Compose Modal | Modal | Create Form | `components/notifications/ComposeModal.tsx` | New |
| Mark All Button | Action | Bulk Action | `components/ui/button.tsx` | Exists |

### Design Tokens
```scss
// Priority Colors
$priority-critical: #EF4444;
$priority-high: #F59E0B;
$priority-medium: #3B82F6;
$priority-low: #10B981;

// Status Indicators
$status-unread: #EF4444;
$status-partial: #F59E0B;
$status-read: #10B981;

// Recipient Badges
$recipient-all: #8B5CF6;
$recipient-department: #3B82F6;
$recipient-individual: #10B981;

// Table Specific
$row-height: 64px;
$priority-dot-size: 8px;
```

## 3. Layout & Responsiveness

### Page Layout
```css
.notifications-container {
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  gap: 24px;
  padding: 24px;
  background: #F9FAFB;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: grid;
  grid-template-columns: 180px 180px 180px 1fr auto auto;
  gap: 16px;
  align-items: center;
}

.table-section {
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #E5E7EB;
}

@media (max-width: 1024px) {
  .filter-section {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 640px) {
  .filter-section {
    grid-template-columns: 1fr;
  }

  .table-section {
    overflow-x: auto;
  }
}
```

## 4. State & Data Model Mapping

### Notification State Model
```typescript
interface NotificationListState {
  notifications: Notification[];
  filters: {
    dateRange: {
      start: Date;
      end: Date;
    };
    readStatus: 'all' | 'read' | 'unread' | 'partial';
    recipientScope: 'all' | 'department' | 'individual';
    priority: 'all' | 'critical' | 'high' | 'medium' | 'low';
    search: string;
  };
  compose: {
    isOpen: boolean;
    draft: NotificationDraft;
  };
  statistics: {
    total: number;
    unreadCount: number;
    readRate: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  ui: {
    isLoading: boolean;
    selectedIds: Set<string>;
  };
}

interface Notification {
  id: string;
  sentAt: Date;
  title: string;
  content: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  recipients: {
    type: 'all' | 'department' | 'individuals';
    departments?: string[];
    individuals?: string[];
    count: number;
  };
  delivery: {
    sent: number;
    delivered: number;
    failed: number;
  };
  readStatus: {
    total: number;
    read: number;
    percentage: number;
  };
  sender: {
    uid: string;
    name: string;
    role: string;
  };
  metadata: {
    category?: string;
    actionUrl?: string;
    expiresAt?: Date;
  };
}

interface NotificationDraft {
  title: string;
  content: string;
  priority: string;
  recipients: {
    type: 'all' | 'department' | 'individuals';
    selection: string[];
  };
  scheduling: {
    sendNow: boolean;
    scheduledFor?: Date;
  };
  options: {
    requireRead: boolean;
    allowReply: boolean;
    expiresIn?: number;
  };
}
```

## 5. API Contracts (Proposed)

### List Notifications
```typescript
// GET /api/notifications/admin
interface NotificationListRequest {
  startDate?: string;
  endDate?: string;
  readStatus?: string;
  recipientScope?: string;
  priority?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

interface NotificationListResponse {
  notifications: Notification[];
  statistics: {
    totalSent: number;
    averageReadRate: number;
    byPriority: Record<string, number>;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}
```

### Send Notification
```typescript
// POST /api/notifications/send
interface SendNotificationRequest {
  title: string;
  content: string;
  priority: string;
  recipients: {
    type: 'all' | 'department' | 'individuals';
    ids?: string[];
  };
  options?: {
    scheduledFor?: string;
    expiresIn?: number;
    actionUrl?: string;
  };
}

interface SendNotificationResponse {
  notificationId: string;
  recipientCount: number;
  scheduledAt?: Date;
  status: 'sent' | 'scheduled' | 'failed';
}
```

## 6. Interaction & Accessibility

### Interactive Elements
```typescript
const interactions = {
  compose: {
    open: 'Open compose modal',
    recipientSelect: 'Choose target audience',
    prioritySelect: 'Set message priority',
    preview: 'Preview before sending',
    schedule: 'Schedule for later'
  },
  table: {
    rowClick: 'View notification details',
    statusHover: 'Show delivery breakdown',
    recipientClick: 'View recipient list',
    actionMenu: {
      view: 'View details',
      resend: 'Resend to failed',
      duplicate: 'Duplicate notification',
      delete: 'Delete notification'
    }
  },
  filters: {
    quickFilter: 'Last 7 days default',
    search: 'Search title and content',
    export: 'Export filtered results'
  },
  bulk: {
    selectAll: 'Select all visible',
    markRead: 'Mark as read',
    delete: 'Delete selected'
  }
};
```

### Accessibility Implementation
```html
<div role="region" aria-label="Notification management">
  <button
    aria-label="Compose new notification"
    aria-keyshortcuts="Ctrl+N"
  >
    <span aria-hidden="true">+</span>
    Compose Notification
  </button>
</div>

<table role="table" aria-label="Sent notifications">
  <thead>
    <tr role="row">
      <th role="columnheader" aria-sort="descending">
        Sent At
      </th>
      <th role="columnheader">Title</th>
      <th role="columnheader">Recipients</th>
      <th role="columnheader">Read Status</th>
    </tr>
  </thead>
  <tbody>
    <tr role="row">
      <td role="cell">
        <time datetime="2025-10-19T10:15:00">
          Oct 19, 2025
          <span class="time">10:15 AM</span>
        </time>
      </td>
      <td role="cell">
        <div class="notification-title">
          <span class="priority-dot critical" aria-label="Critical priority"></span>
          System Maintenance Alert
        </div>
      </td>
      <td role="cell">
        <span aria-label="All employees, 247 recipients">
          All Employees
          <span class="count">247</span>
        </span>
      </td>
      <td role="cell">
        <div class="read-status" aria-label="89.5% read">
          <div class="progress-bar">
            <div class="progress" style="width: 89.5%"></div>
          </div>
          <span>221/247 read</span>
        </div>
      </td>
    </tr>
  </tbody>
</table>
```

## 7. Validation Rules & Edge Cases

### Compose Validation
```typescript
const composeValidation = {
  title: {
    required: true,
    maxLength: 100,
    minLength: 5
  },
  content: {
    required: true,
    maxLength: 1000,
    minLength: 10
  },
  recipients: {
    required: true,
    minRecipients: 1,
    maxRecipients: 1000 // For individual selection
  },
  scheduling: {
    minAdvance: 5, // minutes
    maxAdvance: 30 * 24 * 60 // 30 days
  }
};
```

### Edge Cases
- **Failed Deliveries**: Show retry option with failure reason
- **Expired Notifications**: Mark as expired, prevent actions
- **Offline Recipients**: Track pending delivery
- **Large Recipient Lists**: Paginate recipient modal
- **Scheduled Notifications**: Allow cancellation before send
- **Template System**: Save frequently used messages

### Business Rules
```typescript
const notificationRules = {
  priority: {
    critical: {
      pushNotification: true,
      email: true,
      sms: false,
      requireAcknowledge: true
    },
    high: {
      pushNotification: true,
      email: true,
      sms: false
    },
    medium: {
      pushNotification: true,
      email: false
    },
    low: {
      pushNotification: true,
      email: false
    }
  },
  delivery: {
    retryAttempts: 3,
    retryDelay: 300000, // 5 minutes
    expirationDefault: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  permissions: {
    sendToAll: ['admin', 'manager'],
    sendToDepartment: ['admin', 'manager', 'supervisor'],
    sendToIndividual: ['admin', 'manager', 'supervisor']
  }
};
```

## 8. Styling & Theming

### Component Styles
```scss
.notification-table {
  .priority-cell {
    display: flex;
    align-items: center;
    gap: 8px;

    .priority-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;

      &.critical {
        background: var(--priority-critical);
        animation: pulse 2s infinite;
      }

      &.high {
        background: var(--priority-high);
      }

      &.medium {
        background: var(--priority-medium);
      }

      &.low {
        background: var(--priority-low);
      }
    }

    .title {
      font-weight: 500;
      color: #111827;
    }
  }

  .recipient-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 13px;

    &.all {
      background: #EDE9FE;
      color: #5B21B6;
    }

    &.department {
      background: #DBEAFE;
      color: #1E40AF;
    }

    &.individual {
      background: #D1FAE5;
      color: #065F46;
    }

    .count {
      font-weight: 600;
      font-size: 12px;
    }
  }

  .read-status {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .progress-bar {
      width: 100px;
      height: 6px;
      background: #E5E7EB;
      border-radius: 3px;
      overflow: hidden;

      .progress {
        height: 100%;
        background: linear-gradient(90deg, #10B981, #34D399);
        transition: width 0.3s ease;
      }
    }

    .status-text {
      font-size: 12px;
      color: #6B7280;
    }
  }

  .priority-badge {
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;

    &.critical {
      background: #FEE2E2;
      color: #991B1B;
    }

    &.high {
      background: #FED7AA;
      color: #92400E;
    }

    &.medium {
      background: #FEF3C7;
      color: #78350F;
    }

    &.low {
      background: #D1FAE5;
      color: #065F46;
    }
  }
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
  }
}
```

## 9. Testing Plan (Playwright MCP)

### E2E Tests
```typescript
test.describe('Notification Management', () => {
  test('should display notification list', async ({ page }) => {
    await page.goto('/notifications');
    await expect(page.getByTestId('notifications-table')).toBeVisible();

    const rows = await page.getByTestId('notification-row').all();
    expect(rows.length).toBeGreaterThan(0);
  });

  test('should compose and send notification', async ({ page }) => {
    await page.goto('/notifications');
    await page.getByTestId('compose-btn').click();

    // Fill compose form
    await page.getByTestId('notification-title').fill('Test Notification');
    await page.getByTestId('notification-content').fill('This is a test message');
    await page.getByTestId('priority-select').selectOption('medium');
    await page.getByTestId('recipient-all').check();

    // Send
    await page.getByTestId('send-btn').click();
    await expect(page.getByText('Notification sent successfully')).toBeVisible();
  });

  test('should filter by read status', async ({ page }) => {
    await page.goto('/notifications');

    await page.getByTestId('status-filter').selectOption('unread');

    const statuses = await page.getByTestId('read-percentage').all();
    for (const status of statuses) {
      const text = await status.textContent();
      const percentage = parseFloat(text);
      expect(percentage).toBeLessThan(100);
    }
  });

  test('should search notifications', async ({ page }) => {
    await page.goto('/notifications');

    await page.getByTestId('search-input').fill('Maintenance');
    await page.getByTestId('search-btn').click();

    const titles = await page.getByTestId('notification-title').all();
    for (const title of titles) {
      await expect(title).toContainText(/maintenance/i);
    }
  });

  test('should show notification details', async ({ page }) => {
    await page.goto('/notifications');

    await page.getByTestId('notification-row').first().click();

    await expect(page.getByTestId('notification-detail-modal')).toBeVisible();
    await expect(page.getByTestId('recipient-list')).toBeVisible();
    await expect(page.getByTestId('delivery-stats')).toBeVisible();
  });

  test('should export notifications', async ({ page }) => {
    await page.goto('/notifications');

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-csv').click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('notifications');
    expect(download.suggestedFilename()).toContain('.csv');
  });
});
```

## 10. Implementation Steps & Estimates

### Phase 1: Page Structure (3 hours)
- [ ] Create notifications page layout
- [ ] Set up routing
- [ ] Implement responsive grid

### Phase 2: Filter System (4 hours)
- [ ] Build filter controls
- [ ] Add date range picker
- [ ] Implement status/priority filters
- [ ] Create search functionality

### Phase 3: Data Table (5 hours)
- [ ] Build notification table
- [ ] Create priority indicators
- [ ] Implement read status display
- [ ] Add recipient badges
- [ ] Create action menus

### Phase 4: Compose Modal (6 hours)
- [ ] Build compose form
- [ ] Add recipient selector
- [ ] Implement rich text editor
- [ ] Add priority selection
- [ ] Create preview functionality
- [ ] Add scheduling options

### Phase 5: Delivery Tracking (4 hours)
- [ ] Implement read tracking
- [ ] Create delivery stats
- [ ] Add retry mechanism
- [ ] Build recipient list modal

### Phase 6: Export & Reports (3 hours)
- [ ] Implement CSV export
- [ ] Add delivery reports
- [ ] Create analytics view

### Phase 7: Testing & Polish (4 hours)
- [ ] Write E2E tests
- [ ] Add loading states
- [ ] Implement error handling
- [ ] Performance optimization

**Total Estimate: 29 hours**

## 11. Open Questions & Assumptions

### Questions
1. Should we support rich text/HTML in notifications?
2. Do we need notification templates?
3. Should recipients be able to reply?
4. How long should notifications be retained?
5. Should we add SMS notifications for critical alerts?

### Assumptions
1. Push notifications via FCM
2. No email integration initially
3. 30-day retention for sent notifications
4. Max 1000 individual recipients per notification
5. Read receipts tracked automatically

### Recommended UI Tweaks

1. **Add Template Library** for common messages
2. **Include A/B Testing** for notification effectiveness
3. **Add Audience Segmentation** tools
4. **Implement Delivery Analytics** dashboard
5. **Show Engagement Metrics** (click-through rates)
6. **Add Recurring Notifications** scheduler
7. **Include Language Selection** for multi-lingual
8. **Add Preview on Devices** for mobile/desktop