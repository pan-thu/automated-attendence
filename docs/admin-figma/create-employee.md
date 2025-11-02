# Create Employee – Implementation Workflow

Last updated: 2025-11-01
Figma Link: https://www.figma.com/design/zFhrSTYRqCIwzl7vMDUJi5/AttenDesk?node-id=15-7016

## 1. Overview & Scope

### Purpose
The Create Employee modal provides a streamlined interface for adding new employees to the system with all required personal and employment information, including profile photo upload and role assignment.

### Key User Flows
- **Primary**: Open modal → Fill form → Upload photo → Submit
- **Secondary**: Validation errors → Correct → Resubmit
- **Tertiary**: Cancel → Confirm discard → Close

### Entry/Exit Points
- **Entry**: Employee list "Add Employee" button, Dashboard quick action
- **Exit**: Success (redirect to profile), Cancel (return to list)

### Dependencies
- Firebase Auth for user creation
- Cloud Storage for photo uploads
- Cloud Function `createEmployee`
- Form validation utilities

## 2. Component Inventory

| Component | Type | Figma Source | Implementation Path | Status |
|-----------|------|--------------|-------------------|---------|
| Modal Container | Dialog | Outer Frame | `components/ui/dialog.tsx` | Exists |
| Photo Upload | Upload | Avatar Section | `components/ui/file-upload.tsx` | New |
| Text Inputs | Form Fields | Input Fields | `components/ui/input.tsx` | Exists |
| Select Dropdowns | Select | Department/Gender | `components/ui/select.tsx` | Exists |
| Date Picker | Date Input | DOB Field | `components/ui/date-picker.tsx` | New |
| Password Field | Secure Input | Password Section | `components/ui/input.tsx` | Exists |
| Submit Button | Action | Create Employee | `components/ui/button.tsx` | Exists |

### Design Tokens
```scss
// Modal Specific
$modal-width: 600px;
$modal-padding: 32px;
$modal-backdrop: rgba(0, 0, 0, 0.5);
$modal-radius: 16px;

// Form Layout
$label-width: 140px;
$input-height: 48px;
$section-gap: 32px;
$field-gap: 24px;

// Avatar Upload
$avatar-size: 120px;
$avatar-border: 4px;
$upload-icon-size: 32px;
```

## 3. Layout & Responsiveness

### Modal Layout
```css
.create-employee-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(600px, 90vw);
  max-height: 90vh;
  overflow-y: auto;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
```

## 4. State & Data Model Mapping

### Form State
```typescript
interface CreateEmployeeForm {
  personal: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth?: Date;
    gender: 'male' | 'female' | 'other';
    address?: string;
    photo?: File;
  };
  employment: {
    employeeId: string;
    department: string;
    role: string;
    position: string;
    joinDate: Date;
  };
  authentication: {
    password: string;
    sendWelcomeEmail: boolean;
  };
  validation: {
    [field: string]: string | null;
  };
  ui: {
    isSubmitting: boolean;
    photoPreview?: string;
  };
}
```

## 5. API Contracts (Proposed)

### Create Employee Endpoint
```typescript
// POST /api/employees/create
interface CreateEmployeeRequest {
  personal: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth?: string;
    gender?: string;
    address?: string;
  };
  employment: {
    department: string;
    position: string;
    role: string;
    joinDate: string;
  };
  authentication: {
    password: string;
  };
  photoUrl?: string;
}

interface CreateEmployeeResponse {
  uid: string;
  employeeId: string;
  email: string;
  createdAt: Date;
}
```

### Photo Upload Flow
```typescript
// 1. Get upload URL
POST /api/storage/upload-url
Response: { uploadUrl: string, fileId: string }

// 2. Upload to Storage
PUT [uploadUrl]
Body: File (multipart)

// 3. Confirm upload
POST /api/storage/confirm
Body: { fileId: string }
Response: { publicUrl: string }
```

## 6. Interaction & Accessibility

### Form Interactions
```typescript
const formInteractions = {
  photoUpload: {
    click: 'Open file picker',
    drag: 'Accept dropped image',
    preview: 'Show selected image'
  },
  validation: {
    blur: 'Validate field',
    submit: 'Validate all fields'
  },
  password: {
    generate: 'Auto-generate secure password',
    toggle: 'Show/hide password'
  }
};
```

### Accessibility Features
```html
<form role="form" aria-label="Create new employee">
  <fieldset>
    <legend>Personal Information</legend>
    <label for="firstName">
      First Name
      <span aria-label="required">*</span>
    </label>
    <input
      id="firstName"
      aria-required="true"
      aria-invalid={!!errors.firstName}
      aria-describedby="firstName-error"
    />
  </fieldset>
</form>
```

## 7. Validation Rules & Edge Cases

### Field Validation
```typescript
const validationRules = {
  firstName: {
    required: true,
    pattern: /^[a-zA-Z\s'-]{2,50}$/,
    message: 'Valid first name required'
  },
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    unique: true,
    message: 'Valid unique email required'
  },
  phone: {
    required: true,
    pattern: /^\+?[\d\s()-]{10,20}$/,
    message: 'Valid phone number required'
  },
  password: {
    required: true,
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    message: 'Min 8 chars with upper, lower, and number'
  },
  employeeId: {
    required: true,
    unique: true,
    autoGenerate: true
  }
};
```

### Edge Cases
- Duplicate email/employee ID
- Photo upload failures
- Network timeout during submission
- Invalid file types for photo
- Concurrent creation attempts

## 8. Styling & Theming

### Modal Styles
```scss
.create-employee-modal {
  background: white;
  border-radius: var(--modal-radius);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);

  .modal-header {
    padding: 24px 32px;
    border-bottom: 1px solid var(--border-light);

    h2 {
      font-size: 24px;
      font-weight: 600;
    }
  }

  .modal-body {
    padding: 32px;
  }

  .modal-footer {
    padding: 24px 32px;
    border-top: 1px solid var(--border-light);
    display: flex;
    justify-content: flex-end;
    gap: 16px;
  }
}

.avatar-upload {
  width: var(--avatar-size);
  height: var(--avatar-size);
  border-radius: 50%;
  border: 2px dashed var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--primary);
    background: var(--primary-light);
  }

  &.has-image {
    border-style: solid;
  }
}
```

## 9. Testing Plan (Playwright MCP)

### Form Tests
```typescript
test.describe('Create Employee Modal', () => {
  test('should validate required fields', async ({ page }) => {
    await page.goto('/employees');
    await page.getByTestId('add-employee-btn').click();
    await page.getByTestId('submit-btn').click();

    await expect(page.getByTestId('firstName-error')).toBeVisible();
    await expect(page.getByTestId('email-error')).toBeVisible();
  });

  test('should upload photo', async ({ page }) => {
    await page.goto('/employees');
    await page.getByTestId('add-employee-btn').click();

    const fileInput = page.getByTestId('photo-upload');
    await fileInput.setInputFiles('test-photo.jpg');

    await expect(page.getByTestId('photo-preview')).toBeVisible();
  });

  test('should create employee successfully', async ({ page }) => {
    await page.goto('/employees');
    await page.getByTestId('add-employee-btn').click();

    await page.getByTestId('firstName').fill('John');
    await page.getByTestId('lastName').fill('Doe');
    await page.getByTestId('email').fill('john.doe@test.com');
    await page.getByTestId('phone').fill('+1234567890');
    await page.getByTestId('department').selectOption('Engineering');
    await page.getByTestId('password').fill('Test@1234');

    await page.getByTestId('submit-btn').click();
    await page.waitForURL(/\/employees\/\w+/);
  });
});
```

## 10. Implementation Steps & Estimates

### Phase 1: Modal Setup (2 hours)
- [ ] Create modal component structure
- [ ] Implement open/close logic
- [ ] Add backdrop and animations

### Phase 2: Form Fields (4 hours)
- [ ] Build form with React Hook Form
- [ ] Add all input fields
- [ ] Implement field validation
- [ ] Add error display

### Phase 3: Photo Upload (3 hours)
- [ ] Create upload component
- [ ] Add drag-and-drop support
- [ ] Implement preview functionality
- [ ] Handle file validation

### Phase 4: API Integration (3 hours)
- [ ] Connect to createEmployee function
- [ ] Handle photo upload flow
- [ ] Add loading states
- [ ] Implement error handling

### Phase 5: Testing (2 hours)
- [ ] Write unit tests
- [ ] Create E2E tests
- [ ] Test edge cases

**Total Estimate: 14 hours**

## 11. Open Questions & Assumptions

### Questions
1. Should employee ID be auto-generated or manual?
2. Is email verification required before activation?
3. Should we support bulk employee import?
4. What's the photo size/format restrictions?

### Assumptions
1. Employee ID auto-generated with prefix
2. Welcome email sent automatically
3. Single employee creation only
4. Photo: Max 5MB, JPG/PNG only

### Recommended UI Tweaks
1. **Add Progress Indicator** for multi-step form
2. **Include Department Creation** inline option
3. **Add Password Strength Meter**
4. **Show Live Email Availability Check**
5. **Add Role Permission Preview**
6. **Include Salary/Compensation Fields** (Phase 2)