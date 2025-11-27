import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;

/// Time display widget showing current time and date
///
/// Displays large, clean time (HH:mm format) and date
/// Updates every second to show live time
/// Redesigned to match home.png mockup - minimal, no container
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
    // Format: 09:30 (without seconds)
    final timeFormat = DateFormat('HH:mm');
    // Format: Monday | October 25
    final dayFormat = DateFormat('EEEE');
    final dateFormat = DateFormat('MMMM d');

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Large time display (e.g., 09:30)
        Text(
          timeFormat.format(_currentTime),
          style: TextStyle(
            fontSize: 80,
            fontWeight: FontWeight.bold,
            color: textPrimary,
            height: 1.0,
            letterSpacing: -2,
            fontFeatures: const [FontFeature.tabularFigures()], // Monospaced digits
          ),
        ),
        const SizedBox(height: space2),

        // Date display (e.g., Monday | October 25)
        Text(
          '${dayFormat.format(_currentTime)} | ${dateFormat.format(_currentTime)}',
          style: app_typography.bodyLarge.copyWith(
            color: textSecondary,
          ),
        ),
      ],
    );
  }
}
