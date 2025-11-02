# Reports – Implementation Workflow

Last updated: 2025-11-01
Figma Link: https://www.figma.com/design/zFhrSTYRqCIwzl7vMDUJi5/AttenDesk?node-id=15-7025

## 1. Overview & Scope

### Purpose
The Reports page provides a flexible report builder interface for generating comprehensive workforce analytics. It enables administrators to create custom reports with selected date ranges, target audiences, and specific metrics, outputting data in various formats for analysis and decision-making.

### Key User Flows
- **Primary**: Select date range → Choose scope → Select metrics → Generate report
- **Secondary**: Save report template → Schedule reports → Export in multiple formats
- **Tertiary**: View report history → Share reports → Create dashboards

### Entry/Exit Points
- **Entry**: Dashboard navigation, sidebar menu, quick report links, scheduled triggers
- **Exit**: Download report, email distribution, dashboard redirect, save template

### Dependencies
- Firebase Functions for report generation
- `generateAttendanceReport` Cloud Function
- Chart.js/Recharts for visualizations
- Export utilities for multiple formats
- Cloud Storage for report caching

## 2. Component Inventory

| Component | Type | Figma Source | Implementation Path | Status |
|-----------|------|--------------|-------------------|---------|
| Report Builder | Container | Main Section | `components/reports/ReportBuilder.tsx` | New |
| Date Range Card | Card | Date Selection | `components/reports/DateRangeCard.tsx` | New |
| Quick Date Pills | Pills | Quick Select | `components/ui/toggle-group.tsx` | Exists |
| Date Pickers | Input | Start/End Date | `components/ui/date-picker.tsx` | Exists |
| Scope Card | Card | Report Scope | `components/reports/ScopeCard.tsx` | New |
| Scope Options | Radio | Level Selection | `components/ui/radio-group.tsx` | Exists |
| Department Filter | Select | Department | `components/ui/select.tsx` | Exists |
| Employee Filter | Multi-select | Employee Level | `components/ui/multi-select.tsx` | New |
| Metrics Card | Card | Metrics Selection | `components/reports/MetricsCard.tsx` | New |
| Metric Checkboxes | Checkbox | Metric Options | `components/ui/checkbox.tsx` | Exists |
| Format Selector | Select | Output Format | `components/reports/FormatSelector.tsx` | New |
| Generate Button | Action | Top Right | `components/ui/button.tsx` | Exists |
| Report Preview | Display | Preview Area | `components/reports/ReportPreview.tsx` | New |

### Design Tokens
```scss
// Card Layout
$card-padding: 24px;
$card-gap: 24px;
$card-border-radius: 12px;
$card-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

// Date Range Colors
$date-active: #111827;
$date-hover: #F3F4F6;
$date-selected: #3B82F6;

// Scope Icons
$scope-company: #8B5CF6;
$scope-department: #3B82F6;
$scope-individual: #10B981;

// Metric Categories
$metric-attendance: #3B82F6;
$metric-leave: #10B981;
$metric-penalty: #F59E0B;
$metric-overtime: #8B5CF6;
```

## 3. Layout & Responsiveness

### Page Layout
```css
.reports-container {
  padding: 24px;
  background: #F9FAFB;
  min-height: calc(100vh - 64px);
}

.report-builder {
  max-width: 1400px;
  margin: 0 auto;
}

.builder-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.builder-cards {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 24px;
  margin-bottom: 32px;
}

.builder-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.card-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #F3F4F6;
}

@media (max-width: 1280px) {
  .builder-cards {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .reports-container {
    padding: 16px;
  }

  .builder-header {
    flex-direction: column;
    gap: 16px;
  }
}
```

## 4. State & Data Model Mapping

### Report State Model
```typescript
interface ReportState {
  configuration: {
    dateRange: {
      type: 'quick' | 'custom';
      quick?: 'today' | 'week' | 'month' | 'quarter' | 'year';
      custom?: {
        start: Date;
        end: Date;
      };
    };
    scope: {
      level: 'company' | 'department' | 'individual';
      departments?: string[];
      employees?: string[];
    };
    metrics: {
      attendance: {
        summary: boolean;
        lateArrivals: boolean;
        absences: boolean;
        overtime: boolean;
      };
      leaves: {
        usage: boolean;
        patterns: boolean;
        balance: boolean;
      };
      penalties: {
        records: boolean;
        amounts: boolean;
        trends: boolean;
      };
    };
    format: {
      output: 'charts' | 'table' | 'both';
      export: 'pdf' | 'excel' | 'csv';
    };
  };
  generation: {
    isGenerating: boolean;
    progress: number;
    currentStep: string;
  };
  preview: {
    data: any;
    charts: ChartData[];
    tables: TableData[];
  };
  history: {
    recent: ReportHistory[];
    saved: SavedTemplate[];
  };
  ui: {
    isValid: boolean;
    errors: string[];
    employeeCount: number;
    estimatedTime: number;
  };
}

interface ReportHistory {
  id: string;
  name: string;
  generatedAt: Date;
  generatedBy: string;
  configuration: ReportConfiguration;
  downloadUrl?: string;
  expiresAt?: Date;
}

interface SavedTemplate {
  id: string;
  name: string;
  description?: string;
  configuration: ReportConfiguration;
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    recipients: string[];
  };
}
```

## 5. API Contracts (Proposed)

### Generate Report
```typescript
// POST /api/reports/generate
interface GenerateReportRequest {
  dateRange: {
    start: string;
    end: string;
  };
  scope: {
    type: 'company' | 'department' | 'individual';
    ids?: string[];
  };
  metrics: string[];
  format: 'pdf' | 'excel' | 'csv';
  options?: {
    includeCharts: boolean;
    includeSummary: boolean;
    groupBy?: string;
  };
}

interface GenerateReportResponse {
  reportId: string;
  status: 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt?: Date;
  metadata: {
    recordCount: number;
    fileSize: number;
    generationTime: number;
  };
}
```

### Report Templates
```typescript
// GET /api/reports/templates
interface GetTemplatesResponse {
  templates: SavedTemplate[];
  system: SystemTemplate[];
}

// POST /api/reports/templates
interface SaveTemplateRequest {
  name: string;
  description?: string;
  configuration: ReportConfiguration;
  schedule?: ScheduleConfiguration;
}
```

## 6. Interaction & Accessibility

### Interactive Elements
```typescript
const interactions = {
  dateRange: {
    quickSelect: 'Toggle predefined periods',
    customRange: 'Open date picker',
    validation: 'Check date validity'
  },
  scope: {
    levelSelect: 'Radio button selection',
    departmentFilter: 'Multi-select departments',
    employeeSearch: 'Search and select employees',
    preview: 'Show affected employee count'
  },
  metrics: {
    categoryToggle: 'Expand/collapse category',
    selectAll: 'Select all in category',
    tooltip: 'Show metric description'
  },
  generation: {
    validate: 'Check configuration',
    preview: 'Show sample data',
    generate: 'Start report generation',
    cancel: 'Cancel in-progress'
  },
  output: {
    download: 'Download generated report',
    email: 'Send to recipients',
    schedule: 'Set up recurring',
    save: 'Save as template'
  }
};
```

### Accessibility Implementation
```html
<div role="region" aria-label="Report builder">
  <section aria-labelledby="date-range-title">
    <h2 id="date-range-title" class="card-title">
      <span class="icon" aria-hidden="true">📅</span>
      Date Range
    </h2>
    <div role="group" aria-label="Quick date selection">
      <button
        role="radio"
        aria-checked="true"
        aria-label="This week"
      >
        This Week
      </button>
    </div>
  </section>

  <section aria-labelledby="scope-title">
    <h2 id="scope-title" class="card-title">
      <span class="icon" aria-hidden="true">🎯</span>
      Report Scope
    </h2>
    <fieldset>
      <legend class="sr-only">Organization level</legend>
      <label>
        <input
          type="radio"
          name="scope"
          value="company"
          aria-describedby="company-desc"
        />
        <span>Entire Company</span>
      </label>
      <span id="company-desc" class="help-text">
        Include all 247 employees
      </span>
    </fieldset>
  </section>
</div>
```

## 7. Validation Rules & Edge Cases

### Validation Rules
```typescript
const validationRules = {
  dateRange: {
    maxDays: 365,
    minDays: 1,
    notFuture: true,
    startBeforeEnd: true
  },
  scope: {
    maxEmployees: 1000,
    minEmployees: 1,
    requireSelection: true
  },
  metrics: {
    minMetrics: 1,
    maxMetrics: 20,
    compatibilityCheck: true
  },
  export: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    timeout: 300000 // 5 minutes
  }
};
```

### Edge Cases
- **Large Data Sets**: Implement pagination or chunking
- **Long Generation Time**: Show progress, allow background processing
- **Invalid Date Ranges**: Disable generate button, show error
- **No Data Available**: Show empty state with suggestions
- **Export Failures**: Provide retry mechanism
- **Concurrent Reports**: Queue system for multiple requests

### Performance Optimization
```typescript
const performanceRules = {
  caching: {
    ttl: 3600000, // 1 hour
    key: 'dateRange + scope + metrics'
  },
  chunking: {
    maxRecordsPerChunk: 1000,
    parallelProcessing: true
  },
  compression: {
    enabled: true,
    formats: ['gzip', 'deflate']
  },
  queue: {
    maxConcurrent: 3,
    priority: ['critical', 'high', 'normal', 'low']
  }
};
```

## 8. Styling & Theming

### Component Styles
```scss
.report-builder {
  .date-range-card {
    .quick-select-pills {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;

      .pill {
        padding: 8px 16px;
        border-radius: 20px;
        background: #F3F4F6;
        border: 1px solid transparent;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 14px;
        font-weight: 500;

        &:hover {
          background: #E5E7EB;
        }

        &.active {
          background: #111827;
          color: white;
        }
      }
    }

    .custom-range {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 16px;
      align-items: center;
      margin-top: 20px;

      .date-input {
        padding: 10px 14px;
        border: 1px solid #D1D5DB;
        border-radius: 8px;

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

    .date-info {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      padding: 12px;
      background: #EFF6FF;
      border-radius: 8px;
      color: #1E40AF;
      font-size: 14px;

      .icon {
        width: 16px;
        height: 16px;
      }
    }
  }

  .scope-card {
    .scope-options {
      display: flex;
      flex-direction: column;
      gap: 16px;

      .scope-option {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        border: 2px solid #E5E7EB;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          border-color: #D1D5DB;
          background: #F9FAFB;
        }

        &.selected {
          border-color: #3B82F6;
          background: #EFF6FF;
        }

        .option-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          font-size: 20px;
        }

        .option-content {
          flex: 1;

          .option-title {
            font-weight: 600;
            margin-bottom: 4px;
          }

          .option-desc {
            font-size: 13px;
            color: #6B7280;
          }
        }
      }
    }

    .employee-count {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 16px;
      padding: 12px;
      background: #D1FAE5;
      border-radius: 8px;
      color: #065F46;
      font-weight: 500;

      .icon {
        width: 20px;
        height: 20px;
      }
    }
  }

  .metrics-card {
    .metric-category {
      margin-bottom: 24px;

      .category-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        font-weight: 600;
        color: #374151;
      }

      .metric-list {
        display: flex;
        flex-direction: column;
        gap: 8px;

        .metric-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          border-radius: 6px;
          transition: background 0.2s;

          &:hover {
            background: #F9FAFB;
          }

          input[type="checkbox"] {
            width: 18px;
            height: 18px;
            cursor: pointer;
          }

          label {
            flex: 1;
            cursor: pointer;
            font-size: 14px;
          }

          .metric-icon {
            width: 16px;
            height: 16px;
            color: #9CA3AF;
          }
        }
      }
    }
  }
}

.format-selector {
  display: flex;
  align-items: center;
  gap: 12px;

  .format-label {
    font-size: 14px;
    color: #6B7280;
  }

  .format-buttons {
    display: flex;
    gap: 8px;

    button {
      padding: 6px 12px;
      border: 1px solid #D1D5DB;
      border-radius: 6px;
      background: white;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background: #F9FAFB;
      }

      &.selected {
        background: #3B82F6;
        color: white;
        border-color: #3B82F6;
      }
    }
  }
}

.metric-count {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 20px;
  padding: 4px 12px;
  background: #EDE9FE;
  color: #5B21B6;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;

  .icon {
    width: 14px;
    height: 14px;
  }
}
```

## 9. Testing Plan (Playwright MCP)

### E2E Tests
```typescript
test.describe('Reports Page', () => {
  test('should generate attendance report', async ({ page }) => {
    await page.goto('/reports');

    // Select date range
    await page.getByTestId('quick-date-week').click();

    // Select scope
    await page.getByTestId('scope-company').check();

    // Select metrics
    await page.getByTestId('metric-attendance-summary').check();
    await page.getByTestId('metric-late-arrivals').check();

    // Generate
    await page.getByTestId('generate-report').click();

    // Wait for generation
    await expect(page.getByTestId('report-preview')).toBeVisible({ timeout: 30000 });
  });

  test('should validate date range', async ({ page }) => {
    await page.goto('/reports');

    // Select custom range
    await page.getByTestId('date-custom').click();

    // Set invalid range
    await page.getByTestId('date-start').fill('2025-10-20');
    await page.getByTestId('date-end').fill('2025-10-19');

    await expect(page.getByTestId('date-error')).toHaveText('End date must be after start date');
    await expect(page.getByTestId('generate-report')).toBeDisabled();
  });

  test('should filter by department', async ({ page }) => {
    await page.goto('/reports');

    await page.getByTestId('scope-department').check();
    await page.getByTestId('department-filter').click();
    await page.getByTestId('dept-engineering').check();
    await page.getByTestId('dept-sales').check();

    await expect(page.getByTestId('employee-count')).toContainText('45 employees');
  });

  test('should export report', async ({ page }) => {
    await page.goto('/reports');

    // Configure report
    await page.getByTestId('quick-date-month').click();
    await page.getByTestId('scope-company').check();
    await page.getByTestId('metric-attendance-summary').check();

    // Generate
    await page.getByTestId('generate-report').click();
    await page.waitForSelector('[data-testid="report-preview"]');

    // Export
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-pdf').click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('attendance-report');
    expect(download.suggestedFilename()).toContain('.pdf');
  });

  test('should save report template', async ({ page }) => {
    await page.goto('/reports');

    // Configure report
    await page.getByTestId('quick-date-month').click();
    await page.getByTestId('scope-company').check();
    await page.getByTestId('metric-attendance-summary').check();

    // Save as template
    await page.getByTestId('save-template').click();
    await page.getByTestId('template-name').fill('Monthly Attendance');
    await page.getByTestId('template-save').click();

    await expect(page.getByText('Template saved successfully')).toBeVisible();
  });
});
```

## 10. Implementation Steps & Estimates

### Phase 1: Page Structure (3 hours)
- [ ] Create reports page layout
- [ ] Build card components
- [ ] Implement responsive design

### Phase 2: Date Range Selection (4 hours)
- [ ] Build quick select pills
- [ ] Implement date pickers
- [ ] Add validation logic
- [ ] Create date info display

### Phase 3: Scope Configuration (4 hours)
- [ ] Create scope options
- [ ] Build department filter
- [ ] Implement employee selector
- [ ] Add employee counter

### Phase 4: Metrics Selection (4 hours)
- [ ] Build metrics categories
- [ ] Create checkbox lists
- [ ] Add select all functionality
- [ ] Implement metric counter

### Phase 5: Report Generation (6 hours)
- [ ] Connect to API
- [ ] Implement progress tracking
- [ ] Handle generation states
- [ ] Add error handling

### Phase 6: Preview & Export (5 hours)
- [ ] Build preview component
- [ ] Add chart rendering
- [ ] Create table views
- [ ] Implement export formats

### Phase 7: Templates & History (4 hours)
- [ ] Build template system
- [ ] Add save functionality
- [ ] Create history list
- [ ] Implement scheduling

### Phase 8: Testing & Polish (4 hours)
- [ ] Write E2E tests
- [ ] Add loading states
- [ ] Optimize performance
- [ ] Polish UI

**Total Estimate: 34 hours**

## 11. Open Questions & Assumptions

### Questions
1. Should reports be cached for quick re-access?
2. Do we need report scheduling capabilities?
3. Should we add custom SQL query builder?
4. Can users share reports with external parties?
5. Do we need report versioning?

### Assumptions
1. Reports generated server-side
2. Maximum 365 days of data per report
3. PDF, Excel, and CSV formats supported
4. Reports expire after 7 days
5. No real-time data in reports

### Recommended UI Tweaks

1. **Add Report Templates Gallery** with pre-built reports
2. **Include Data Visualization** preview before generation
3. **Add Report Scheduling** for recurring reports
4. **Implement Comparison Reports** between periods
5. **Show Estimated Generation Time** based on data size
6. **Add Email Distribution** lists
7. **Include Report Annotations** for insights
8. **Add Dashboard Creation** from report data