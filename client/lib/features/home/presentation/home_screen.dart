import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../controllers/dashboard_controller.dart';
import '../controllers/clock_in_controller.dart';
import '../widgets/dashboard_view.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider<DashboardController>(
          create: (_) => DashboardController()..loadDashboard(),
        ),
        ChangeNotifierProvider<ClockInController>(
          create: (_) => ClockInController(),
        ),
      ],
      child: const DashboardView(),
    );
  }
}

