import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/services/leave_repository.dart';
import '../controllers/leave_list_controller.dart';
import '../controllers/leave_request_controller.dart';
import '../widgets/leave_balance_header.dart';
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

class _LeaveView extends StatefulWidget {
  const _LeaveView();

  @override
  State<_LeaveView> createState() => _LeaveViewState();
}

class _LeaveViewState extends State<_LeaveView> {
  LeaveBalance? _balance;
  bool _isLoadingBalance = false;
  String? _balanceError;

  @override
  void initState() {
    super.initState();
    _loadBalance();
  }

  Future<void> _loadBalance() async {
    setState(() {
      _isLoadingBalance = true;
      _balanceError = null;
    });

    try {
      final repository = context.read<LeaveRepositoryBase>();
      final balance = await repository.getLeaveBalance();
      if (mounted) {
        setState(() {
          _balance = balance;
          _isLoadingBalance = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _balanceError = e.toString();
          _isLoadingBalance = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final listController = context.watch<LeaveListController>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Leave Management'),
        actions: [
          IconButton(
            icon: const Icon(Icons.help_outline),
            tooltip: 'Help',
            onPressed: () => _openHelp(context),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
            onPressed: listController.isLoading
                ? null
                : () async {
                    await Future.wait([
                      listController.refresh(),
                      _loadBalance(),
                    ]);
                  },
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
          // Balance header
          if (_isLoadingBalance && _balance == null)
            const Padding(
              padding: EdgeInsets.all(16.0),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_balance != null)
            LeaveBalanceHeader(balance: _balance!)
          else if (_balanceError != null)
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Text(
                'Could not load balance: $_balanceError',
                style: const TextStyle(color: Colors.red),
              ),
            ),
          // Filters
          LeaveFilters(
            status: listController.statusFilter,
            isLoading: listController.isLoading,
            onFilterChanged: listController.changeFilter,
          ),
          // Leave list
          Expanded(
            child: LeaveList(
              controller: listController,
            ),
          ),
        ],
      ),
    );
  }

  void _openHelp(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      builder: (context) => const _HelpSheet(),
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

class _HelpSheet extends StatelessWidget {
  const _HelpSheet();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          Text('Leave Help', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          SizedBox(height: 12),
          Text('• Use the filters to view pending, approved, or rejected requests.'),
          SizedBox(height: 8),
          Text('• Tap the + button to create a new leave request.'),
          SizedBox(height: 8),
          Text('• Attachments are required for medical leave types as per company policy.'),
          SizedBox(height: 8),
          Text('• Contact your manager if you need to escalate a decision.'),
        ],
      ),
    );
  }
}


