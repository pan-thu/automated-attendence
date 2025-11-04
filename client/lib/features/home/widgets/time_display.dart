import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;

/// Time display widget showing current time and date
///
/// Updates every second to show live time
/// Used on home dashboard for clock-in context
/// Based on spec in docs/client-overhaul/02-home-dashboard.md
class TimeDisplay extends StatefulWidget {
  const TimeDisplay({super.key});

  @override
  State<TimeDisplay> createState() => _TimeDisplayState();
}

class _TimeDisplayState extends State<TimeDisplay> {
  late Timer _timer;
  late DateTime _currentTime;

  @override
  void initState() {
    super.initState();
    _currentTime = DateTime.now();

    // Update time every second
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        setState(() {
          _currentTime = DateTime.now();
        });
      }
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final timeFormat = DateFormat('HH:mm:ss');
    final dateFormat = DateFormat('EEEE, MMMM d, yyyy');

    return Container(
      padding: const EdgeInsets.all(paddingLarge),
      decoration: BoxDecoration(
        color: backgroundSecondary,
        borderRadius: BorderRadius.circular(radiusLarge),
        border: Border.all(color: borderColor, width: 1),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Current time (large)
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                Icons.access_time,
                size: iconSizeLarge,
                color: primaryGreen,
              ),
              const SizedBox(width: gapMedium),
              Text(
                timeFormat.format(_currentTime),
                style: app_typography.displayMedium.copyWith(
                  fontWeight: FontWeight.bold,
                  color: textPrimary,
                  fontFeatures: [const FontFeature.tabularFigures()], // Monospaced digits
                ),
              ),
            ],
          ),
          const SizedBox(height: space2),

          // Current date
          Text(
            dateFormat.format(_currentTime),
            style: app_typography.bodyMedium.copyWith(
              color: textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
