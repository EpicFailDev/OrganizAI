import 'package:flutter/material.dart';
import '../theme/app_text_styles.dart';
import '../theme/app_spacing.dart';

class SectionHeader extends StatelessWidget {
  final String title;
  final Widget? action;

  const SectionHeader({
    super.key,
    required this.title,
    this.action,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title, style: AppTextStyles.headlineMedium),
          if (action != null) action!,
        ],
      ),
    );
  }
}
