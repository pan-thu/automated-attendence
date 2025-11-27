import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'colors.dart';

/// Design system typography constants for AttenDesk app
/// Uses Poppins font for a modern, distinct look

// Base Poppins text style
TextStyle _poppins({
  double fontSize = 14,
  FontWeight fontWeight = FontWeight.normal,
  Color color = textPrimary,
}) {
  return GoogleFonts.poppins(
    fontSize: fontSize,
    fontWeight: fontWeight,
    color: color,
  );
}

// Display - Large time display (09:30)
final TextStyle displayLarge = _poppins(
  fontSize: 48,
  fontWeight: FontWeight.bold,
);

final TextStyle displayMedium = _poppins(
  fontSize: 36,
  fontWeight: FontWeight.bold,
);

// Headings
final TextStyle headingLarge = _poppins(
  fontSize: 24,
  fontWeight: FontWeight.bold,
);

final TextStyle headingMedium = _poppins(
  fontSize: 20,
  fontWeight: FontWeight.w600,
);

final TextStyle headingSmall = _poppins(
  fontSize: 18,
  fontWeight: FontWeight.w600,
);

// Body text
final TextStyle bodyLarge = _poppins(
  fontSize: 16,
  fontWeight: FontWeight.normal,
);

final TextStyle bodyMedium = _poppins(
  fontSize: 14,
  fontWeight: FontWeight.normal,
);

final TextStyle bodySmall = _poppins(
  fontSize: 12,
  fontWeight: FontWeight.normal,
  color: textSecondary,
);

// Labels
final TextStyle labelLarge = _poppins(
  fontSize: 14,
  fontWeight: FontWeight.w500,
);

final TextStyle labelMedium = _poppins(
  fontSize: 12,
  fontWeight: FontWeight.w500,
  color: textSecondary,
);

final TextStyle labelSmall = _poppins(
  fontSize: 10,
  fontWeight: FontWeight.w500,
  color: textTertiary,
);

// Button text
final TextStyle buttonLarge = _poppins(
  fontSize: 16,
  fontWeight: FontWeight.w600,
  color: Colors.white,
);

final TextStyle buttonMedium = _poppins(
  fontSize: 14,
  fontWeight: FontWeight.w600,
  color: Colors.white,
);
