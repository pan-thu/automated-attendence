import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/services/telemetry_service.dart';
import '../controllers/dashboard_controller.dart';
import '../controllers/clock_in_controller.dart';
import '../widgets/dashboard_view.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final telemetry = context.read<TelemetryService>();
    return MultiProvider(
      providers: [
        ChangeNotifierProvider<DashboardController>(
          create: (_) => DashboardController(telemetry: telemetry)..loadDashboard(),
        ),
        ChangeNotifierProvider<ClockInController>(
          create: (_) => ClockInController(telemetry: telemetry),
        ),
      ],
      child: const DashboardView(),
    );
  }
}

