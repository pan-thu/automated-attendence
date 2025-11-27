import 'package:flutter/material.dart';

/// Bug Fix #32: Skeleton loading screens for better UX
///
/// Provides skeleton loading components that match the structure of actual content,
/// giving users visual feedback that content is loading.

/// Base skeleton container with shimmer animation
class SkeletonBox extends StatefulWidget {
  final double? width;
  final double? height;
  final BorderRadius? borderRadius;

  const SkeletonBox({
    super.key,
    this.width,
    this.height,
    this.borderRadius,
  });

  @override
  State<SkeletonBox> createState() => _SkeletonBoxState();
}

class _SkeletonBoxState extends State<SkeletonBox>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    )..repeat();

    _animation = Tween<double>(begin: -1.0, end: 2.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            borderRadius: widget.borderRadius ?? BorderRadius.circular(4),
            gradient: LinearGradient(
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
              colors: [
                Colors.grey[300]!,
                Colors.grey[200]!,
                Colors.grey[300]!,
              ],
              stops: [
                _animation.value - 0.3,
                _animation.value,
                _animation.value + 0.3,
              ].map((e) => e.clamp(0.0, 1.0)).toList(),
            ),
          ),
        );
      },
    );
  }
}

/// Skeleton for dashboard card
class DashboardCardSkeleton extends StatelessWidget {
  const DashboardCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SkeletonBox(
              width: 120,
              height: 16,
              borderRadius: BorderRadius.circular(4),
            ),
            const SizedBox(height: 12),
            SkeletonBox(
              width: double.infinity,
              height: 48,
              borderRadius: BorderRadius.circular(8),
            ),
            const SizedBox(height: 8),
            SkeletonBox(
              width: 80,
              height: 14,
              borderRadius: BorderRadius.circular(4),
            ),
          ],
        ),
      ),
    );
  }
}

/// Skeleton for attendance history calendar
class AttendanceCalendarSkeleton extends StatelessWidget {
  const AttendanceCalendarSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Month/Year header
        SkeletonBox(
          width: 150,
          height: 24,
          borderRadius: BorderRadius.circular(4),
        ),
        const SizedBox(height: 16),
        // Calendar grid
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 7,
            childAspectRatio: 1,
            crossAxisSpacing: 8,
            mainAxisSpacing: 8,
          ),
          itemCount: 35, // 5 weeks
          itemBuilder: (context, index) {
            return SkeletonBox(
              borderRadius: BorderRadius.circular(8),
            );
          },
        ),
      ],
    );
  }
}

/// Skeleton for list items (leaves, penalties, notifications)
class ListItemSkeleton extends StatelessWidget {
  final bool showTrailing;

  const ListItemSkeleton({
    super.key,
    this.showTrailing = true,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: SkeletonBox(
          width: 40,
          height: 40,
          borderRadius: BorderRadius.circular(20),
        ),
        title: SkeletonBox(
          width: double.infinity,
          height: 16,
          borderRadius: BorderRadius.circular(4),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 8.0),
          child: SkeletonBox(
            width: 150,
            height: 14,
            borderRadius: BorderRadius.circular(4),
          ),
        ),
        trailing: showTrailing
            ? SkeletonBox(
                width: 60,
                height: 24,
                borderRadius: BorderRadius.circular(12),
              )
            : null,
      ),
    );
  }
}

/// Skeleton for complete list view
class ListViewSkeleton extends StatelessWidget {
  final int itemCount;
  final bool showTrailing;

  const ListViewSkeleton({
    super.key,
    this.itemCount = 5,
    this.showTrailing = true,
  });

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: itemCount,
      itemBuilder: (context, index) {
        return ListItemSkeleton(showTrailing: showTrailing);
      },
    );
  }
}

/// Skeleton for employee/user profile card
class ProfileCardSkeleton extends StatelessWidget {
  const ProfileCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Profile picture and name
            Row(
              children: [
                SkeletonBox(
                  width: 64,
                  height: 64,
                  borderRadius: BorderRadius.circular(32),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SkeletonBox(
                        width: double.infinity,
                        height: 20,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      const SizedBox(height: 8),
                      SkeletonBox(
                        width: 120,
                        height: 16,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            // Details rows
            ...List.generate(4, (index) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 12.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    SkeletonBox(
                      width: 80,
                      height: 14,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    SkeletonBox(
                      width: 120,
                      height: 14,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}

/// Skeleton for statistics/metrics row
class MetricsRowSkeleton extends StatelessWidget {
  final int itemCount;

  const MetricsRowSkeleton({
    super.key,
    this.itemCount = 3,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: List.generate(itemCount, (index) {
        return Expanded(
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  SkeletonBox(
                    width: 40,
                    height: 40,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  const SizedBox(height: 8),
                  SkeletonBox(
                    width: 60,
                    height: 24,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  const SizedBox(height: 4),
                  SkeletonBox(
                    width: 80,
                    height: 14,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ],
              ),
            ),
          ),
        );
      }),
    );
  }
}

/// Skeleton for form fields
class FormFieldSkeleton extends StatelessWidget {
  const FormFieldSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SkeletonBox(
          width: 100,
          height: 14,
          borderRadius: BorderRadius.circular(4),
        ),
        const SizedBox(height: 8),
        SkeletonBox(
          width: double.infinity,
          height: 48,
          borderRadius: BorderRadius.circular(8),
        ),
      ],
    );
  }
}

/// Skeleton for text blocks
class TextBlockSkeleton extends StatelessWidget {
  final int lineCount;

  const TextBlockSkeleton({
    super.key,
    this.lineCount = 3,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: List.generate(lineCount, (index) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 8.0),
          child: SkeletonBox(
            width: index == lineCount - 1 ? 200 : double.infinity,
            height: 14,
            borderRadius: BorderRadius.circular(4),
          ),
        );
      }),
    );
  }
}
