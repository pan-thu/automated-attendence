# Employee Profile – Implementation Workflow

Last updated: 2025-11-01
Figma Link: https://www.figma.com/design/zFhrSTYRqCIwzl7vMDUJi5/AttenDesk?node-id=15-6406

## 1. Overview & Scope

### Purpose
The Employee Profile page provides a comprehensive single-employee view combining personal information, attendance calendar, today's status, leave balance, penalties/violations, and employment details in a unified dashboard layout.

### Key User Flows
- **Primary**: View employee details → Check attendance calendar → Monitor today's status
- **Secondary**: Review leave balance → Check penalties → Edit employee information
- **Tertiary**: View attendance history → Export employee data → Navigate to related sections

### Entry/Exit Points
- **Entry**: Employee list click, search results, dashboard links, notification references
- **Exit**: Back to employee list, edit employee modal, related sections (attendance, leaves, penalties)

### Dependencies
- Firebase Firestore for employee data
- `useEmployeeDetail` hook for data fetching
- `useUpdateEmployee` hook for modifications
- Calendar component for attendance visualization
- Real-time status updates

## 2. Component Inventory

| Component | Type | Figma Source | Implementation Path | Status |
|-----------|------|--------------|-------------------|---------|
| Profile Header | Header | Top Section | `components/profile/ProfileHeader.tsx` | New |
| Avatar Badge | Display | Profile Image | `components/ui/avatar.tsx` | Exists |
| Contact Info | Display | Contact Card | `components/profile/ContactCard.tsx` | New |
| Employment Card | Display | Employment Details | `components/profile/EmploymentCard.tsx` | New |
| Status Card | Display | Today's Status | `components/profile/TodayStatusCard.tsx` | New |
| Attendance Calendar | Calendar | Center Section | `components/profile/AttendanceCalendar.tsx` | New |
| Leave Balance | Display | Leave Card | `components/profile/LeaveBalanceCard.tsx` | New |
| Leave Types List | List | Leave Details | `components/profile/LeaveTypesList.tsx` | New |
| Penalties Card | Display | Penalties Section | `components/profile/PenaltiesCard.tsx` | New |
| Violations Table | Table | Violations List | `components/profile/ViolationsTable.tsx` | New |
| Edit Button | Action | Header Action | `components/ui/button.tsx` | Exists |
| Stats Summary | Display | Top Stats | `components/profile/StatsSummary.tsx` | New |

### Design Tokens
```scss
// Layout
$sidebar-width: 350px;
$calendar-width: 600px;
$card-gap: 20px;

// Profile Colors
$avatar-border: #10B981;
$status-online: #10B981;
$status-present: #10B981;
$status-break: #F59E0B;
$status-checkout: #6B7280;

// Calendar Colors
$calendar-present: #10B981;
$calendar-late: #F59E0B;
$calendar-absent: #EF4444;
$calendar-leave: #3B82F6;
$calendar-today: #111827;

// Card Styles
$card-bg: #FFFFFF;
$card-border: #E5E7EB;
$card-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
```

## 3. Layout & Responsiveness

### Page Layout Structure
```css
.profile-container {
  display: grid;
  grid-template-columns: 350px 1fr 350px;
  gap: 24px;
  padding: 24px;
  background: #F9FAFB;
}

/* Left Sidebar */
.left-sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Center Content */
.center-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Right Sidebar */
.right-sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Responsive */
@media (max-width: 1280px) {
  .profile-container {
    grid-template-columns: 300px 1fr;
  }

  .right-sidebar {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 768px) {
  .profile-container {
    grid-template-columns: 1fr;
  }

  .calendar-section {
    overflow-x: auto;
  }
}
```

### Component Layout
```
└── Profile Page
    ├── Left Sidebar (350px)
    │   ├── Profile Card
    │   │   ├── Avatar with Status
    │   │   ├── Name & Role
    │   │   └── Employee ID
    │   ├── Contact Information
    │   ├── Employment Details
    │   └── Today's Status
    ├── Center Content
    │   ├── Stats Summary Row
    │   │   ├── Present Days
    │   │   ├── Late Arrivals
    │   │   ├── Absent Days
    │   │   └── Leave Days
    │   └── Attendance Calendar
    └── Right Sidebar (350px)
        ├── Leave Balance Card
        │   ├── Progress Bars
        │   └── Leave Type List
        └── Penalties & Violations
            ├── Summary Stats
            └── Recent Violations
```

## 4. State & Data Model Mapping

### Profile State Model
```typescript
interface EmployeeProfileState {
  employee: {
    uid: string;
    personal: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      avatar?: string;
      employeeId: string;
    };
    employment: {
      department: string;
      position: string;
      joinDate: Date;
      status: 'active' | 'inactive' | 'terminated';
    };
  };
  attendance: {
    calendar: {
      month: Date;
      days: Array<{
        date: Date;
        status: 'present' | 'late' | 'absent' | 'leave' | 'holiday' | 'weekend';
        checkIn?: string;
        checkOut?: string;
      }>;
    };
    todayStatus: {
      status: 'present' | 'break' | 'checked-out' | 'absent';
      checkIn?: string;
      breakStart?: string;
      breakEnd?: string;
      checkOut?: string;
    };
    statistics: {
      presentDays: number;
      lateArrivals: number;
      absentDays: number;
      leaveDays: number;
    };
  };
  leaves: {
    balance: {
      totalAvailable: number;
      types: Array<{
        type: 'vacation' | 'sick' | 'personal' | 'emergency';
        available: number;
        used: number;
        total: number;
        percentage: number;
      }>;
    };
  };
  penalties: {
    totalAmount: number;
    paidAmount: number;
    disputedAmount: number;
    violations: Array<{
      date: Date;
      type: string;
      amount: number;
      status: 'active' | 'paid' | 'disputed';
    }>;
    paymentDue?: Date;
  };
  ui: {
    isLoading: boolean;
    selectedMonth: Date;
    isEditMode: boolean;
  };
}
```

## 5. API Contracts (Proposed)

### Get Employee Profile
```typescript
// GET /api/employees/{id}/profile
interface EmployeeProfileResponse {
  employee: {
    personal: PersonalInfo;
    employment: EmploymentInfo;
    contact: ContactInfo;
  };
  attendance: {
    currentMonth: CalendarData;
    todayStatus: TodayStatus;
    statistics: AttendanceStats;
  };
  leaves: {
    balance: LeaveBalance[];
    upcoming: UpcomingLeave[];
  };
  penalties: {
    summary: PenaltySummary;
    recentViolations: Violation[];
    paymentDue?: Date;
  };
}

// GET /api/employees/{id}/calendar
interface CalendarRequest {
  employeeId: string;
  month: number;
  year: number;
}

interface CalendarResponse {
  days: Array<{
    date: string;
    status: string;
    checkIn?: string;
    checkOut?: string;
    duration?: number;
  }>;
  summary: {
    workingDays: number;
    present: number;
    late: number;
    absent: number;
    leaves: number;
  };
}
```

## 6. Interaction & Accessibility

### Interactive Elements
```typescript
const interactions = {
  calendar: {
    dayClick: 'Show day details in modal',
    monthNavigation: 'Previous/Next month arrows',
    hover: 'Show check-in/out times tooltip'
  },
  todayStatus: {
    refresh: 'Manual refresh button',
    autoRefresh: 'Every 30 seconds'
  },
  leaveBalance: {
    hover: 'Show breakdown tooltip',
    click: 'Navigate to leave history'
  },
  violations: {
    rowClick: 'Show violation details',
    disputeAction: 'Open dispute modal'
  },
  editEmployee: {
    click: 'Open edit modal',
    permissions: 'Check admin role'
  }
};
```

### Accessibility Implementation
```html
<div role="main" aria-label="Employee Profile">
  <section aria-label="Employee Information">
    <img
      alt="Marcus Johnson profile photo"
      aria-describedby="status-indicator"
    />
    <span
      id="status-indicator"
      role="status"
      aria-live="polite"
      aria-label="Currently present"
    >
      <span class="status-dot" aria-hidden="true"></span>
    </span>
  </section>

  <section aria-label="Attendance Calendar">
    <table role="grid" aria-label="October 2025 attendance">
      <thead>
        <tr role="row">
          <th role="columnheader" scope="col">Sun</th>
          <!-- More headers -->
        </tr>
      </thead>
      <tbody>
        <tr role="row">
          <td role="gridcell" aria-label="October 1, Present">
            <button aria-pressed="false">1</button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</div>
```

## 7. Validation Rules & Edge Cases

### Profile Update Validation
```typescript
const updateValidation = {
  personal: {
    email: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      unique: true
    },
    phone: {
      pattern: /^\+?[\d\s()-]{10,20}$/
    }
  },
  employment: {
    department: {
      required: true,
      mustExist: true
    },
    status: {
      transitions: {
        active: ['inactive', 'terminated'],
        inactive: ['active', 'terminated'],
        terminated: [] // Cannot change
      }
    }
  }
};
```

### Edge Cases
- **No Attendance Data**: Show "No data available" with onboarding hint
- **Future Dates**: Disable in calendar, show as gray
- **Incomplete Day**: Show partial status (only check-in)
- **Multiple Violations**: Group by date in violations table
- **Negative Leave Balance**: Show in red with warning icon
- **Profile Photo Missing**: Show initials avatar

## 8. Styling & Theming

### Component Styles
```scss
// Profile Card
.profile-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  text-align: center;

  .avatar-wrapper {
    position: relative;
    display: inline-block;

    .avatar {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      border: 4px solid var(--avatar-border);
    }

    .status-indicator {
      position: absolute;
      bottom: 10px;
      right: 10px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--status-online);
      border: 3px solid white;
    }
  }

  .employee-name {
    font-size: 24px;
    font-weight: 700;
    margin-top: 16px;
  }

  .employee-role {
    color: #6B7280;
    font-size: 14px;
  }
}

// Attendance Calendar
.attendance-calendar {
  background: white;
  border-radius: 12px;
  padding: 24px;

  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 8px;

    .calendar-day {
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;

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

      &.leave {
        background: #DBEAFE;
        color: #1E40AF;
      }

      &.today {
        font-weight: 700;
        box-shadow: inset 0 0 0 2px #111827;
      }

      &:hover {
        transform: scale(1.1);
      }
    }
  }
}

// Today's Status
.today-status {
  background: white;
  border-radius: 12px;
  padding: 20px;

  .status-timeline {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 16px;

    .timeline-item {
      display: flex;
      align-items: center;
      gap: 12px;

      .timeline-icon {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;

        &.active {
          background: #10B981;
          color: white;
        }

        &.pending {
          background: #F3F4F6;
          color: #9CA3AF;
        }
      }

      .timeline-content {
        flex: 1;

        .time {
          font-weight: 600;
          font-size: 14px;
        }

        .label {
          font-size: 12px;
          color: #6B7280;
        }
      }
    }
  }
}
```

## 9. Testing Plan (Playwright MCP)

### E2E Tests
```typescript
test.describe('Employee Profile Page', () => {
  test('should display employee information', async ({ page }) => {
    await page.goto('/employees/marcus-johnson');

    await expect(page.getByTestId('employee-name')).toHaveText('Marcus Johnson');
    await expect(page.getByTestId('employee-role')).toHaveText('Senior Software Developer');
    await expect(page.getByTestId('employee-id')).toHaveText('EMP-0034-001');
  });

  test('should show attendance calendar', async ({ page }) => {
    await page.goto('/employees/marcus-johnson');

    const calendar = page.getByTestId('attendance-calendar');
    await expect(calendar).toBeVisible();

    // Check current month is displayed
    const monthYear = await page.getByTestId('calendar-month').textContent();
    expect(monthYear).toContain('October 2025');
  });

  test('should navigate calendar months', async ({ page }) => {
    await page.goto('/employees/marcus-johnson');

    await page.getByTestId('calendar-prev-month').click();
    await expect(page.getByTestId('calendar-month')).toHaveText(/September 2025/);

    await page.getByTestId('calendar-next-month').click();
    await expect(page.getByTestId('calendar-month')).toHaveText(/October 2025/);
  });

  test('should show today status with real-time updates', async ({ page }) => {
    await page.goto('/employees/marcus-johnson');

    const statusCard = page.getByTestId('today-status');
    await expect(statusCard).toBeVisible();
    await expect(statusCard.getByText('Present')).toBeVisible();

    // Check timeline items
    await expect(page.getByTestId('checkin-time')).toBeVisible();
    await expect(page.getByTestId('break-time')).toBeVisible();
  });

  test('should display leave balance', async ({ page }) => {
    await page.goto('/employees/marcus-johnson');

    const leaveCard = page.getByTestId('leave-balance');
    await expect(leaveCard).toBeVisible();

    // Check leave types are displayed
    await expect(leaveCard.getByText('Vacation Leave')).toBeVisible();
    await expect(leaveCard.getByText('Sick Leave')).toBeVisible();
  });

  test('should show penalties and violations', async ({ page }) => {
    await page.goto('/employees/marcus-johnson');

    const penaltiesCard = page.getByTestId('penalties-card');
    await expect(penaltiesCard).toBeVisible();

    // Check summary stats
    await expect(penaltiesCard.getByTestId('total-penalties')).toBeVisible();
    await expect(penaltiesCard.getByTestId('amount-due')).toBeVisible();
  });

  test('should open edit modal', async ({ page }) => {
    await page.goto('/employees/marcus-johnson');

    await page.getByTestId('edit-employee-btn').click();
    await expect(page.getByTestId('edit-employee-modal')).toBeVisible();
  });
});
```

## 10. Implementation Steps & Estimates

### Phase 1: Layout Structure (3 hours)
- [ ] Create three-column responsive layout
- [ ] Set up routing with employee ID
- [ ] Implement data fetching hooks

### Phase 2: Profile & Contact Cards (3 hours)
- [ ] Build profile card with avatar
- [ ] Add status indicator
- [ ] Create contact information card
- [ ] Implement employment details card

### Phase 3: Attendance Calendar (5 hours)
- [ ] Build calendar component
- [ ] Implement month navigation
- [ ] Add day status colors
- [ ] Create day click interactions
- [ ] Add hover tooltips

### Phase 4: Today's Status (3 hours)
- [ ] Create status timeline
- [ ] Implement real-time updates
- [ ] Add refresh functionality
- [ ] Build status indicators

### Phase 5: Leave Balance (3 hours)
- [ ] Build leave balance card
- [ ] Create progress bars
- [ ] Implement leave type list
- [ ] Add usage percentages

### Phase 6: Penalties Section (3 hours)
- [ ] Create penalties summary
- [ ] Build violations table
- [ ] Add status badges
- [ ] Implement amount display

### Phase 7: Stats Summary (2 hours)
- [ ] Build stats cards row
- [ ] Calculate metrics
- [ ] Add visual indicators

### Phase 8: Testing & Polish (3 hours)
- [ ] Write E2E tests
- [ ] Add loading states
- [ ] Implement error handling
- [ ] Mobile optimization

**Total Estimate: 25 hours**

## 11. Open Questions & Assumptions

### Questions
1. Should calendar show multiple months at once?
2. Can employees view their own profiles?
3. Should we add print functionality?
4. Do we need overtime tracking display?
5. Should violations be editable from this view?

### Assumptions
1. Calendar shows one month at a time
2. Only admins can edit employee information
3. Today's status auto-refreshes every 30 seconds
4. Leave balance shows current year only
5. Maximum 5 recent violations shown

### Recommended UI Tweaks

1. **Add Quick Actions Menu** for common tasks
2. **Include Performance Metrics** section
3. **Add Document Upload** for employee files
4. **Show Team Members** in same department
5. **Include Emergency Contacts** section
6. **Add Work Schedule** visualization
7. **Include Notification Preferences**
8. **Show Login Activity** for security