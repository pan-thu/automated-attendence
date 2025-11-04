# Login Screen - Workflow Plan

## Screen Overview

**Purpose**: Authenticate users to access the AttenDesk mobile application

**Design Reference**: `docs/ui/client/high/login.png`

**Current Implementation**:
- File: `client/lib/features/auth/presentation/login_screen.dart`
- Controller: `client/lib/features/auth/controllers/login_controller.dart`
- Component: `client/lib/components/auth/LoginForm.tsx` (admin - reference only)

**Route**: `/login`

---

## Design Analysis

### Design Shows:
1. **Branding**
   - "AttenDesk" logo/text with clock icon at top
   - "Sign in to continue" subtitle
   - Clean, minimalist layout

2. **Form Elements**
   - Email input field
   - Password input field with visibility toggle
   - "Forgot password?" link (underlined, aligned right)
   - Primary "Sign in" button

3. **Visual Style**
   - White background
   - Centered content
   - Subtle shadows on input fields
   - Green primary button (matches brand)

### Current Implementation Gap:
- ✅ Has email/password inputs
- ✅ Has login controller with auth logic
- ❌ Missing "AttenDesk" branding
- ❌ Missing "Forgot password?" link/functionality
- ❌ Design doesn't match high-fidelity mockup
- ❌ Password visibility toggle might not be styled correctly

---

## Data Requirements

### Models
**Existing**: Auth handled by Firebase Auth (no custom models needed)

### API Endpoints
**Existing**:
- `client/lib/core/services/auth_repository.dart`
  - `signInWithEmailAndPassword(String email, String password)`
  - Already implemented

**New** (for forgot password):
- `sendPasswordResetEmail(String email)`
  - Firebase Auth built-in method
  - Need to add wrapper in `auth_repository.dart`

### State Management
**Controller**: `client/lib/features/auth/controllers/login_controller.dart`

**State to manage**:
- Email text
- Password text
- Password visibility (show/hide)
- Loading state (during login)
- Error messages
- Form validation errors

---

## UI Components Needed

### New Components
1. **App Logo Widget** (if not exists)
   - AttenDesk branding with icon
   - Reusable across onboarding/splash

2. **Password Reset Dialog/Bottom Sheet**
   - Email input
   - Send button
   - Success/error feedback

### Existing Components to Use
From `00-shared-components.md`:
- ✅ `AuthTextField` (already exists in `client/lib/features/widgets/auth_text_field.dart`)
- ✅ Primary Button (from design system)
- ✅ `FeedbackDialog` (for success/error messages)

### Component Updates Needed
- Update `AuthTextField` to match design system styling
- Add password visibility toggle icon

---

## Dependencies

### Must Exist Before Implementation:
1. ✅ Design system tokens (`00-design-system.md`)
2. ✅ Auth repository with login method (already exists)
3. ✅ Session controller (already exists)
4. ⚠️ Feedback dialog component (create if not exists)

### Can Implement Concurrently:
- Logo/branding assets
- Design system implementation

---

## Implementation Steps

### Step 1: Prepare Assets and Design System
1.1. Create or obtain "AttenDesk" logo asset
   - SVG or PNG format
   - Include clock icon if part of logo
   - Add to `client/assets/images/`

1.2. Ensure design system is implemented
   - Colors defined in `client/lib/design_system/colors.dart`
   - Typography defined in `client/lib/design_system/typography.dart`
   - Input field styles defined

### Step 2: Update Auth Repository (Add Forgot Password)
**File**: `client/lib/core/services/auth_repository.dart`

2.1. Add password reset method:
```dart
Future<void> sendPasswordResetEmail(String email) async {
  try {
    await _auth.sendPasswordResetEmail(email: email);
  } catch (e) {
    throw Exception('Failed to send password reset email: $e');
  }
}
```

### Step 3: Update Login Controller
**File**: `client/lib/features/auth/controllers/login_controller.dart`

3.1. Add password visibility state:
```dart
final passwordVisible = StateProvider<bool>((ref) => false);
```

3.2. Add forgot password handler:
```dart
Future<void> sendPasswordReset(String email) async {
  state = const AsyncValue.loading();
  state = await AsyncValue.guard(() async {
    await _authRepository.sendPasswordResetEmail(email);
  });
}
```

3.3. Ensure proper error handling and validation:
```dart
String? validateEmail(String? value) {
  if (value == null || value.isEmpty) {
    return 'Email is required';
  }
  if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value)) {
    return 'Enter a valid email';
  }
  return null;
}

String? validatePassword(String? value) {
  if (value == null || value.isEmpty) {
    return 'Password is required';
  }
  if (value.length < 6) {
    return 'Password must be at least 6 characters';
  }
  return null;
}
```

### Step 4: Create Logo Widget
**File**: `client/lib/features/widgets/app_logo.dart` (new)

4.1. Create reusable logo component:
```dart
class AppLogo extends StatelessWidget {
  final double size;

  const AppLogo({Key? key, this.size = 48.0}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children:  [
        // Logo image/icon
        Image.asset(
          'assets/images/logo.png',
          width: size,
          height: size,
        ),
        SizedBox(height: 8),
        // App name
        Text(
          'AttenDesk',
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }
}
```

### Step 5: Create Forgot Password Dialog
**File**: `client/lib/features/auth/widgets/forgot_password_dialog.dart` (new)

5.1. Create dialog/bottom sheet:
```dart
class ForgotPasswordDialog extends ConsumerStatefulWidget {
  const ForgotPasswordDialog({Key? key}) : super(key: key);

  @override
  ConsumerState<ForgotPasswordDialog> createState() => _ForgotPasswordDialogState();
}

class _ForgotPasswordDialogState extends ConsumerState<ForgotPasswordDialog> {
  final _emailController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _sendResetEmail() async {
    if (_formKey.currentState!.validate()) {
      try {
        final controller = ref.read(loginControllerProvider.notifier);
        await controller.sendPasswordReset(_emailController.text.trim());

        if (mounted) {
          Navigator.of(context).pop();
          FeedbackDialog.showSuccess(
            context,
            'Password Reset Email Sent',
            message: 'Check your email for reset instructions',
          );
        }
      } catch (e) {
        if (mounted) {
          FeedbackDialog.showError(
            context,
            'Failed to Send Email',
            message: e.toString(),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Reset Password',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              SizedBox(height: 8),
              Text(
                'Enter your email to receive reset instructions',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              SizedBox(height: 24),
              AuthTextField(
                controller: _emailController,
                label: 'Email',
                keyboardType: TextInputType.emailAddress,
                validator: (value) => /* validation */,
              ),
              SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: Text('Cancel'),
                  ),
                  SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: _sendResetEmail,
                    child: Text('Send'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

### Step 6: Redesign Login Screen
**File**: `client/lib/features/auth/presentation/login_screen.dart`

6.1. Update screen layout to match design:
```dart
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (_formKey.currentState!.validate()) {
      final controller = ref.read(loginControllerProvider.notifier);
      await controller.signIn(
        _emailController.text.trim(),
        _passwordController.text,
      );
    }
  }

  void _showForgotPasswordDialog() {
    showDialog(
      context: context,
      builder: (context) => const ForgotPasswordDialog(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final loginState = ref.watch(loginControllerProvider);
    final passwordVisible = ref.watch(passwordVisibleProvider);

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Logo
                  const AppLogo(size: 64),
                  const SizedBox(height: 16),

                  // Subtitle
                  Text(
                    'Sign in to continue',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: Colors.grey[600],
                    ),
                  ),
                  const SizedBox(height: 48),

                  // Email field
                  AuthTextField(
                    controller: _emailController,
                    label: 'Email',
                    keyboardType: TextInputType.emailAddress,
                    validator: (value) => /* validation */,
                  ),
                  const SizedBox(height: 16),

                  // Password field
                  AuthTextField(
                    controller: _passwordController,
                    label: 'Password',
                    obscureText: !passwordVisible,
                    validator: (value) => /* validation */,
                    suffixIcon: IconButton(
                      icon: Icon(
                        passwordVisible ? Icons.visibility_off : Icons.visibility,
                      ),
                      onPressed: () {
                        ref.read(passwordVisibleProvider.notifier).state = !passwordVisible;
                      },
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Forgot password link
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: _showForgotPasswordDialog,
                      child: const Text('Forgot password?'),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Sign in button
                  ElevatedButton(
                    onPressed: loginState.isLoading ? null : _handleLogin,
                    child: loginState.isLoading
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Text('Sign in'),
                  ),

                  // Error message (if any)
                  if (loginState.hasError) ...[
                    const SizedBox(height: 16),
                    Text(
                      loginState.error.toString(),
                      style: TextStyle(color: Colors.red),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
```

### Step 7: Update AuthTextField Component
**File**: `client/lib/features/widgets/auth_text_field.dart`

7.1. Ensure styling matches design system:
```dart
class AuthTextField extends StatelessWidget {
  final TextEditingController? controller;
  final String label;
  final String? hint;
  final bool obscureText;
  final TextInputType? keyboardType;
  final String? Function(String?)? validator;
  final Widget? suffixIcon;
  final bool autofocus;

  const AuthTextField({
    Key? key,
    this.controller,
    required this.label,
    this.hint,
    this.obscureText = false,
    this.keyboardType,
    this.validator,
    this.suffixIcon,
    this.autofocus = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      obscureText: obscureText,
      keyboardType: keyboardType,
      validator: validator,
      autofocus: autofocus,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        suffixIcon: suffixIcon,
        // Use design system styles
        filled: true,
        fillColor: Colors.grey[100],
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: Colors.grey[300]!),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: Colors.green, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: Colors.red),
        ),
      ),
    );
  }
}
```

### Step 8: Testing
8.1. Manual testing:
   - Enter valid credentials → Should navigate to home screen
   - Enter invalid credentials → Should show error message
   - Click "Forgot password?" → Should show reset dialog
   - Submit reset email → Should receive email (check spam folder)
   - Password visibility toggle → Should show/hide password

8.2. Accessibility testing:
   - Screen reader compatibility
   - Keyboard navigation
   - Minimum touch target sizes

8.3. Edge cases:
   - Empty email/password
   - Invalid email format
   - Network errors
   - Email not registered (Firebase Auth will send email anyway for security)

---

## Testing Scenarios

### Scenario 1: Successful Login
1. User enters valid email and password
2. User taps "Sign in"
3. Loading indicator shows
4. User is navigated to home screen
5. Session is persisted

### Scenario 2: Failed Login
1. User enters invalid credentials
2. User taps "Sign in"
3. Error message displays: "Invalid email or password"
4. Form remains filled (don't clear password)

### Scenario 3: Forgot Password Flow
1. User taps "Forgot password?"
2. Dialog shows with email input
3. User enters email and taps "Send"
4. Success message shows: "Password reset email sent"
5. Dialog closes
6. User receives email with reset link

### Scenario 4: Password Visibility Toggle
1. Password field shows dots by default
2. User taps eye icon
3. Password text becomes visible
4. User taps eye icon again
5. Password becomes hidden

### Scenario 5: Form Validation
1. User taps "Sign in" with empty fields
2. Validation errors show: "Email is required", "Password is required"
3. User enters invalid email format
4. Validation error shows: "Enter a valid email"

---

## Open Questions

- [x] Should we add "Sign up" option for new users? **No - admin creates accounts**
- [x] Should we add biometric login (fingerprint/face)? **Future enhancement**
- [x] What should happen if email for password reset doesn't exist? **Firebase sends email anyway (security best practice)**
- [ ] Should we add "Remember me" checkbox? **TBD - session persists by default**
- [ ] Should we add social login (Google, etc.)? **Future enhancement**

---

## Related Documents

- `00-design-system.md` - For styling specifications
- `00-shared-components.md` - For reusable components
- `00-navigation-architecture.md` - For post-login navigation

---

## Success Criteria

- ✅ Login screen matches high-fidelity design
- ✅ Users can log in with email/password
- ✅ Users can reset forgotten password
- ✅ Password visibility can be toggled
- ✅ Form validation works correctly
- ✅ Loading states display appropriately
- ✅ Error messages are clear and helpful
- ✅ Screen is accessible (screen reader, keyboard nav)
- ✅ Design system tokens are used consistently

---

## Estimated Effort

- **Design system setup**: 4 hours
- **Auth repository update**: 1 hour
- **Logo component**: 1 hour
- **Forgot password dialog**: 2 hours
- **Login screen redesign**: 4 hours
- **Testing**: 2 hours
- **Total**: ~14 hours (2 days)

---

## Next Steps

After login screen is complete:
1. Move to Home Dashboard implementation (see `02-home-dashboard.md`)
2. Ensure onboarding flow works if applicable
3. Test full auth flow (login → onboarding → home)
