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
          style: app_typography.headingLarge.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        backgroundColor: backgroundPrimary,
        elevation: 0,
        centerTitle: true,
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
                  child: ListView(
                    padding: const EdgeInsets.all(paddingLarge),
                    children: [
                      // Year selector
                      _YearSelector(
                        selectedYear: _selectedYear,
                        onYearChanged: _changeYear,
                      ),
                      const SizedBox(height: space6),

                      // Holiday list by month
                      if (_holidays.isEmpty)
                        EmptyState(
                          icon: Icons.event_busy,
                          title: 'No Holidays',
                          message: 'No holidays found for $_selectedYear.',
                        )
                      else
                        ..._buildHolidayList(),
                    ],
                  ),
                ),
    );
  }

  List<Widget> _buildHolidayList() {
    final widgets = <Widget>[];

    // Count unique months to determine if we need dividers
    final uniqueMonths = _holidays
        .map((h) => '${h.date.year}-${h.date.month}')
        .toSet()
        .length;
    final hasMultipleMonths = uniqueMonths > 1;

    for (var i = 0; i < _holidays.length; i++) {
      final holiday = _holidays[i];
      final isFirstInMonth = i == 0 ||
          _holidays[i - 1].date.month != holiday.date.month;

      if (isFirstInMonth) {
        // Add divider before new month (except for the first month)
        if (i > 0 && hasMultipleMonths) {
          widgets.add(const SizedBox(height: space4));
          widgets.add(
            Divider(
              color: textSecondary.withOpacity(0.3),
              thickness: 1,
            ),
          );
          widgets.add(const SizedBox(height: space4));
        }

        // Month header
        widgets.add(
          Padding(
            padding: const EdgeInsets.only(bottom: space4),
            child: Text(
              DateFormat('MMMM yyyy').format(holiday.date),
              style: app_typography.headingSmall.copyWith(
                fontWeight: FontWeight.bold,
                color: textPrimary,
              ),
            ),
          ),
        );
      }

      widgets.add(
        Padding(
          padding: const EdgeInsets.only(bottom: gapMedium),
          child: _HolidayCard(holiday: holiday),
        ),
      );
    }

    return widgets;
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
        color: const Color(0xFFE8E8E8),
        borderRadius: BorderRadius.circular(radiusLarge * 1.5),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            onPressed: canGoPrevious ? () => onYearChanged(-1) : null,
            icon: const Icon(Icons.chevron_left),
            color: canGoPrevious ? textPrimary : textSecondary,
          ),
          Text(
            '$selectedYear',
            style: app_typography.headingMedium.copyWith(
              fontWeight: FontWeight.bold,
              color: textPrimary,
            ),
          ),
          IconButton(
            onPressed: canGoNext ? () => onYearChanged(1) : null,
            icon: const Icon(Icons.chevron_right),
            color: canGoNext ? textPrimary : textSecondary,
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
    final isToday = holiday.isToday;
    final gradient = _getGradient(holiday.type, isToday);

    return Container(
      decoration: BoxDecoration(
        gradient: gradient,
        borderRadius: BorderRadius.circular(radiusLarge * 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(radiusLarge * 1.5),
          onTap: () {}, // Optional: Add detail view
          child: Padding(
            padding: const EdgeInsets.all(paddingMedium),
            child: Row(
              children: [
                // Icon with background
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.25),
                    borderRadius: BorderRadius.circular(radiusLarge),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        '${holiday.date.day}',
                        style: app_typography.headingMedium.copyWith(
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                          fontSize: 24,
                        ),
                      ),
                      Text(
                        DateFormat('MMM').format(holiday.date).toUpperCase(),
                        style: app_typography.labelSmall.copyWith(
                          fontWeight: FontWeight.w600,
                          color: Colors.white.withOpacity(0.9),
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
                              style: app_typography.bodyLarge.copyWith(
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (isToday)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: paddingSmall,
                                vertical: space1,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(radiusSmall),
                              ),
                              child: Text(
                                'TODAY',
                                style: app_typography.labelSmall.copyWith(
                                  color: _getTypeGradientStartColor(holiday.type),
                                  fontWeight: FontWeight.w700,
                                  fontSize: 10,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: space1),
                      Text(
                        DateFormat('EEEE').format(holiday.date),
                        style: app_typography.bodyMedium.copyWith(
                          color: Colors.white.withOpacity(0.9),
                        ),
                      ),
                      if (holiday.description != null &&
                          holiday.description!.isNotEmpty) ...[
                        const SizedBox(height: space1),
                        Text(
                          holiday.description!,
                          style: app_typography.bodySmall.copyWith(
                            color: Colors.white.withOpacity(0.8),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: gapSmall),

                // Type badge
                Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      _getHolidayIcon(holiday.type),
                      color: Colors.white,
                      size: iconSizeMedium,
                    ),
                    const SizedBox(height: space1),
                    Text(
                      _formatType(holiday.type),
                      style: app_typography.labelSmall.copyWith(
                        color: Colors.white.withOpacity(0.9),
                        fontWeight: FontWeight.w600,
                        fontSize: 9,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Gradient _getGradient(String type, bool isToday) {
    if (isToday) {
      return const LinearGradient(
        colors: [Color(0xFFf43b47), Color(0xFF453a94)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      );
    }

    switch (type.toLowerCase()) {
      case 'public':
        return const LinearGradient(
          colors: [Color(0xFF56ab2f), Color(0xFFa8e063)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
      case 'company':
        return const LinearGradient(
          colors: [Color(0xFFeb3349), Color(0xFFf45c43)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
      case 'optional':
        return const LinearGradient(
          colors: [Color(0xFFffd89b), Color(0xFF19547b)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
      default:
        return const LinearGradient(
          colors: [Color(0xFF757F9A), Color(0xFFD7DDE8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
    }
  }

  Color _getTypeGradientStartColor(String type) {
    switch (type.toLowerCase()) {
      case 'public':
        return const Color(0xFF56ab2f);
      case 'company':
        return const Color(0xFFeb3349);
      case 'optional':
        return const Color(0xFF19547b);
      default:
        return const Color(0xFF757F9A);
    }
  }

  IconData _getHolidayIcon(String type) {
    switch (type.toLowerCase()) {
      case 'public':
        return Icons.public;
      case 'company':
        return Icons.business;
      case 'optional':
        return Icons.event_available;
      default:
        return Icons.celebration;
    }
  }

  String _formatType(String type) {
    return type[0].toUpperCase() + type.substring(1).toLowerCase();
  }
}
