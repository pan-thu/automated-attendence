# Login – Implementation Workflow

Last updated: 2025-11-01
Figma Link: https://www.figma.com/design/zFhrSTYRqCIwzl7vMDUJi5/AttenDesk?node-id=15-4

## 1. Overview & Scope

### Purpose
The Login page provides secure authentication for admin users to access the attendance management system dashboard. It serves as the entry point to the admin interface.

### Key User Flows
- **Primary Flow**: Email/password authentication → Dashboard redirect
- **Secondary Flow**: Forgot password → Password reset flow
- **Error Flow**: Invalid credentials → Error display → Retry

### Entry/Exit Points
- **Entry**: Direct URL access (`/login`), automatic redirect when unauthenticated
- **Exit**: Successful login → Dashboard (`/`), Forgot password → Reset flow

### Dependencies
- Firebase Authentication service
- Auth Provider context (`admin/src/providers/auth-provider.tsx`)
- Protected route wrapper
- Error handling utilities

## 2. Component Inventory

| Component | Type | Figma Source | Implementation Path | Status |
|-----------|------|--------------|-------------------|---------|
| Login Container | Layout | Frame 15:7 | `components/auth/LoginForm.tsx` | Exists - Needs Update |
| Logo Badge | Icon | Frame 15:11 | New component needed | New |
| Email Input | Form Field | Frame 15:41 | `components/ui/input.tsx` | Exists |
| Password Input | Form Field | Frame 15:45 | `components/ui/input.tsx` | Exists |
| Sign In Button | Button | Frame 15:23 | `components/ui/button.tsx` | Exists |
| SSL Badge | Info | Frame 15:25 | New component | New |
| Eye Icon | Icon | Frame 15:63 | Icon library | New |

### Design Tokens
```scss
// Colors
$primary-dark: #111827; // Gray-900
$primary-text: #374151; // Gray-700
$secondary-text: #9CA3AF; // Gray-400
$input-placeholder: #ADAEBC;
$border-color: #E5E7EB; // Gray-200
$background-overlay: rgba(255, 255, 255, 0.8);

// Typography
$font-family: 'Inter', sans-serif;
$heading-size: 32px;
$body-size: 16px;
$small-size: 14px;
$micro-size: 12px;

// Spacing
$container-width: 448px;
$padding-lg: 32px;
$padding-md: 16px;
$radius-lg: 24px;
$radius-md: 16px;
```

## 3. Layout & Responsiveness

### Grid System
- **Desktop**: Centered 448px card with 32px viewport padding
- **Tablet**: Full width with 24px padding
- **Mobile**: Full screen with 16px padding

### Breakpoints
```typescript
const breakpoints = {
  mobile: '0-639px',
  tablet: '640px-1023px',
  desktop: '1024px+'
}
```

### Container Structure
```
└── Full Screen Container (bg-white)
    └── Centered Card (448px max-width)
        ├── Header Section (Logo + Title)
        ├── Form Section
        │   ├── Email Field
        │   ├── Password Field
        │   └── Submit Button
        └── Footer (SSL Badge + Forgot Password)
```

## 4. State & Data Model Mapping

### Component State
```typescript
interface LoginState {
  formData: {
    email: string;
    password: string;
  };
  validation: {
    email: string | null;
    password: string | null;
  };
  ui: {
    isLoading: boolean;
    showPassword: boolean;
    errorMessage: string | null;
  };
}
```

### Firebase Auth Integration
```typescript
interface AuthCredentials {
  email: string;
  password: string;
}

interface AuthResponse {
  user: {
    uid: string;
    email: string;
    role: 'admin' | 'employee';
  };
  token: string;
}
```

## 5. API Contracts (Proposed)

### Authentication Endpoint
```typescript
// Using Firebase Auth SDK
signInWithEmailAndPassword(auth, email, password)

// Custom token validation
POST /api/auth/validate-admin
Request: {
  idToken: string;
}
Response: {
  isValid: boolean;
  role: string;
  claims: CustomClaims;
}
```

### Error Responses
```typescript
enum AuthErrorCode {
  INVALID_CREDENTIALS = 'auth/invalid-credentials',
  USER_DISABLED = 'auth/user-disabled',
  NOT_ADMIN = 'auth/not-admin-user',
  NETWORK_ERROR = 'auth/network-request-failed'
}
```

## 6. Interaction & Accessibility

### Keyboard Navigation
- Tab order: Email → Password → Show Password → Sign In → Forgot Password
- Enter key submits form from any field
- Escape key clears error messages

### ARIA Labels
```html
<form role="form" aria-label="Admin login form">
  <input
    type="email"
    aria-label="Email address"
    aria-required="true"
    aria-invalid={!!errors.email}
    aria-describedby="email-error"
  />
  <button
    type="submit"
    aria-busy={isLoading}
    aria-label="Sign in to your account"
  />
</form>
```

### Visual States
- **Default**: Gray borders, white background
- **Focus**: Blue outline, elevated shadow
- **Error**: Red border, error message below
- **Loading**: Button spinner, disabled inputs
- **Success**: Brief checkmark before redirect

## 7. Validation Rules & Edge Cases

### Field Validation
```typescript
const validationRules = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address'
  },
  password: {
    required: true,
    minLength: 8,
    message: 'Password must be at least 8 characters'
  }
}
```

### Security Considerations
- Rate limiting: Max 5 attempts per 15 minutes (implemented in `rateLimiter.ts`)
- Password visibility toggle with secure handling
- CSRF token validation
- SSL/TLS enforcement
- Custom claim verification for admin role

### Edge Cases
- Network timeout (30s timeout, retry mechanism)
- Account disabled (show specific message)
- Non-admin user attempt (redirect to employee app)
- Session already exists (auto-redirect to dashboard)

## 8. Styling & Theming

### CSS Variables Mapping
```css
:root {
  --color-primary: #111827;
  --color-background: #ffffff;
  --color-surface: rgba(255, 255, 255, 0.8);
  --color-border: #e5e7eb;
  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
  --color-text-placeholder: #adaebc;

  --radius-sm: 8px;
  --radius-md: 16px;
  --radius-lg: 24px;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-lg: 0 10px 40px rgba(0, 0, 0, 0.1);
}
```

### Dark Mode Considerations
- Not required for initial implementation
- Future: Invert color scheme, adjust shadows

## 9. Testing Plan (Playwright MCP)

### Smoke Tests
```typescript
// tests/login.smoke.spec.ts
test.describe('Login Page Smoke Tests', () => {
  test('should load login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('login-form')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('email-input').fill('admin@test.com');
    await page.getByTestId('password-input').fill('Test@1234');
    await page.getByTestId('submit-button').click();
    await page.waitForURL('/dashboard');
  });
});
```

### Visual Regression Tests
```typescript
test('login page visual regression', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveScreenshot('login-default.png');

  // Focus state
  await page.getByTestId('email-input').focus();
  await expect(page).toHaveScreenshot('login-email-focus.png');

  // Error state
  await page.getByTestId('submit-button').click();
  await expect(page).toHaveScreenshot('login-validation-error.png');
});
```

### Accessibility Tests
```typescript
test('login page accessibility', async ({ page }) => {
  await page.goto('/login');
  const results = await page.evaluate(() => axe.run());
  expect(results.violations).toHaveLength(0);
});
```

### Test Selectors
```typescript
const selectors = {
  form: '[data-testid="login-form"]',
  emailInput: '[data-testid="email-input"]',
  passwordInput: '[data-testid="password-input"]',
  passwordToggle: '[data-testid="password-toggle"]',
  submitButton: '[data-testid="submit-button"]',
  forgotPassword: '[data-testid="forgot-password-link"]',
  errorMessage: '[data-testid="error-message"]',
  sslBadge: '[data-testid="ssl-badge"]'
};
```

## 10. Implementation Steps & Estimates

### Phase 1: Setup & Structure (2 hours)
- [ ] Create new login page layout matching Figma design
- [ ] Set up responsive container with glassmorphism effect
- [ ] Add AttenDesk branding and logo component

### Phase 2: Form Implementation (3 hours)
- [ ] Build controlled form with React Hook Form
- [ ] Implement email and password fields with icons
- [ ] Add password visibility toggle
- [ ] Style inputs to match Figma exactly

### Phase 3: Authentication Logic (4 hours)
- [ ] Integrate Firebase Authentication
- [ ] Add admin role validation
- [ ] Implement error handling and display
- [ ] Add loading states and transitions

### Phase 4: Security & Polish (2 hours)
- [ ] Add rate limiting check
- [ ] Implement SSL badge component
- [ ] Add forgot password link (placeholder)
- [ ] Test and refine animations

### Phase 5: Testing (3 hours)
- [ ] Write unit tests for validation
- [ ] Create Playwright E2E tests
- [ ] Visual regression test setup
- [ ] Accessibility audit and fixes

**Total Estimate: 14 hours**

## 11. Open Questions & Assumptions

### Questions
1. Should we implement "Remember Me" functionality?
2. Is biometric authentication (fingerprint/face) planned?
3. Should we add OAuth providers (Google/Microsoft)?
4. What's the forgot password flow specifics?

### Assumptions
1. Admin users only (no employee login on this interface)
2. Email is the primary identifier (no username option)
3. English language only initially
4. Desktop-first but mobile responsive
5. No SSO integration in Phase 1

### Recommended UI Tweaks
1. **Add loading spinner** inside the Sign In button for better UX
2. **Include password strength indicator** for security awareness
3. **Add "Remember Me" checkbox** for convenience
4. **Show last login time** after successful authentication
5. **Add captcha after 3 failed attempts** for bot protection

### Architecture Alignment Notes
- Reuse existing `useAuth` hook from `admin/src/hooks/useAuth.ts`
- Leverage `auth-provider.tsx` for session management
- Use existing error handling utilities
- Apply rate limiting from newly implemented `rateLimiter.ts`