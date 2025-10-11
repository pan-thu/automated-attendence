# Firebase Emulator Test Configuration

## Starting the Emulators

```bash
cd functions

# Build TypeScript first
npm run build

# Start Firebase emulators
npm run serve
```

This will start:
- **Functions**: `localhost:5001`
- **Firestore**: `localhost:8080`
- **Auth**: `localhost:9099`
- **UI**: `http://localhost:4000` (Emulator Suite UI)

## Configuring Clients to Use Emulators

### Admin Dashboard (Next.js)

**File**: `admin/src/lib/firebase/config.ts`

Add emulator configuration (development only):

```typescript
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// ... existing config ...

export function getFirebaseApp() {
  if (getApps().length === 0) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
}

// Connect to emulators in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';

  if (useEmulators) {
    const auth = getAuth(getFirebaseApp());
    const db = getFirestore(getFirebaseApp());
    const functions = getFunctions(getFirebaseApp());

    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectFunctionsEmulator(functions, 'localhost', 5001);

    console.log('🔧 Connected to Firebase Emulators');
  }
}
```

**Environment Configuration** (`admin/.env.local`):

```env
# Firebase config (existing)
NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..."
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="..."
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="..."

# Functions region
NEXT_PUBLIC_FUNCTIONS_REGION="us-central1"

# Emulator configuration (for testing)
NEXT_PUBLIC_USE_EMULATORS="true"
NODE_ENV="development"
```

### Flutter Client

**File**: `client/lib/main.dart`

Add emulator configuration:

```dart
import 'package:cloud_functions/cloud_functions.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  // Connect to emulators in development
  const useEmulators = bool.fromEnvironment('USE_EMULATORS', defaultValue: false);

  if (useEmulators) {
    await FirebaseAuth.instance.useAuthEmulator('localhost', 9099);
    FirebaseFirestore.instance.useFirestoreEmulator('localhost', 8080);
    FirebaseFunctions.instance.useFunctionsEmulator('localhost', 5001);

    debugPrint('🔧 Connected to Firebase Emulators');
  }

  runApp(const MyApp());
}
```

**Run with emulators**:
```bash
flutter run --dart-define=USE_EMULATORS=true
```

## Verifying Emulator Connection

### Check Emulator UI
1. Open `http://localhost:4000` in browser
2. Verify all services are running (Functions, Firestore, Auth)
3. Check function list - should show all 32 functions

### Test Authentication
```bash
# Create test user via emulator UI
# Or use Firebase Auth API directly
```

### Test Function Call (curl)
```bash
# Test unauthenticated call (should fail with proper error)
curl -X POST http://localhost:5001/automated-attendence-6fc07/us-central1/getDashboardStats \
  -H "Content-Type: application/json" \
  -d '{"data":{"date":"2025-10-12"}}'

# Expected response:
# {"error":{"status":"UNAUTHENTICATED","message":"Authentication required."}}
```

## Seeding Test Data

**Run seed script**:
```bash
cd functions
npm run seed:firestore
```

This creates:
- Admin user (from `SEED_ADMIN_UID` env var)
- Default company settings
- Admin custom claim

## Stopping Emulators

```bash
# Ctrl+C in terminal running emulators
# Or
firebase emulators:stop
```

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port
lsof -ti:5001 | xargs kill
lsof -ti:8080 | xargs kill
lsof -ti:9099 | xargs kill
```

### Emulators Not Starting
```bash
# Clear emulator data
firebase emulators:export --force ./emulator-data
rm -rf ./emulator-data

# Restart
npm run serve
```

### Functions Not Showing Up
```bash
# Rebuild TypeScript
npm run build

# Check for build errors
npm run build -- --noEmit
```

### Client Can't Connect
- Verify `NEXT_PUBLIC_USE_EMULATORS="true"` in admin/.env.local
- Check browser console for connection errors
- Ensure emulators are running before starting client
- For Flutter, verify `--dart-define=USE_EMULATORS=true` flag
