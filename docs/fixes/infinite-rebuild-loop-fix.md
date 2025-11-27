# Fix: Infinite Rebuild Loop on Onboarding Screen

**Date**: 2025-11-06
**Severity**: Critical
**Status**: ✅ Resolved

## Problem

After successfully logging in, the onboarding/permissions screen became completely unresponsive. No buttons could be pressed, and the UI appeared frozen despite being rendered correctly.

### Symptoms

1. **UI appears frozen** - No touch events register on any buttons (permission buttons, "Finish Setup", "Skip for now")
2. **No visual feedback** - No ripple effects or button state changes when tapping
3. **Screen constantly rebuilding** - Debug logs showed hundreds of repeated initialization cycles
4. **App performance degradation** - Device became sluggish due to infinite loop
5. **Eventually crashes** - "Lost connection to device" after continuous rebuilds

### Debug Output Pattern

```
I/flutter ( 6473): === OnboardingScreen initState ===
I/flutter ( 6473): === OnboardingScreen build ===
I/flutter ( 6473): === Calling loadStatus ===
I/flutter ( 6473): === OnboardingScreen initState ===  // ← Widget completely recreated!
I/flutter ( 6473): === OnboardingScreen build ===
I/flutter ( 6473): === Calling loadStatus ===
... (repeating hundreds of times)
```

### Secondary Issue

When location permission button was pressed (during brief working moments), the app crashed with:
```
No location permissions are defined in the manifest. Make sure at least
ACCESS_FINE_LOCATION or ACCESS_COARSE_LOCATION are defined in the manifest.
```

## Root Cause

### Primary Issue: Infinite Rebuild Loop

The onboarding screen was stuck in an infinite initialization loop caused by improper state management in conjunction with GoRouter's `refreshListenable`.

**The problematic flow:**

1. `OnboardingController` is added to router's `refreshListenable` (`app_router.dart:49-52`)
2. When `OnboardingScreen` initializes, `initState()` calls `loadStatus()`
3. `loadStatus()` unconditionally calls `notifyListeners()` (`onboarding_controller.dart:37`)
4. This triggers GoRouter to re-evaluate navigation rules
5. GoRouter recreates the `OnboardingScreen` (since the route is the same but the listenable changed)
6. New instance's `initState()` is called → **Back to step 2**

**Why the router recreates the screen:**

In `app_router.dart:47-52`:
```dart
router = GoRouter(
  refreshListenable: Listenable.merge([
    _sessionController,
    _onboardingController,  // ← Listens to every state change
  ]),
```

Any `notifyListeners()` call from `OnboardingController` triggers the router to rebuild, which recreates all route widgets.

### Secondary Issue: Missing Android Permissions

The `AndroidManifest.xml` was missing required location permissions for the geolocator package, causing runtime errors when attempting to request location access.

## Solution

### 1. Prevent Unnecessary `notifyListeners()` Calls

**File**: `lib/features/onboarding/controllers/onboarding_controller.dart`

**Before** (lines 32-37):
```dart
Future<void> loadStatus() async {
  final prefs = await SharedPreferences.getInstance();
  _locationGranted = prefs.getBool(_locationGrantedKey) ?? false;
  _notificationsGranted = prefs.getBool(_notificationsGrantedKey) ?? false;
  _isCompleted = prefs.getBool(_completedKey) ?? false;
  notifyListeners();  // ← Called unconditionally, triggers rebuild loop
}
```

**After** (lines 32-52):
```dart
Future<void> loadStatus() async {
  final prefs = await SharedPreferences.getInstance();
  final locationGranted = prefs.getBool(_locationGrantedKey) ?? false;
  final notificationsGranted = prefs.getBool(_notificationsGrantedKey) ?? false;
  final isCompleted = prefs.getBool(_completedKey) ?? false;

  // Only notify if values actually changed to prevent rebuild loops
  if (_locationGranted != locationGranted ||
      _notificationsGranted != notificationsGranted ||
      _isCompleted != isCompleted) {
    _locationGranted = locationGranted;
    _notificationsGranted = notificationsGranted;
    _isCompleted = isCompleted;
    notifyListeners();  // ← Only called when state actually changes
  } else {
    // Still update internal state without triggering listeners
    _locationGranted = locationGranted;
    _notificationsGranted = notificationsGranted;
    _isCompleted = isCompleted;
  }
}
```

**Key Changes:**
- Store values in temporary variables first
- Compare with current state before updating
- Only call `notifyListeners()` if values actually changed
- Update internal state even when not notifying (for consistency)

### 2. Add Required Location Permissions

**File**: `android/app/src/main/AndroidManifest.xml`

**Before** (line 1):
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application
```

**After** (lines 1-8):
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Location permissions for attendance tracking -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

    <!-- Internet permission for Firebase -->
    <uses-permission android:name="android.permission.INTERNET"/>

    <application
```

## Prevention Guidelines

### 1. State Management with GoRouter

When using controllers in GoRouter's `refreshListenable`:

✅ **DO:**
- Only call `notifyListeners()` when state meaningfully changes
- Compare old vs new values before notifying
- Consider using `ChangeNotifier`'s built-in value comparison patterns
- Document why a controller is in `refreshListenable`

❌ **DON'T:**
- Unconditionally call `notifyListeners()` in frequently called methods
- Add controllers to `refreshListenable` without careful consideration
- Call `notifyListeners()` during initialization/loading

### 2. Debugging Infinite Loops

**Early detection signs:**
- UI becomes unresponsive
- Fan/CPU usage spikes
- "Skipped X frames" warnings in logs
- Repeated initialization logs

**Diagnostic approach:**
1. Add debug prints to `initState()` and `build()`
2. Look for repeated initialization patterns
3. Check if widgets are being disposed and recreated
4. Examine `refreshListenable` configurations
5. Use Flutter DevTools to inspect widget rebuilds

### 3. Permission Declaration Checklist

When using platform-specific features, always:

✅ Declare permissions in `AndroidManifest.xml`
✅ Declare permissions in `Info.plist` (iOS)
✅ Handle permission denial gracefully
✅ Test on both platforms
✅ Update permission documentation

## Related Files

- `lib/features/onboarding/controllers/onboarding_controller.dart` (Primary fix)
- `android/app/src/main/AndroidManifest.xml` (Permissions)
- `lib/core/navigation/app_router.dart` (Router configuration)
- `lib/features/onboarding/presentation/onboarding_screen.dart` (UI)

## Testing

**To verify the fix:**

1. Run the app: `flutter run --dart-define=USE_EMULATORS=true`
2. Log in successfully
3. Observe onboarding screen loads once (not continuously)
4. Tap "Grant Access" button → Should show Android permission dialog
5. Tap "Enable Notifications" → Should show notification permission dialog
6. Tap "Skip for now" → Should navigate to home screen
7. All buttons should respond to touch with visual feedback

**Expected behavior:**
- Screen initializes exactly once
- All buttons are tappable
- No repeated initialization in logs
- Smooth navigation after button presses

## Lessons Learned

1. **`refreshListenable` is powerful but dangerous** - Use it sparingly and only for state that truly requires navigation changes
2. **Always compare before notifying** - Implement value equality checks before calling `notifyListeners()`
3. **Debug logging is essential** - Adding strategic debug prints quickly revealed the infinite loop
4. **Platform permissions are easy to forget** - Maintain a permissions checklist for new features
5. **Symptoms can be misleading** - "Unresponsive buttons" actually indicated a rebuild loop, not a touch event issue

## Future Improvements

Consider these architectural improvements:

1. **Extract navigation state from business logic** - Separate `OnboardingController` state from navigation requirements
2. **Use dedicated navigation state** - Create a lightweight controller specifically for router refresh logic
3. **Implement state comparison helpers** - Create utility methods for comparing complex state objects
4. **Add rebuild monitoring** - Implement automated alerts when widgets rebuild excessively
5. **Permission manager service** - Centralize platform permission handling

## References

- [GoRouter Documentation - refreshListenable](https://pub.dev/documentation/go_router/latest/go_router/GoRouter/refreshListenable.html)
- [ChangeNotifier Best Practices](https://api.flutter.dev/flutter/foundation/ChangeNotifier-class.html)
- [Android Permissions Guide](https://developer.android.com/training/permissions/declaring)
- [Flutter Performance Best Practices](https://docs.flutter.dev/perf/best-practices)
