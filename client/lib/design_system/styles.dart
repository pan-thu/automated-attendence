import 'package:flutter/material.dart';
import 'colors.dart';
import 'spacing.dart';
import 'typography.dart';

/// Design system styles for AttenDesk app
///
/// Based on design specifications in docs/client-overhaul/00-design-system.md

// Button Styles

/// Primary button style - green background
ButtonStyle get primaryButtonStyle => ElevatedButton.styleFrom(
      backgroundColor: primaryGreen,
      foregroundColor: Colors.white,
      elevation: 0,
      padding: const EdgeInsets.symmetric(
        horizontal: paddingLarge,
        vertical: paddingMedium,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radiusMedium),
      ),
      textStyle: buttonLarge,
    );

/// Circular primary button style (for clock-in button)
ButtonStyle get circularPrimaryButtonStyle => ElevatedButton.styleFrom(
      backgroundColor: primaryGreen,
      foregroundColor: Colors.white,
      elevation: 4,
      padding: const EdgeInsets.all(paddingXLarge),
      shape: const CircleBorder(),
    );

/// Secondary button style - outlined with green border
ButtonStyle get secondaryButtonStyle => OutlinedButton.styleFrom(
      foregroundColor: primaryGreen,
      side: const BorderSide(color: primaryGreen, width: 1.5),
      padding: const EdgeInsets.symmetric(
        horizontal: paddingLarge,
        vertical: paddingMedium,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radiusMedium),
      ),
      textStyle: buttonMedium,
    );

/// Text button style
ButtonStyle get textButtonStyle => TextButton.styleFrom(
      foregroundColor: primaryGreen,
      padding: const EdgeInsets.symmetric(
        horizontal: paddingMedium,
        vertical: paddingSmall,
      ),
      textStyle: buttonMedium,
    );

// Input Field Decoration

/// Default input decoration for text fields
InputDecoration get inputDecoration => InputDecoration(
      filled: true,
      fillColor: backgroundSecondary,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(radiusMedium),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(radiusMedium),
        borderSide: const BorderSide(color: borderColor, width: 1),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(radiusMedium),
        borderSide: const BorderSide(color: primaryGreen, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(radiusMedium),
        borderSide: const BorderSide(color: errorBackground, width: 1),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(radiusMedium),
        borderSide: const BorderSide(color: errorBackground, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(
        horizontal: paddingMedium,
        vertical: paddingMedium,
      ),
      hintStyle: const TextStyle(color: textHint),
    );

// Card Theme

/// Card theme data
CardThemeData get cardTheme => CardThemeData(
      color: backgroundCard,
      elevation: elevationCard,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radiusLarge),
      ),
      margin: const EdgeInsets.all(marginSmall),
    );

// Bottom Navigation Theme

/// Bottom navigation bar theme
BottomNavigationBarThemeData get bottomNavTheme =>
    BottomNavigationBarThemeData(
      backgroundColor: backgroundPrimary,
      selectedItemColor: primaryGreen,
      unselectedItemColor: textTertiary,
      selectedLabelStyle: labelSmall,
      unselectedLabelStyle: labelSmall,
      type: BottomNavigationBarType.fixed,
      elevation: 8,
    );

// Shadow Definitions

/// Small shadow for cards
BoxShadow get shadowSmall => BoxShadow(
      color: Colors.black.withValues(alpha: 0.08),
      blurRadius: 4,
      offset: const Offset(0, 2),
    );

/// Medium shadow
BoxShadow get shadowMedium => BoxShadow(
      color: Colors.black.withValues(alpha: 0.12),
      blurRadius: 8,
      offset: const Offset(0, 4),
    );

/// Large shadow
BoxShadow get shadowLarge => BoxShadow(
      color: Colors.black.withValues(alpha: 0.16),
      blurRadius: 16,
      offset: const Offset(0, 8),
    );

// Animation Durations

const Duration durationFast = Duration(milliseconds: 150);
const Duration durationNormal = Duration(milliseconds: 300);
const Duration durationSlow = Duration(milliseconds: 500);

// Animation Curves

const Curve curveDefault = Curves.easeInOut;
const Curve curveEnter = Curves.easeOut;
const Curve curveExit = Curves.easeIn;
