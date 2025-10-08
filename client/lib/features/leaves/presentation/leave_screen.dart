import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../controllers/leave_list_controller.dart';
import '../controllers/leave_request_controller.dart';
import '../widgets/leave_filters.dart';
import '../widgets/leave_list.dart';
import '../widgets/leave_request_form.dart';

class LeaveScreen extends StatelessWidget {
  const LeaveScreen({required this.repository, super.key});

  final LeaveRepositoryBase repository;

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider<LeaveListController>(
          create: (context) => LeaveListController(
            repository: repository,
          )..initialize(),
        ),
        ChangeNotifierProvider<LeaveRequestController>(
          create: (context) => LeaveRequestController(
            repository: repository,
          ),
        ),
      ],
      child: const _LeaveView(),
    );
  }
}

class _LeaveView extends StatelessWidget {
  const _LeaveView();

  @override
  Widget build(BuildContext context) {
    final listController = context.watch<LeaveListController>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Leave Management'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
            onPressed: listController.isLoading ? null : listController.refresh,
          ),
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'New Request',
            onPressed: () => _openRequestSheet(context),
          ),
        ],
      ),
      body: Column(
        children: [
          LeaveFilters(
            status: listController.statusFilter,
            isLoading: listController.isLoading,
            onFilterChanged: listController.changeFilter,
          ),
          Expanded(
            child: LeaveList(
              controller: listController,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _openRequestSheet(BuildContext context) async {
    final requestController = context.read<LeaveRequestController>()..reset();

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => ChangeNotifierProvider.value(
        value: requestController,
        child: const LeaveRequestForm(),
      ),
    );

    if (requestController.lastSubmission != null) {
      await context.read<LeaveListController>().refresh();
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Leave request submitted.')),
        );
      }
    }
  }
}


