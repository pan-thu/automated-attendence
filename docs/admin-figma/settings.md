# Settings – Implementation Workflow

Last updated: 2025-11-01
Figma Link: https://www.figma.com/design/zFhrSTYRqCIwzl7vMDUJi5/AttenDesk?node-id=15-6819

## 1. Overview & Scope

### Purpose
The Settings page provides a comprehensive configuration interface for all system parameters including company information, attendance rules, leave policies, penalty configurations, and notification preferences. It serves as the central control panel for customizing the attendance management system to match organizational requirements.

### Key User Flows
- **Primary**: Navigate sections → Edit settings → Validate → Save changes
- **Secondary**: Import/Export configurations → Reset defaults → Test settings
- **Tertiary**: View change history → Rollback changes → Apply templates

### Entry/Exit Points
- **Entry**: Dashboard navigation, sidebar menu, quick settings links, onboarding flow
- **Exit**: Save confirmation, dashboard redirect, related configuration pages

### Dependencies
- Firebase Firestore `COMPANY_SETTINGS` collection
- `useCompanySettings` hook for fetching
- `useUpdateCompanySettings` hook for updates
- Validation utilities for business rules
- Audit logging for all changes

## 2. Component Inventory

| Component | Type | Figma Source | Implementation Path | Status |
|-----------|------|--------------|-------------------|---------|
| Section Navigation | Tabs | Left Sidebar | `components/settings/SectionNav.tsx` | New |
| Settings Header | Header | Top Bar | `components/settings/SettingsHeader.tsx` | New |
| Company Info Form | Form | Company Section | `components/settings/CompanyInfoForm.tsx` | New |
| Workplace Map | Map | Location Picker | `components/ui/map-picker.tsx` | Exists |
| Time Window Config | Form | Attendance Rules | `components/settings/TimeWindowConfig.tsx` | New |
| Grace Period Input | Number | Time Inputs | `components/ui/number-input.tsx` | New |
| Leave Balance Form | Form | Leave Policies | `components/settings/LeaveBalanceForm.tsx` | New |
| Penalty Rules | Form | Penalty Config | `components/settings/PenaltyRulesForm.tsx` | New |
| Notification Prefs | Form | Notifications | `components/settings/NotificationPrefs.tsx` | New |
| Working Days Grid | Checkbox Grid | Schedule | `components/settings/WorkingDaysGrid.tsx` | New |
| Holiday Calendar | Calendar | Holiday Config | `components/settings/HolidayCalendar.tsx` | New |
| Save Button | Action | Bottom Bar | `components/ui/button.tsx` | Exists |
| Reset Button | Action | Section Actions | `components/ui/button.tsx` | Exists |

### Design Tokens
```scss
// Layout
$sidebar-width: 280px;
$content-max-width: 800px;
$section-gap: 32px;
$field-gap: 24px;

// Section Colors
$section-active: #111827;
$section-hover: #F3F4F6;
$section-icon: #6B7280;

// Input States
$input-focus: #3B82F6;
$input-error: #EF4444;
$input-success: #10B981;
$input-disabled: #E5E7EB;

// Map Colors
$geofence-fill: rgba(59, 130, 246, 0.1);
$geofence-stroke: #3B82F6;
$center-marker: #EF4444;
```

## 3. Layout & Responsiveness

### Page Layout Structure
```css
.settings-container {
  display: grid;
  grid-template-columns: 280px 1fr;
  height: calc(100vh - 64px);
  background: #F9FAFB;
}

.settings-sidebar {
  background: white;
  border-right: 1px solid #E5E7EB;
  padding: 24px 0;
  overflow-y: auto;
}

.settings-content {
  padding: 32px;
  overflow-y: auto;
}

.settings-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  max-width: 800px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.action-bar {
  position: sticky;
  bottom: 0;
  background: white;
  border-top: 1px solid #E5E7EB;
  padding: 16px 32px;
  display: flex;
  justify-content: flex-end;
  gap: 16px;
}

@media (max-width: 1024px) {
  .settings-container {
    grid-template-columns: 1fr;
  }

  .settings-sidebar {
    display: none;
  }

  .mobile-section-select {
    display: block;
    margin-bottom: 24px;
  }
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
```

## 4. State & Data Model Mapping

### Settings State Model
```typescript
interface SettingsState {
  sections: {
    active: string;
    modified: Set<string>;
    errors: Record<string, string[]>;
  };
  companyInfo: {
    name: string;
    logo?: string;
    address: string;
    phone: string;
    email: string;
    website?: string;
    timezone: string;
  };
  workplace: {
    center: {
      latitude: number;
      longitude: number;
    };
    radius: number; // meters
    wifiSSID?: string[];
    ipWhitelist?: string[];
  };
  attendance: {
    timeWindows: {
      checkIn: { start: string; end: string };
      break: { start: string; end: string };
      checkOut: { start: string; end: string };
    };
    gracePeriods: {
      late: number; // minutes
      early: number; // minutes
    };
    workingDays: boolean[]; // Sun-Sat
    minWorkHours: number;
    overtimeThreshold: number;
  };
  leaves: {
    types: Array<{
      id: string;
      name: string;
      annualQuota: number;
      carryForward: boolean;
      maxCarryForward?: number;
      requiresApproval: boolean;
      requiresAttachment: boolean;
      minNoticeDays?: number;
    }>;
    approvalLevels: number;
    blackoutDates: Date[];
  };
  penalties: {
    enabled: boolean;
    rules: Array<{
      violation: string;
      threshold: number;
      amount: number;
      escalation: boolean;
    }>;
    gracePeriodDays: number;
    waiverApproval: boolean;
  };
  notifications: {
    channels: {
      push: boolean;
      email: boolean;
      sms: boolean;
    };
    reminders: {
      checkIn: boolean;
      checkOut: boolean;
      leaveExpiry: boolean;
    };
    schedule: {
      morningReminder: string;
      eveningReminder: string;
    };
  };
  holidays: {
    list: Array<{
      date: Date;
      name: string;
      type: 'public' | 'company';
    }>;
    importSource?: string;
  };
  ui: {
    isDirty: boolean;
    isSaving: boolean;
    validationErrors: Record<string, string>;
    lastSaved?: Date;
  };
}
```

## 5. API Contracts (Proposed)

### Get Settings
```typescript
// GET /api/settings
interface GetSettingsResponse {
  settings: CompanySettings;
  metadata: {
    lastModified: Date;
    modifiedBy: string;
    version: number;
  };
}
```

### Update Settings
```typescript
// PUT /api/settings
interface UpdateSettingsRequest {
  section: string;
  changes: Partial<CompanySettings>;
  reason?: string;
}

interface UpdateSettingsResponse {
  success: boolean;
  settings: CompanySettings;
  validation?: {
    warnings: string[];
    info: string[];
  };
  auditLogId: string;
}
```

### Import/Export Settings
```typescript
// GET /api/settings/export
interface ExportSettingsResponse {
  settings: CompanySettings;
  format: 'json' | 'yaml';
  timestamp: Date;
}

// POST /api/settings/import
interface ImportSettingsRequest {
  settings: Partial<CompanySettings>;
  validateOnly?: boolean;
}
```

## 6. Interaction & Accessibility

### Form Interactions
```typescript
const interactions = {
  navigation: {
    sectionClick: 'Scroll to section',
    keyboard: 'Tab through sections',
    breadcrumb: 'Show current section'
  },
  forms: {
    autoSave: 'Save after 3 seconds of inactivity',
    validation: 'Real-time field validation',
    reset: 'Reset section to defaults',
    undo: 'Undo last change'
  },
  map: {
    click: 'Set workplace center',
    drag: 'Adjust center position',
    scroll: 'Zoom in/out',
    radiusSlider: 'Adjust geofence radius'
  },
  timeInputs: {
    increment: 'Arrow keys or buttons',
    format: '24-hour or 12-hour',
    validation: 'Check overlaps'
  }
};
```

### Accessibility Implementation
```html
<nav role="navigation" aria-label="Settings sections">
  <ul role="list">
    <li role="listitem">
      <button
        role="tab"
        aria-selected="true"
        aria-controls="company-info-panel"
      >
        <span class="icon" aria-hidden="true"></span>
        Company Information
      </button>
    </li>
  </ul>
</nav>

<form role="form" aria-label="Company settings">
  <fieldset>
    <legend>Attendance Rules</legend>
    <div role="group" aria-labelledby="time-windows-label">
      <label id="time-windows-label">Check-in Time Window</label>
      <input
        type="time"
        aria-label="Check-in start time"
        aria-describedby="checkin-help"
      />
      <span id="checkin-help" class="help-text">
        Employees can check in during this window
      </span>
    </div>
  </fieldset>
</form>
```

## 7. Validation Rules & Edge Cases

### Validation Rules
```typescript
const validationRules = {
  workplace: {
    radius: {
      min: 10,
      max: 5000, // meters
      default: 100
    },
    coordinates: {
      latitude: { min: -90, max: 90 },
      longitude: { min: -180, max: 180 }
    }
  },
  timeWindows: {
    checkIn: {
      minDuration: 30, // minutes
      maxDuration: 240 // minutes
    },
    noOverlap: true,
    chronological: true
  },
  gracePeriods: {
    min: 0,
    max: 60, // minutes
    step: 5
  },
  leaves: {
    quota: {
      min: 0,
      max: 365
    },
    carryForward: {
      maxPercentage: 50
    }
  },
  penalties: {
    amount: {
      min: 0,
      max: 1000,
      currency: 'USD'
    },
    threshold: {
      min: 1,
      max: 30
    }
  }
};
```

### Edge Cases
- **Conflicting Time Windows**: Show warning, prevent save
- **Invalid Coordinates**: Validate against actual location
- **Retroactive Changes**: Warn about impact on historical data
- **Holiday Conflicts**: Check against existing attendance
- **Timezone Changes**: Recalculate all timestamps
- **Import Validation**: Dry-run before applying

### Business Logic
```typescript
const businessLogic = {
  changes: {
    requireConfirmation: [
      'timeWindows',
      'penaltyRules',
      'leaveQuotas'
    ],
    requireApproval: [
      'companyInfo',
      'workplaceBoundaries'
    ],
    immediateEffect: [
      'notifications',
      'gracePeriods'
    ]
  },
  constraints: {
    workingDays: 'At least 1 day required',
    leaveTypes: 'At least 1 type required',
    timeWindows: 'Must cover full work day'
  }
};
```

## 8. Styling & Theming

### Component Styles
```scss
.settings-sidebar {
  .section-nav {
    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 24px;
      color: #4B5563;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background: #F9FAFB;
      }

      &.active {
        background: #EFF6FF;
        color: #1D4ED8;
        border-left: 3px solid #3B82F6;
      }

      .icon {
        width: 20px;
        height: 20px;
        color: #9CA3AF;
      }

      &.modified::after {
        content: '•';
        color: #F59E0B;
        margin-left: auto;
      }
    }
  }
}

.settings-form {
  .form-section {
    margin-bottom: 32px;

    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;

      .badge {
        background: #FEF3C7;
        color: #92400E;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 11px;
      }
    }
  }

  .time-input-group {
    display: flex;
    align-items: center;
    gap: 12px;

    .time-input {
      padding: 8px 12px;
      border: 1px solid #D1D5DB;
      border-radius: 6px;
      font-family: monospace;

      &:focus {
        border-color: #3B82F6;
        outline: none;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }
    }

    .separator {
      color: #9CA3AF;
    }
  }

  .map-picker {
    height: 300px;
    border-radius: 8px;
    overflow: hidden;
    margin-top: 16px;

    .radius-control {
      position: absolute;
      bottom: 20px;
      left: 20px;
      right: 20px;
      background: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
  }
}

.working-days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;

  .day-toggle {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px;
    border: 2px solid #E5E7EB;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;

    &.active {
      background: #EFF6FF;
      border-color: #3B82F6;
    }

    .day-name {
      font-weight: 600;
      font-size: 12px;
    }

    .day-initial {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: #F3F4F6;
    }
  }
}
```

## 9. Testing Plan (Playwright MCP)

### E2E Tests
```typescript
test.describe('Settings Page', () => {
  test('should navigate between sections', async ({ page }) => {
    await page.goto('/settings');

    await page.getByTestId('nav-attendance').click();
    await expect(page.getByTestId('attendance-section')).toBeInViewport();

    await page.getByTestId('nav-leaves').click();
    await expect(page.getByTestId('leaves-section')).toBeInViewport();
  });

  test('should update company information', async ({ page }) => {
    await page.goto('/settings');

    await page.getByTestId('company-name').clear();
    await page.getByTestId('company-name').fill('Test Company');
    await page.getByTestId('company-email').clear();
    await page.getByTestId('company-email').fill('admin@test.com');

    await page.getByTestId('save-settings').click();
    await expect(page.getByText('Settings saved successfully')).toBeVisible();
  });

  test('should configure workplace geofence', async ({ page }) => {
    await page.goto('/settings');
    await page.getByTestId('nav-workplace').click();

    // Set location on map
    const map = page.getByTestId('workplace-map');
    await map.click({ position: { x: 200, y: 200 } });

    // Adjust radius
    await page.getByTestId('radius-slider').fill('150');

    await page.getByTestId('save-settings').click();
    await expect(page.getByText('Workplace settings updated')).toBeVisible();
  });

  test('should validate time windows', async ({ page }) => {
    await page.goto('/settings');
    await page.getByTestId('nav-attendance').click();

    // Set invalid time window
    await page.getByTestId('checkin-start').fill('10:00');
    await page.getByTestId('checkin-end').fill('09:00');

    await expect(page.getByTestId('time-error')).toHaveText('End time must be after start time');
  });

  test('should configure leave policies', async ({ page }) => {
    await page.goto('/settings');
    await page.getByTestId('nav-leaves').click();

    await page.getByTestId('annual-leave-quota').clear();
    await page.getByTestId('annual-leave-quota').fill('21');
    await page.getByTestId('sick-leave-quota').clear();
    await page.getByTestId('sick-leave-quota').fill('10');

    await page.getByTestId('save-settings').click();
    await expect(page.getByText('Leave policies updated')).toBeVisible();
  });

  test('should import/export settings', async ({ page }) => {
    await page.goto('/settings');

    // Export
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-settings').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('settings');

    // Import
    await page.getByTestId('import-settings').click();
    await page.getByTestId('import-file').setInputFiles('test-settings.json');
    await page.getByTestId('confirm-import').click();

    await expect(page.getByText('Settings imported successfully')).toBeVisible();
  });
});
```

## 10. Implementation Steps & Estimates

### Phase 1: Page Structure (4 hours)
- [ ] Create settings layout with sidebar
- [ ] Implement section navigation
- [ ] Set up routing
- [ ] Add responsive design

### Phase 2: Company & Workplace (5 hours)
- [ ] Build company info form
- [ ] Integrate map picker
- [ ] Implement geofence configuration
- [ ] Add coordinate validation

### Phase 3: Attendance Rules (5 hours)
- [ ] Create time window inputs
- [ ] Build grace period controls
- [ ] Implement working days grid
- [ ] Add validation logic

### Phase 4: Leave Configuration (4 hours)
- [ ] Build leave type manager
- [ ] Create quota inputs
- [ ] Add approval rules
- [ ] Implement blackout dates

### Phase 5: Penalty Settings (3 hours)
- [ ] Create penalty rules form
- [ ] Add threshold configuration
- [ ] Implement amount inputs
- [ ] Build escalation logic

### Phase 6: Notifications (3 hours)
- [ ] Build channel toggles
- [ ] Create reminder schedule
- [ ] Add template configuration

### Phase 7: Save & Validation (4 hours)
- [ ] Implement save functionality
- [ ] Add validation system
- [ ] Create change detection
- [ ] Build confirmation dialogs

### Phase 8: Import/Export (3 hours)
- [ ] Add export functionality
- [ ] Implement import with validation
- [ ] Create backup system

### Phase 9: Testing & Polish (4 hours)
- [ ] Write E2E tests
- [ ] Add loading states
- [ ] Implement error handling
- [ ] Performance optimization

**Total Estimate: 35 hours**

## 11. Open Questions & Assumptions

### Questions
1. Should settings changes require multi-level approval?
2. Do we need setting templates for different industries?
3. Should we track setting change history?
4. Can different departments have different settings?
5. Should we add a preview mode for settings?

### Assumptions
1. All settings globally applied (no per-department)
2. Changes take effect immediately unless specified
3. No versioning system initially
4. Single admin can modify settings
5. Backup created automatically before changes

### Recommended UI Tweaks

1. **Add Settings Templates** for quick setup
2. **Include Change Preview** showing impact
3. **Add Validation Simulator** to test rules
4. **Implement Version Control** for rollback
5. **Show Real-time Impact** analysis
6. **Add Quick Toggle** for maintenance mode
7. **Include API Key Management** section
8. **Add Integration Settings** for third-party services