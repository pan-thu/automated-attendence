# Design System - Mobile App UI/UX

## Overview
This document defines the design tokens and visual language for the AttenDesk mobile application, extracted from the high-fidelity designs in `docs/ui/client/high/`.

## Design Reference
Source designs: `docs/ui/client/high/*.png`

---

## Color Palette

### Primary Colors
```dart
// Primary Green - Used for primary actions, success states
const Color primaryGreen = Color(0xFF4CAF50);  // Approximate from clock-in button
const Color primaryGreenDark = Color(0xFF388E3C);
const Color primaryGreenLight = Color(0xFF81C784);

// Brand Colors
const Color brandPrimary = Color(0xFF2196F3);  // AttenDesk blue (from logo)
```

### Status Colors
```dart
// Attendance Status
const Color statusPresent = Color(0xFF4CAF50);    // Green
const Color statusAbsent = Color(0xFFF44336);     // Red
const Color statusLate = Color(0xFFFFC107);       // Yellow/Amber
const Color statusLeave = Color(0xFF9E9E9E);      // Gray
const Color statusHalfDay = Color(0xFFFF9800);    // Orange

// Leave Status
const Color leaveApproved = Color(0xFF4CAF50);    // Green
const Color leavePending = Color(0xFFFFC107);     // Yellow
const Color leaveRejected = Color(0xFFF44336);    // Red

// Penalty Status
const Color penaltyActive = Color(0xFFF44336);    // Red
const Color penaltyWaived = Color(0xFF4CAF50);    // Green
const Color penaltyPaid = Color(0xFF2196F3);      // Blue
const Color penaltyDisputed = Color(0xFFFF9800);  // Orange
```

### Neutral Colors
```dart
// Backgrounds
const Color backgroundPrimary = Color(0xFFFFFFFF);      // White
const Color backgroundSecondary = Color(0xFFF5F5F5);    // Light gray
const Color backgroundCard = Color(0xFFFFFFFF);         // White

// Text
const Color textPrimary = Color(0xFF212121);            // Dark gray/black
const Color textSecondary = Color(0xFF757575);          // Medium gray
const Color textTertiary = Color(0xFF9E9E9E);           // Light gray
const Color textHint = Color(0xFFBDBDBD);               // Very light gray

// Borders & Dividers
const Color borderColor = Color(0xFFE0E0E0);            // Light gray
const Color dividerColor = Color(0xFFEEEEEE);           // Very light gray
```

### Functional Colors
```dart
// Success
const Color successBackground = Color(0xFF4CAF50);
const Color successText = Color(0xFFFFFFFF);

// Error
const Color errorBackground = Color(0xFFF44336);
const Color errorText = Color(0xFFFFFFFF);

// Warning
const Color warningBackground = Color(0xFFFF9800);
const Color warningIcon = Color(0xFFFF9800);

// Info
const Color infoBackground = Color(0xFF2196F3);
const Color infoText = Color(0xFFFFFFFF);
```

---

## Typography

### Font Family
```dart
// Use default system font or specify
const String fontFamily = 'Roboto';  // Or system default
```

### Text Styles
```dart
// Display - Large time display (09:30)
const TextStyle displayLarge = TextStyle(
  fontSize: 48,
  fontWeight: FontWeight.bold,
  color: textPrimary,
);

// Headings
const TextStyle headingLarge = TextStyle(
  fontSize: 24,
  fontWeight: FontWeight.bold,
  color: textPrimary,
);

const TextStyle headingMedium = TextStyle(
  fontSize: 20,
  fontWeight: FontWeight.w600,
  color: textPrimary,
);

const TextStyle headingSmall = TextStyle(
  fontSize: 18,
  fontWeight: FontWeight.w600,
  color: textPrimary,
);

// Body text
const TextStyle bodyLarge = TextStyle(
  fontSize: 16,
  fontWeight: FontWeight.normal,
  color: textPrimary,
);

const TextStyle bodyMedium = TextStyle(
  fontSize: 14,
  fontWeight: FontWeight.normal,
  color: textPrimary,
);

const TextStyle bodySmall = TextStyle(
  fontSize: 12,
  fontWeight: FontWeight.normal,
  color: textSecondary,
);

// Labels
const TextStyle labelLarge = TextStyle(
  fontSize: 14,
  fontWeight: FontWeight.w500,
  color: textPrimary,
);

const TextStyle labelMedium = TextStyle(
  fontSize: 12,
  fontWeight: FontWeight.w500,
  color: textSecondary,
);

const TextStyle labelSmall = TextStyle(
  fontSize: 10,
  fontWeight: FontWeight.w500,
  color: textTertiary,
);

// Button text
const TextStyle buttonLarge = TextStyle(
  fontSize: 16,
  fontWeight: FontWeight.w600,
  color: Colors.white,
);

const TextStyle buttonMedium = TextStyle(
  fontSize: 14,
  fontWeight: FontWeight.w600,
  color: Colors.white,
);
```

---

## Spacing System

### Base Unit
```dart
const double spaceUnit = 4.0;

// Spacing scale (multiples of base unit)
const double space0 = 0;
const double space1 = 4.0;   // spaceUnit * 1
const double space2 = 8.0;   // spaceUnit * 2
const double space3 = 12.0;  // spaceUnit * 3
const double space4 = 16.0;  // spaceUnit * 4
const double space5 = 20.0;  // spaceUnit * 5
const double space6 = 24.0;  // spaceUnit * 6
const double space8 = 32.0;  // spaceUnit * 8
const double space10 = 40.0; // spaceUnit * 10
const double space12 = 48.0; // spaceUnit * 12
const double space16 = 64.0; // spaceUnit * 16
```

### Semantic Spacing
```dart
// Padding
const double paddingXSmall = space2;   // 8.0
const double paddingSmall = space3;    // 12.0
const double paddingMedium = space4;   // 16.0
const double paddingLarge = space6;    // 24.0
const double paddingXLarge = space8;   // 32.0

// Margins
const double marginXSmall = space2;    // 8.0
const double marginSmall = space3;     // 12.0
const double marginMedium = space4;    // 16.0
const double marginLarge = space6;     // 24.0
const double marginXLarge = space8;    // 32.0

// Gaps (between elements)
const double gapXSmall = space1;       // 4.0
const double gapSmall = space2;        // 8.0
const double gapMedium = space3;       // 12.0
const double gapLarge = space4;        // 16.0
const double gapXLarge = space6;       // 24.0
```

---

## Border Radius

```dart
const double radiusSmall = 4.0;
const double radiusMedium = 8.0;
const double radiusLarge = 12.0;
const double radiusXLarge = 16.0;
const double radiusCircular = 999.0;  // For fully rounded elements
```

---

## Elevation & Shadows

```dart
// Card elevation
const double elevationCard = 2.0;
const double elevationCardHover = 4.0;

// Modal elevation
const double elevationModal = 8.0;

// Bottom sheet elevation
const double elevationBottomSheet = 16.0;

// Shadow definitions
BoxShadow shadowSmall = BoxShadow(
  color: Colors.black.withOpacity(0.08),
  blurRadius: 4,
  offset: Offset(0, 2),
);

BoxShadow shadowMedium = BoxShadow(
  color: Colors.black.withOpacity(0.12),
  blurRadius: 8,
  offset: Offset(0, 4),
);

BoxShadow shadowLarge = BoxShadow(
  color: Colors.black.withOpacity(0.16),
  blurRadius: 16,
  offset: Offset(0, 8),
);
```

---

## Icon Sizes

```dart
const double iconSizeSmall = 16.0;
const double iconSizeMedium = 24.0;
const double iconSizeLarge = 32.0;
const double iconSizeXLarge = 48.0;

// Bottom navigation icons
const double iconSizeBottomNav = 24.0;

// Action icons
const double iconSizeAction = 24.0;
```

---

## Button Styles

### Primary Button
```dart
ButtonStyle primaryButtonStyle = ElevatedButton.styleFrom(
  backgroundColor: primaryGreen,
  foregroundColor: Colors.white,
  elevation: 0,
  padding: EdgeInsets.symmetric(horizontal: paddingLarge, vertical: paddingMedium),
  shape: RoundedRectangleBorder(
    borderRadius: BorderRadius.circular(radiusMedium),
  ),
  textStyle: buttonLarge,
);

// Circular primary button (clock-in)
ButtonStyle circularPrimaryButtonStyle = ElevatedButton.styleFrom(
  backgroundColor: primaryGreen,
  foregroundColor: Colors.white,
  elevation: 4,
  padding: EdgeInsets.all(paddingXLarge),
  shape: CircleBorder(),
);
```

### Secondary Button
```dart
ButtonStyle secondaryButtonStyle = OutlinedButton.styleFrom(
  foregroundColor: primaryGreen,
  side: BorderSide(color: primaryGreen, width: 1.5),
  padding: EdgeInsets.symmetric(horizontal: paddingLarge, vertical: paddingMedium),
  shape: RoundedRectangleBorder(
    borderRadius: BorderRadius.circular(radiusMedium),
  ),
  textStyle: buttonMedium,
);
```

### Text Button
```dart
ButtonStyle textButtonStyle = TextButton.styleFrom(
  foregroundColor: primaryGreen,
  padding: EdgeInsets.symmetric(horizontal: paddingMedium, vertical: paddingSmall),
  textStyle: buttonMedium,
);
```

---

## Input Field Styles

```dart
InputDecoration inputDecoration = InputDecoration(
  filled: true,
  fillColor: backgroundSecondary,
  border: OutlineInputBorder(
    borderRadius: BorderRadius.circular(radiusMedium),
    borderSide: BorderSide.none,
  ),
  enabledBorder: OutlineInputBorder(
    borderRadius: BorderRadius.circular(radiusMedium),
    borderSide: BorderSide(color: borderColor, width: 1),
  ),
  focusedBorder: OutlineInputBorder(
    borderRadius: BorderRadius.circular(radiusMedium),
    borderSide: BorderSide(color: primaryGreen, width: 2),
  ),
  errorBorder: OutlineInputBorder(
    borderRadius: BorderRadius.circular(radiusMedium),
    borderSide: BorderSide(color: errorBackground, width: 1),
  ),
  contentPadding: EdgeInsets.symmetric(
    horizontal: paddingMedium,
    vertical: paddingMedium,
  ),
  hintStyle: TextStyle(color: textHint),
);
```

---

## Card Styles

```dart
CardTheme cardTheme = CardTheme(
  color: backgroundCard,
  elevation: elevationCard,
  shape: RoundedRectangleBorder(
    borderRadius: BorderRadius.circular(radiusLarge),
  ),
  margin: EdgeInsets.all(marginSmall),
);
```

---

## Badge Styles

### Status Badges
```dart
// Approved/Success Badge
Container approvedBadge = Container(
  padding: EdgeInsets.symmetric(horizontal: space3, vertical: space1),
  decoration: BoxDecoration(
    color: statusPresent.withOpacity(0.1),
    borderRadius: BorderRadius.circular(radiusSmall),
  ),
  child: Text(
    'Approved',
    style: labelSmall.copyWith(color: statusPresent, fontWeight: FontWeight.w600),
  ),
);

// Pending Badge
Container pendingBadge = Container(
  padding: EdgeInsets.symmetric(horizontal: space3, vertical: space1),
  decoration: BoxDecoration(
    color: leavePending.withOpacity(0.1),
    borderRadius: BorderRadius.circular(radiusSmall),
  ),
  child: Text(
    'Pending',
    style: labelSmall.copyWith(color: leavePending, fontWeight: FontWeight.w600),
  ),
);

// Rejected Badge
Container rejectedBadge = Container(
  padding: EdgeInsets.symmetric(horizontal: space3, vertical: space1),
  decoration: BoxDecoration(
    color: leaveRejected.withOpacity(0.1),
    borderRadius: BorderRadius.circular(radiusSmall),
  ),
  child: Text(
    'Rejected',
    style: labelSmall.copyWith(color: leaveRejected, fontWeight: FontWeight.w600),
  ),
);
```

---

## Bottom Navigation

```dart
BottomNavigationBarThemeData bottomNavTheme = BottomNavigationBarThemeData(
  backgroundColor: backgroundPrimary,
  selectedItemColor: primaryGreen,
  unselectedItemColor: textTertiary,
  selectedLabelStyle: labelSmall,
  unselectedLabelStyle: labelSmall,
  type: BottomNavigationBarType.fixed,
  elevation: 8,
);
```

---

## Animation Durations

```dart
const Duration durationFast = Duration(milliseconds: 150);
const Duration durationNormal = Duration(milliseconds: 300);
const Duration durationSlow = Duration(milliseconds: 500);

// Animation curves
const Curve curveDefault = Curves.easeInOut;
const Curve curveEnter = Curves.easeOut;
const Curve curveExit = Curves.easeIn;
```

---

## Theme Configuration

### Light Theme (Primary)
```dart
ThemeData lightTheme = ThemeData(
  useMaterial3: true,
  colorScheme: ColorScheme.light(
    primary: primaryGreen,
    secondary: brandPrimary,
    surface: backgroundPrimary,
    background: backgroundSecondary,
    error: errorBackground,
  ),
  scaffoldBackgroundColor: backgroundSecondary,
  cardTheme: cardTheme,
  bottomNavigationBarTheme: bottomNavTheme,
  inputDecorationTheme: InputDecorationTheme(/* as defined above */),
  elevatedButtonTheme: ElevatedButtonThemeData(style: primaryButtonStyle),
  outlinedButtonTheme: OutlinedButtonThemeData(style: secondaryButtonStyle),
  textButtonTheme: TextButtonThemeData(style: textButtonStyle),
);
```

---

## Usage Notes

1. **Consistency**: All screens must use these defined tokens
2. **Component Library**: Create reusable widgets based on these styles (see `00-shared-components.md`)
3. **Accessibility**: Ensure color contrast ratios meet WCAG AA standards
4. **Responsive Design**: Use spacing scale consistently for different screen sizes
5. **Theme Extensions**: Add custom theme extensions if needed for app-specific values

---

## File Organization

Create design system implementation in:
```
client/lib/
  design_system/
    colors.dart          # Color constants
    typography.dart      # Text styles
    spacing.dart         # Spacing constants
    styles.dart          # Button, card, input styles
    theme.dart           # ThemeData configuration
```

---

## Next Steps

1. Implement design system files in client app
2. Create shared component library (see `00-shared-components.md`)
3. Update existing screens to use design tokens
4. Ensure all new screens follow this design system
