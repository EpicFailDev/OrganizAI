import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
import '../theme/app_spacing.dart';
import '../theme/app_radius.dart';

class KpiCard extends StatelessWidget {
  final String label;
  final double value;
  final Color valueColor;
  final IconData icon;
  final bool isLarge;

  const KpiCard({
    super.key,
    required this.label,
    required this.value,
    required this.valueColor,
    required this.icon,
    this.isLarge = false,
  });

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.simpleCurrency(locale: 'pt_BR');

    return Container(
      padding: EdgeInsets.all(isLarge ? AppSpacing.xl : AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: AppRadius.lgAll,
        border: Border.all(color: AppColors.surfaceBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: AppTextStyles.kpiLabel),
              Icon(icon, size: 18, color: valueColor),
            ],
          ),
          SizedBox(height: isLarge ? AppSpacing.md : AppSpacing.sm),
          Text(
            currencyFormat.format(value),
            style: (isLarge ? AppTextStyles.kpiValue : AppTextStyles.kpiValueSmall)
                .copyWith(color: valueColor),
          ),
        ],
      ),
    );
  }
}
