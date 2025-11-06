import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;
import '../../../core/services/holiday_repository.dart';
import '../../../types/holiday.dart';
import '../../widgets/async_error_view.dart';
import '../../widgets/empty_state.dart';

class HolidaysScreen extends StatefulWidget {
  final HolidayRepositoryBase repository;

  const HolidaysScreen({required this.repository, super.key});

  @override
  State<HolidaysScreen> createState() => _HolidaysScreenState();
}

class _HolidaysScreenState extends State<HolidaysScreen> {
  List<Holiday> _holidays = [];
  bool _isLoading = false;
  String? _errorMessage;
  int _selectedYear = DateTime.now().year;

  @override
  void initState() {
    super.initState();
    _loadHolidays();
  }

  Future<void> _loadHolidays() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final holidays = await widget.repository.getHolidays(year: _selectedYear);
      setState(() {
        _holidays = holidays;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  void _changeYear(int delta) {
    setState(() {
      _selectedYear += delta;
    });
    _loadHolidays();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: backgroundPrimary,
      appBar: AppBar(
        title: Text(
          'Holidays',
          style: app_typography.headingMedium,
        ),
        backgroundColor: backgroundPrimary,
        elevation: 0,
      ),
      body: _isLoading && _holidays.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null && _holidays.isEmpty
              ? AsyncErrorView(
                  message: _errorMessage!,
                  onRetry: _loadHolidays,
                )
              : RefreshIndicator(
                  onRefresh: _loadHolidays,
                  child: CustomScrollView(
                    slivers: [
                      // Year selector
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(
                            paddingLarge,
                            paddingLarge,
                            paddingLarge,
                            space6,
                          ),
                          child: _YearSelector(
                            selectedYear: _selectedYear,
                            onYearChanged: _changeYear,
                          ),
                        ),
                      ),

                      // Loading indicator
                      if (_isLoading)
                        const SliverToBoxAdapter(
                          child: Padding(
                            padding: EdgeInsets.symmetric(
                              horizontal: paddingLarge,
                            ),
                            child: LinearProgressIndicator(),
                          ),
                        ),

                      const SliverToBoxAdapter(
                        child: SizedBox(height: space4),
                      ),

                      // Holiday list
                      _holidays.isEmpty
                          ? SliverFillRemaining(
                              child: EmptyState(
                                icon: Icons.event_busy,
                                title: 'No Holidays',
                                message:
                                    'No holidays found for $_selectedYear.',
                              ),
                            )
                          : SliverPadding(
                              padding: const EdgeInsets.fromLTRB(
                                paddingLarge,
                                0,
                                paddingLarge,
                                paddingLarge,
                              ),
                              sliver: SliverList(
                                delegate: SliverChildBuilderDelegate(
                                  (context, index) {
                                    final holiday = _holidays[index];
                                    final isFirstInMonth = index == 0 ||
                                        _holidays[index - 1].date.month !=
                                            holiday.date.month;

                                    return Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        if (isFirstInMonth) ...[
                                          if (index > 0)
                                            const SizedBox(height: space6),
                                          Padding(
                                            padding: const EdgeInsets.only(
                                              left: paddingSmall,
                                              bottom: space3,
                                            ),
                                            child: Text(
                                              DateFormat('MMMM')
                                                  .format(holiday.date),
                                              style: app_typography.labelLarge
                                                  .copyWith(
                                                fontWeight: FontWeight.w600,
                                                color: textSecondary,
                                              ),
                                            ),
                                          ),
                                        ],
                                        Padding(
                                          padding: const EdgeInsets.only(
                                            bottom: gapMedium,
                                          ),
                                          child: _HolidayCard(holiday: holiday),
                                        ),
                                      ],
                                    );
                                  },
                                  childCount: _holidays.length,
                                ),
                              ),
                            ),
                    ],
                  ),
                ),
    );
  }
}

/// Year selector widget
class _YearSelector extends StatelessWidget {
  final int selectedYear;
  final ValueChanged<int> onYearChanged;

  const _YearSelector({
    required this.selectedYear,
    required this.onYearChanged,
  });

  @override
  Widget build(BuildContext context) {
    final currentYear = DateTime.now().year;
    final canGoNext = selectedYear < currentYear + 2;
    final canGoPrevious = selectedYear > currentYear - 5;

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: paddingMedium,
        vertical: paddingSmall,
      ),
      decoration: BoxDecoration(
        color: backgroundSecondary,
        borderRadius: BorderRadius.circular(radiusMedium),
        border: Border.all(color: borderColor, width: 1),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            onPressed: canGoPrevious ? () => onYearChanged(-1) : null,
            icon: const Icon(Icons.chevron_left),
            color: canGoPrevious ? primaryGreen : textSecondary,
          ),
          Text(
            '$selectedYear',
            style: app_typography.labelLarge.copyWith(
              fontWeight: FontWeight.w600,
              color: textPrimary,
            ),
          ),
          IconButton(
            onPressed: canGoNext ? () => onYearChanged(1) : null,
            icon: const Icon(Icons.chevron_right),
            color: canGoNext ? primaryGreen : textSecondary,
          ),
        ],
      ),
    );
  }
}

/// Holiday card widget
class _HolidayCard extends StatelessWidget {
  final Holiday holiday;

  const _HolidayCard({required this.holiday});

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('EEE, MMM d');
    final isUpcoming = holiday.isUpcoming;
    final isToday = holiday.isToday;

    return Container(
      padding: const EdgeInsets.all(paddingMedium),
      decoration: BoxDecoration(
        color: isToday
            ? primaryGreen.withValues(alpha: 0.1)
            : backgroundSecondary,
        borderRadius: BorderRadius.circular(radiusMedium),
        border: Border.all(
          color: isToday ? primaryGreen : borderColor,
          width: isToday ? 2 : 1,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Date badge
          Container(
            width: 60,
            padding: const EdgeInsets.symmetric(
              horizontal: paddingSmall,
              vertical: paddingSmall,
            ),
            decoration: BoxDecoration(
              color: isToday
                  ? primaryGreen
                  : isUpcoming
                      ? infoBackground
                      : textSecondary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(radiusSmall),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '${holiday.date.day}',
                  style: app_typography.headingMedium.copyWith(
                    fontWeight: FontWeight.bold,
                    color: isToday
                        ? Colors.white
                        : isUpcoming
                            ? Colors.white
                            : textSecondary,
                  ),
                ),
                Text(
                  DateFormat('MMM').format(holiday.date).toUpperCase(),
                  style: app_typography.labelSmall.copyWith(
                    fontWeight: FontWeight.w600,
                    color: isToday
                        ? Colors.white
                        : isUpcoming
                            ? Colors.white
                            : textSecondary,
                    fontSize: 10,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: gapMedium),

          // Content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        holiday.name,
                        style: app_typography.labelLarge.copyWith(
                          fontWeight: FontWeight.w600,
                          color: textPrimary,
                        ),
                      ),
                    ),
                    if (isToday)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: paddingSmall,
                          vertical: space1,
                        ),
                        decoration: BoxDecoration(
                          color: primaryGreen,
                          borderRadius: BorderRadius.circular(radiusSmall),
                        ),
                        child: Text(
                          'Today',
                          style: app_typography.labelSmall.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                            fontSize: 10,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: space1),
                Text(
                  dateFormat.format(holiday.date),
                  style: app_typography.bodySmall.copyWith(
                    color: textSecondary,
                  ),
                ),
                if (holiday.description != null &&
                    holiday.description!.isNotEmpty) ...[
                  const SizedBox(height: space2),
                  Text(
                    holiday.description!,
                    style: app_typography.bodySmall.copyWith(
                      color: textSecondary,
                      fontStyle: FontStyle.italic,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                if (isUpcoming && !isToday) ...[
                  const SizedBox(height: space2),
                  Row(
                    children: [
                      Icon(
                        Icons.schedule,
                        size: iconSizeSmall,
                        color: infoBackground,
                      ),
                      const SizedBox(width: gapSmall),
                      Text(
                        _getDaysUntilText(holiday.daysUntil),
                        style: app_typography.bodySmall.copyWith(
                          color: infoBackground,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),

          // Type badge
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: paddingSmall,
              vertical: space1,
            ),
            decoration: BoxDecoration(
              color: _getTypeColor(holiday.type).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(radiusSmall),
              border: Border.all(
                color: _getTypeColor(holiday.type),
                width: 1,
              ),
            ),
            child: Text(
              _formatType(holiday.type),
              style: app_typography.labelSmall.copyWith(
                color: _getTypeColor(holiday.type),
                fontWeight: FontWeight.w600,
                fontSize: 10,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _getDaysUntilText(int days) {
    if (days == 0) return 'Today';
    if (days == 1) return 'Tomorrow';
    if (days < 7) return 'in $days days';
    if (days < 30) return 'in ${(days / 7).floor()} weeks';
    return 'in ${(days / 30).floor()} months';
  }

  Color _getTypeColor(String type) {
    switch (type.toLowerCase()) {
      case 'public':
        return primaryGreen;
      case 'company':
        return infoBackground;
      case 'optional':
        return warningBackground;
      default:
        return textSecondary;
    }
  }

  String _formatType(String type) {
    return type[0].toUpperCase() + type.substring(1).toLowerCase();
  }
}
