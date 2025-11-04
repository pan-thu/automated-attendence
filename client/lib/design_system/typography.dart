import 'package:flutter/material.dart';
import 'colors.dart';

/// Design system typography constants for AttenDesk app
///
/// Based on design specifications in docs/client-overhaul/00-design-system.md

// Font Family
const String fontFamily = 'Roboto'; // Using system default

// Display - Large time display (09:30)
const TextStyle displayLarge = TextStyle(
  fontSize: 48,
  fontWeight: FontWeight.bold,
  color: textPrimary,
  fontFamily: fontFamily,
);

// Headings
const TextStyle headingLarge = TextStyle(
  fontSize: 24,
  fontWeight: FontWeight.bold,
  color: textPrimary,
  fontFamily: fontFamily,
);

const TextStyle headingMedium = TextStyle(
  fontSize: 20,
  fontWeight: FontWeight.w600,
  color: textPrimary,
  fontFamily: fontFamily,
);

const TextStyle headingSmall = TextStyle(
  fontSize: 18,
  fontWeight: FontWeight.w600,
  color: textPrimary,
  fontFamily: fontFamily,
);

// Body text
const TextStyle bodyLarge = TextStyle(
  fontSize: 16,
  fontWeight: FontWeight.normal,
  color: textPrimary,
  fontFamily: fontFamily,
);

const TextStyle bodyMedium = TextStyle(
  fontSize: 14,
  fontWeight: FontWeight.normal,
  color: textPrimary,
  fontFamily: fontFamily,
);

const TextStyle bodySmall = TextStyle(
  fontSize: 12,
  fontWeight: FontWeight.normal,
  color: textSecondary,
  fontFamily: fontFamily,
);

// Labels
const TextStyle labelLarge = TextStyle(
  fontSize: 14,
  fontWeight: FontWeight.w500,
  color: textPrimary,
  fontFamily: fontFamily,
);

const TextStyle labelMedium = TextStyle(
  fontSize: 12,
  fontWeight: FontWeight.w500,
  color: textSecondary,
  fontFamily: fontFamily,
);

const TextStyle labelSmall = TextStyle(
  fontSize: 10,
  fontWeight: FontWeight.w500,
  color: textTertiary,
  fontFamily: fontFamily,
);

// Button text
const TextStyle buttonLarge = TextStyle(
  fontSize: 16,
  fontWeight: FontWeight.w600,
  color: Colors.white,
  fontFamily: fontFamily,
);

const TextStyle buttonMedium = TextStyle(
  fontSize: 14,
  fontWeight: FontWeight.w600,
  color: Colors.white,
  fontFamily: fontFamily,
);
