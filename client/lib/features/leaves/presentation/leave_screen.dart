import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/services/leave_repository.dart';
import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;
import '../../../models/leave_models.dart';
import '../../widgets/async_error_view.dart';
import '../../widgets/empty_state.dart';
import '../controllers/leave_list_controller.dart';
import '../widgets/leave_balance_card.dart';
import '../widgets/leave_request_card.dart';
import '../widgets/leave_request_detail.dart';
import '../widgets/month_filter_toggle.dart';

class LeaveScreen extends StatelessWidget {
  const LeaveScreen({required this.repository, super.key});

  final LeaveRepositoryBase repository;

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider<LeaveListController>(
      create: (context) => LeaveListController(
        repository: repository,
      )..initialize(),
      child: _LeaveView(repository: repository),
    );
  }
}

/// Leaves screen with balance summary and request list
///
/// Features:
/// - Leave balance card (remaining/total/used)
/// - Month filter toggle (This Month/Last Month)
/// - Leave request cards
/// - Request Leave button at bottom
/// Redesigned to match leave_balance.png mockup
class _LeaveView extends StatefulWidget {
  const _LeaveView({required this.repository});

  final LeaveRepositoryBase repository;

  @override
  State<_LeaveView> createState() => _LeaveViewState();
}

class _LeaveViewState extends State<_LeaveView> {
  LeaveBalance? _balance;
  bool _isLoadingBalance = false;
  String? _balanceError;
  bool _showThisMonth = true;

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
      final balance = await widget.repository.getLeaveBalance();
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
      backgroundColor: backgroundPrimary,
      appBar: AppBar(
        title: Text(
          'Leaves',
          style: app_typography.headingLarge.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        backgroundColor: backgroundPrimary,
        elevation: 0,
        centerTitle: true,
      ),
      body: Column(
        children: [
          // Scrollable content
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async {
                await Future.wait([
                  listController.refresh(),
                  _loadBalance(),
                ]);
              },
              child: ListView(
                padding: const EdgeInsets.all(paddingLarge),
                children: [
                  // Leave balance card
                  if (_isLoadingBalance && _balance == null)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(paddingXLarge),
                        child: CircularProgressIndicator(),
                      ),
                    )
                  else if (_balance != null)
                    LeaveBalanceCard(
                      remaining: _balance!.remaining,
                      total: _balance!.total,
                      used: _balance!.used,
                    )
                  else if (_balanceError != null)
                    Container(
                      padding: const EdgeInsets.all(paddingLarge),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFE5E5),
                        borderRadius: BorderRadius.circular(radiusLarge),
                      ),
                      child: Text(
                        'Could not load balance: $_balanceError',
                        style: app_typography.bodyMedium.copyWith(
                          color: Colors.red,
                        ),
                      ),
                    ),
                  const SizedBox(height: space8),

                  // Month filter toggle
                  MonthFilterToggle(
                    showThisMonth: _showThisMonth,
                    onChanged: (showThisMonth) {
                      setState(() {
                        _showThisMonth = showThisMonth;
                      });
                    },
                  ),
                  const SizedBox(height: space8),

                  // Loading indicator
                  if (listController.isLoading && listController.items.isEmpty)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(paddingXLarge),
                        child: CircularProgressIndicator(),
                      ),
                    )
                  // Error state
                  else if (listController.errorMessage != null &&
                      listController.items.isEmpty)
                    AsyncErrorView(
                      message: listController.errorMessage!,
                      onRetry: listController.refresh,
                    )
                  // Empty state
                  else if (_getFilteredLeaves(listController.items).isEmpty)
                    const EmptyState(
                      icon: Icons.inbox,
                      title: 'No Leave Requests',
                      message: 'You haven\'t submitted any leave requests yet.',
                    )
                  // Leave request cards
                  else
                    ..._getFilteredLeaves(listController.items).map((leave) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: gapMedium),
                        child: LeaveRequestCard(
                          startDate: leave.startDate ?? DateTime.now(),
                          endDate: leave.endDate,
                          reason: leave.reason ?? 'No reason provided',
                          status: leave.status.name,
                          onTap: () => _showLeaveDetail(context, leave),
                        ),
                      );
                    }),
                ],
              ),
            ),
          ),

          // Request Leave button at bottom
          Container(
            padding: const EdgeInsets.all(paddingLarge),
            decoration: BoxDecoration(
              color: backgroundPrimary,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 10,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton(
                onPressed: () {
                  context.push('/submit-leave');
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1A1A1A),
                  foregroundColor: backgroundPrimary,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(radiusLarge * 1.5),
                  ),
                ),
                child: Text(
                  'Request Leave',
                  style: app_typography.bodyLarge.copyWith(
                    fontWeight: FontWeight.w600,
                    color: backgroundPrimary,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<LeaveListItem> _getFilteredLeaves(List<LeaveListItem> items) {
    final now = DateTime.now();
    final DateTime startOfThisMonth;
    final DateTime endOfThisMonth;
    final DateTime startOfLastMonth;
    final DateTime endOfLastMonth;

    if (_showThisMonth) {
      // This month
      startOfThisMonth = DateTime(now.year, now.month, 1);
      endOfThisMonth = DateTime(now.year, now.month + 1, 0, 23, 59, 59);

      return items.where((leave) {
        final submittedAt = leave.submittedAt;
        if (submittedAt == null) return false;
        return submittedAt.isAfter(startOfThisMonth) &&
            submittedAt.isBefore(endOfThisMonth);
      }).toList();
    } else {
      // Last month
      startOfLastMonth = DateTime(now.year, now.month - 1, 1);
      endOfLastMonth = DateTime(now.year, now.month, 0, 23, 59, 59);

      return items.where((leave) {
        final submittedAt = leave.submittedAt;
        if (submittedAt == null) return false;
        return submittedAt.isAfter(startOfLastMonth) &&
            submittedAt.isBefore(endOfLastMonth);
      }).toList();
    }
  }

  void _showLeaveDetail(BuildContext context, LeaveListItem leave) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => LeaveDetailSheet(item: leave),
    );
  }
}


