import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'colors.dart';
import 'spacing.dart';
import 'styles.dart';
import 'typography.dart' as app_typography;

/// Design system theme for AttenDesk app
///
/// Based on design specifications in docs/client-overhaul/00-design-system.md

/// Light theme (primary theme)
ThemeData get lightTheme => ThemeData(
      useMaterial3: true,
      colorScheme: const ColorScheme.light(
        primary: primaryGreen,
        secondary: brandPrimary,
        surface: backgroundPrimary,
        error: errorBackground,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onSurface: textPrimary,
        onError: errorText,
      ),

      // Scaffold
      scaffoldBackgroundColor: backgroundSecondary,

      // AppBar
      appBarTheme: AppBarTheme(
        backgroundColor: backgroundPrimary,
        foregroundColor: textPrimary,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: app_typography.headingMedium,
      ),

      // Card
      cardTheme: cardTheme,

      // Bottom Navigation
      bottomNavigationBarTheme: bottomNavTheme,

      // Input Decoration
      inputDecorationTheme: InputDecorationTheme(
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
      ),

      // Elevated Button
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: primaryButtonStyle,
      ),

      // Outlined Button
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: secondaryButtonStyle,
      ),

      // Text Button
      textButtonTheme: TextButtonThemeData(
        style: textButtonStyle,
      ),

      // Text Theme - Using Poppins font
      textTheme: GoogleFonts.poppinsTextTheme().copyWith(
        displayLarge: app_typography.displayLarge,
        headlineLarge: app_typography.headingLarge,
        headlineMedium: app_typography.headingMedium,
        headlineSmall: app_typography.headingSmall,
        bodyLarge: app_typography.bodyLarge,
        bodyMedium: app_typography.bodyMedium,
        bodySmall: app_typography.bodySmall,
        labelLarge: app_typography.labelLarge,
        labelMedium: app_typography.labelMedium,
        labelSmall: app_typography.labelSmall,
      ),

      // Divider
      dividerTheme: const DividerThemeData(
        color: dividerColor,
        thickness: 1,
        space: 1,
      ),

      // Floating Action Button
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: primaryGreen,
        foregroundColor: Colors.white,
        elevation: 4,
      ),

      // Chip
      chipTheme: ChipThemeData(
        backgroundColor: backgroundSecondary,
        selectedColor: primaryGreen,
        labelStyle: app_typography.labelMedium,
        padding: const EdgeInsets.symmetric(
          horizontal: paddingSmall,
          vertical: paddingXSmall,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusSmall),
        ),
      ),

      // Icon
      iconTheme: const IconThemeData(
        color: textPrimary,
        size: iconSizeMedium,
      ),

      // List Tile
      listTileTheme: const ListTileThemeData(
        contentPadding: EdgeInsets.symmetric(
          horizontal: paddingMedium,
          vertical: paddingSmall,
        ),
      ),
    );
