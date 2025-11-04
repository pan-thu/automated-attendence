# Home/Dashboard Screen - Workflow Plan

## Screen Overview

**Purpose**: Main dashboard for clock-in/out functionality and daily attendance status

**Design Reference**: `docs/ui/client/high/home.png`

**Current Implementation**:
- File: `client/lib/features/home/presentation/home_screen.dart`
- Widget: `client/lib/features/home/widgets/dashboard_view.dart`
- Controllers:
  - `client/lib/features/home/controllers/dashboard_controller.dart`
  - `client/lib/features/home/controllers/clock_in_controller.dart`

**Route**: `/` (Home tab - index 0 in bottom navigation)

---

## Design Analysis

### Design Shows:
1. **Time Display**
   - Large digital clock showing current time (e.g., "09:30")
   - Current check indicator at top ("Check 1")

2. **Primary Action**
   - Large circular green button with hand icon
   - "Clock In" label
   - Prominent, centered placement

3. **Location Information**
   - Distance from office: "You are 1 meter away from office"
   - Location name: "Vashi - Navi Mumbai"
   - Visual indicator (icon or text)

4. **Check Status Tracker**
   - Horizontal list showing Check 1, Check 2, Check 3
   - Times displayed for completed checks (e.g., "09:30")
   - Placeholder "--:--" for pending checks
   - Current check highlighted

5. **Bottom Navigation**
   - Fixed at bottom
   - Home tab active (green indicator)

### Current Implementation Gap:
- ✅ Has dashboard controller with data
- ✅ Has clock-in controller with logic
- ❌ Design doesn't match high-fidelity mockup
- ❌ Missing large time display
- ❌ Missing check indicator at top
- ❌ Missing location proximity indicator
- ❌ Missing check status tracker
- ❌ Clock-in button not styled as circular green button
- ❌ Not integrated with bottom navigation

---

## Data Requirements

### Models
**Existing** (`client/lib/core/services/dashboard_repository.dart`):
- `DashboardSummary` - Main container
- `AttendanceSummary` - Today's attendance
- `CheckSummary` - Individual check details
- `CompanySettingsSummary` - Geofence and time windows

**Fields Used**:
```dart
class DashboardSummary {
  final AttendanceSummary? attendanceSummary;
  final CompanySettingsSummary companySettings;
  // ... other fields
}

class AttendanceSummary {
  final List<CheckSummary> checks;
  final String status;  // 'absent', 'present', 'late', etc.
}

class CheckSummary {
  final int slot;  // 1, 2, 3
  final String? status;  // 'on_time', 'late', 'missed'
  final String? timestamp;  // ISO 8601 string
}

class CompanySettingsSummary {
  final String companyName;
  final Map<String, dynamic> geofence;  // { lat, lng, radius }
  final String timezone;
}
```

### API Endpoints
**Existing** (`client/lib/core/services/dashboard_repository.dart`):
- `getDashboardSummary()` - Fetches dashboard data

**Existing** (`client/lib/core/services/clock_in_repository.dart`):
- `clockIn(double lat, double lng)` - Performs clock-in

**Location Services**:
- Need to get current user location (lat, lng)
- Calculate distance from office geofence
- Determine if user is within geofence radius

### State Management
**Controllers**:
- `DashboardController` - Manages dashboard state
- `ClockInController` - Manages clock-in flow

**State**:
- Dashboard summary data
- Current time (updates every second)
- User location (periodic updates)
- Distance from office
- Clock-in loading state
- Clock-in result

---

## UI Components Needed

### New Components (from `00-shared-components.md`)
1. **TimeDisplay** - Large time widget (09:30)
2. **LocationProximityIndicator** - Distance and location display
3. **CheckStatusTracker** - Horizontal check status list
4. **FeedbackDialog** - Success/error feedback (for clock-in result)

### Component Specifications

#### 1. TimeDisplay Widget
**File**: `client/lib/features/widgets/time_display.dart`
```dart
class TimeDisplay extends StatefulWidget {
  const TimeDisplay({Key? key}) : super(key: key);

  @override
  State<TimeDisplay> createState() => _TimeDisplayState();
}

class _TimeDisplayState extends State<TimeDisplay> {
  late Timer _timer;
  DateTime _currentTime = DateTime.now();

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        _currentTime = DateTime.now();
      });
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Text(
      DateFormat('HH:mm').format(_currentTime),
      style: TextStyle(
        fontSize: 48,
        fontWeight: FontWeight.bold,
      ),
    );
  }
}
```

#### 2. LocationProximityIndicator
**File**: `client/lib/features/widgets/location_proximity.dart`
```dart
class LocationProximityIndicator extends StatelessWidget {
  final double distanceInMeters;
  final String locationName;
  final bool isWithinGeofence;

  const LocationProximityIndicator({
    Key? key,
    required this.distanceInMeters,
    required this.locationName,
    required this.isWithinGeofence,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    String distanceText;
    if (distanceInMeters < 1000) {
      distanceText = '${distanceInMeters.toInt()} meter${distanceInMeters != 1 ? 's' : ''}';
    } else {
      distanceText = '${(distanceInMeters / 1000).toStringAsFixed(1)} km';
    }

    return Column(
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isWithinGeofence ? Icons.check_circle : Icons.location_on,
              color: isWithinGeofence ? Colors.green : Colors.grey,
            ),
            SizedBox(width: 8),
            Text(
              'You are $distanceText away from office',
              style: TextStyle(
                color: isWithinGeofence ? Colors.green : Colors.grey[700],
              ),
            ),
          ],
        ),
        SizedBox(height: 4),
        Text(
          locationName,
          style: TextStyle(color: Colors.grey[600]),
        ),
      ],
    );
  }
}
```

#### 3. CheckStatusTracker
**File**: `client/lib/features/widgets/check_status_tracker.dart`
```dart
class CheckStatusTracker extends StatelessWidget {
  final List<CheckSummary> checks;
  final int maxChecks;

  const CheckStatusTracker({
    Key? key,
    required this.checks,
    this.maxChecks = 3,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: List.generate(maxChecks, (index) {
        final slot = index + 1;
        final check = checks.firstWhereOrNull((c) => c.slot == slot);

        return _CheckItem(
          slot: slot,
          check: check,
          isCurrent: check == null && (index == 0 || checks.any((c) => c.slot == index)),
        );
      }),
    );
  }
}

class _CheckItem extends StatelessWidget {
  final int slot;
  final CheckSummary? check;
  final bool isCurrent;

  const _CheckItem({
    required this.slot,
    this.check,
    this.isCurrent = false,
  });

  @override
  Widget build(BuildContext context) {
    final timeStr = check?.timestamp != null
        ? DateFormat('HH:mm').format(DateTime.parse(check!.timestamp!))
        : '--:--';

    final isLate = check?.status == 'late';

    return Column(
      children: [
        Text(
          'Check $slot',
          style: TextStyle(
            fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
            color: isCurrent ? Colors.green : Colors.grey,
          ),
        ),
        SizedBox(height: 4),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              timeStr,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: isLate ? Colors.orange : Colors.black,
              ),
            ),
            if (isLate) ...[
              SizedBox(width: 4),
              Icon(Icons.warning, size: 16, color: Colors.orange),
            ],
          ],
        ),
      ],
    );
  }
}
```

---

## Implementation Steps

### Step 1: Create Required Components
1.1. Create `TimeDisplay` widget
1.2. Create `LocationProximityIndicator` widget
1.3. Create `CheckStatusTracker` widget
1.4. Create `FeedbackDialog` component (if not exists - see `09-success-toast.md`)

### Step 2: Add Location Services
**File**: `client/lib/core/services/location_service.dart` (new)

2.1. Add location permission dependencies to `pubspec.yaml`:
```yaml
dependencies:
  geolocator: ^10.0.0
  permission_handler: ^11.0.0
```

2.2. Create location service:
```dart
class LocationService {
  Future<Position?> getCurrentLocation() async {
    // Check permissions
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return null;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      return null;
    }

    // Get location
    return await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    );
  }

  double calculateDistance(double lat1, double lng1, double lat2, double lng2) {
    return Geolocator.distanceBetween(lat1, lng1, lat2, lng2);
  }

  bool isWithinGeofence(double lat, double lng, Map<String, dynamic> geofence) {
    final distance = calculateDistance(
      lat,
      lng,
      geofence['lat'],
      geofence['lng'],
    );
    return distance <= geofence['radius'];
  }
}
```

### Step 3: Update Dashboard Controller
**File**: `client/lib/features/home/controllers/dashboard_controller.dart`

3.1. Add location state:
```dart
class DashboardController extends StateNotifier<AsyncValue<DashboardState>> {
  final DashboardRepository _repository;
  final LocationService _locationService;

  // ... existing code

  Future<void> updateLocation() async {
    final position = await _locationService.getCurrentLocation();
    if (position != null) {
      state = state.whenData((data) {
        final geofence = data.dashboardSummary.companySettings.geofence;
        final distance = _locationService.calculateDistance(
          position.latitude,
          position.longitude,
          geofence['lat'],
          geofence['lng'],
        );
        final isWithinGeofence = distance <= geofence['radius'];

        return data.copyWith(
          userLocation: position,
          distanceFromOffice: distance,
          isWithinGeofence: isWithinGeofence,
        );
      });
    }
  }
}

class DashboardState {
  final DashboardSummary dashboardSummary;
  final Position? userLocation;
  final double? distanceFromOffice;
  final bool isWithinGeofence;

  // ... constructor, copyWith, etc.
}
```

### Step 4: Update Clock-In Controller
**File**: `client/lib/features/home/controllers/clock_in_controller.dart`

4.1. Ensure proper error handling and success feedback:
```dart
Future<void> clockIn(BuildContext context) async {
  state = const AsyncValue.loading();

  // Get location
  final position = await _locationService.getCurrentLocation();
  if (position == null) {
    state = AsyncValue.error('Location permission denied', StackTrace.current);
    return;
  }

  // Perform clock-in
  state = await AsyncValue.guard(() async {
    final result = await _clockInRepository.clockIn(
      position.latitude,
      position.longitude,
    );

    // Show success dialog
    if (context.mounted) {
      final timeStr = DateFormat('HH:mm a').format(DateTime.now());
      FeedbackDialog.showSuccess(
        context,
        result.isOnTime ? 'You Are On Time!' : 'Clocked In',
        message: 'Clock in time: $timeStr',
      );
    }

    // Refresh dashboard
    ref.read(dashboardControllerProvider.notifier).loadDashboard();

    return result;
  });
}
```

### Step 5: Redesign Home Screen
**File**: `client/lib/features/home/widgets/dashboard_view.dart`

5.1. Update layout to match design:
```dart
class DashboardView extends ConsumerWidget {
  const DashboardView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardState = ref.watch(dashboardControllerProvider);
    final clockInState = ref.watch(clockInControllerProvider);

    return dashboardState.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => Center(child: Text('Error: $error')),
      data: (data) {
        final attendanceSummary = data.dashboardSummary.attendanceSummary;
        final checks = attendanceSummary?.checks ?? [];
        final currentCheck = _getCurrentCheck(checks);

        return RefreshIndicator(
          onRefresh: () async {
            await ref.read(dashboardControllerProvider.notifier).loadDashboard();
            await ref.read(dashboardControllerProvider.notifier).updateLocation();
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Current check indicator
                if (currentCheck != null) ...[
                  Text(
                    'Check $currentCheck',
                    style: TextStyle(
                      fontSize: 16,
                      color: Colors.grey[600],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Large time display
                const TimeDisplay(),
                const SizedBox(height: 48),

                // Clock-in button
                Material(
                  elevation: 4,
                  shape: const CircleBorder(),
                  color: Colors.green,
                  child: InkWell(
                    onTap: clockInState.isLoading
                        ? null
                        : () => ref.read(clockInControllerProvider.notifier).clockIn(context),
                    customBorder: const CircleBorder(),
                    child: Container(
                      width: 120,
                      height: 120,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.touch_app,
                            size: 48,
                            color: Colors.white,
                          ),
                          SizedBox(height: 8),
                          Text(
                            'Clock In',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 48),

                // Location proximity
                if (data.distanceFromOffice != null) ...[
                  LocationProximityIndicator(
                    distanceInMeters: data.distanceFromOffice!,
                    locationName: data.dashboardSummary.companySettings.companyName,
                    isWithinGeofence: data.isWithinGeofence,
                  ),
                  const SizedBox(height: 32),
                ],

                // Check status tracker
                CheckStatusTracker(
                  checks: checks,
                  maxChecks: 3,
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  int? _getCurrentCheck(List<CheckSummary> checks) {
    if (checks.isEmpty) return 1;
    if (checks.length < 3) return checks.length + 1;
    return null;  // All checks complete
  }
}
```

### Step 6: Integrate with Bottom Navigation
**File**: `client/lib/features/home/presentation/home_screen.dart`

6.1. Update to work within bottom nav context:
```dart
class HomeScreen extends StatelessWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AttenDesk'),
        actions: [
          // Optional: Add actions (settings, notifications badge)
        ],
      ),
      body: const DashboardView(),
    );
  }
}
```

### Step 7: Add Periodic Location Updates
7.1. In `DashboardController`, add periodic location updates:
```dart
Timer? _locationTimer;

void startLocationUpdates() {
  _locationTimer = Timer.periodic(const Duration(minutes: 1), (timer) {
    updateLocation();
  });
}

void stopLocationUpdates() {
  _locationTimer?.cancel();
  _locationTimer = null;
}

@override
void dispose() {
  stopLocationUpdates();
  super.dispose();
}
```

### Step 8: Testing
8.1. Test clock-in flow:
   - Clock in within geofence → Success
   - Clock in outside geofence → Error or warning
   - Clock in on time → "You Are On Time!" message
   - Clock in late → Appropriate message

8.2. Test location updates:
   - Location permission granted → Distance updates
   - Location permission denied → Show appropriate message

8.3. Test check status tracker:
   - Before any checks → Check 1 highlighted
   - After Check 1 → Check 2 highlighted
   - After all checks → All shown, none highlighted

---

## Testing Scenarios

### Scenario 1: First Clock-In of Day
1. User opens app at 9:00 AM
2. Dashboard loads showing current time
3. "Check 1" indicator shows at top
4. Clock-in button is green and prominent
5. User taps clock-in button
6. Success dialog shows: "You Are On Time! Clock in time: 09:00 AM"
7. Check 1 now shows "09:00" in tracker
8. "Check 2" becomes current

### Scenario 2: Location Outside Geofence
1. User is far from office
2. Distance shows: "You are 5.2 km away from office"
3. Indicator is gray/neutral (not green)
4. User tries to clock in
5. Error message or warning shows

### Scenario 3: Late Clock-In
1. User opens app at 9:45 AM (late)
2. Check 1 indicator shows
3. User clocks in
4. Dialog shows: "Clocked In - Clock in time: 09:45 AM"
5. Check 1 shows "09:45" with warning icon (orange)

---

## Open Questions

- [x] Should we enforce geofence strictly or just warn? **Backend handles - show distance**
- [x] How often should location update? **Every 1 minute while on screen**
- [x] What if location permission is denied? **Show error message, can't clock in**
- [ ] Should we show next check time window? **Future enhancement**
- [ ] Should we disable clock-in button based on time windows? **Backend validates**

---

## Related Documents

- `00-design-system.md` - Styling
- `00-shared-components.md` - Component specs
- `00-navigation-architecture.md` - Bottom nav integration
- `09-success-toast.md` - Feedback dialog
- `api-requirements.md` - Backend endpoints

---

## Success Criteria

- ✅ Dashboard matches design
- ✅ Large time display updates every second
- ✅ Location distance shows and updates
- ✅ Check status tracker displays correctly
- ✅ Clock-in button is prominent and functional
- ✅ Success/error feedback displays appropriately
- ✅ Integrates with bottom navigation
- ✅ Pull-to-refresh works
- ✅ Location permissions handled gracefully

---

## Estimated Effort

- **Component creation**: 6 hours
- **Location services**: 4 hours
- **Controller updates**: 3 hours
- **Dashboard redesign**: 6 hours
- **Testing**: 3 hours
- **Total**: ~22 hours (3 days)

---

## Next Steps

After home dashboard is complete:
1. Implement success toast/feedback dialog (see `09-success-toast.md`)
2. Move to attendance history screen (see `03-attendance-history.md`)
3. Ensure bottom navigation works correctly
