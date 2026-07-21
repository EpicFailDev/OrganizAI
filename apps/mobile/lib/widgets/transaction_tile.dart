import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
import '../theme/app_spacing.dart';

class TransactionTile extends StatelessWidget {
  final String description;
  final String categoryName;
  final DateTime date;
  final double amount;
  final bool isIncome;
  final VoidCallback? onReceiptTap;
  final VoidCallback? onDeleteTap;
  final bool showReceipt;

  const TransactionTile({
    super.key,
    required this.description,
    required this.categoryName,
    required this.date,
    required this.amount,
    required this.isIncome,
    this.onReceiptTap,
    this.onDeleteTap,
    this.showReceipt = false,
  });

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.simpleCurrency(locale: 'pt_BR');
    final color = isIncome ? AppColors.income : AppColors.expense;
    final bgColor = isIncome ? AppColors.incomeBg : AppColors.expenseBg;

    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      child: Material(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.surfaceBorder),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(color: bgColor, shape: BoxShape.circle),
                child: Icon(
                  isIncome ? Icons.arrow_upward : Icons.arrow_downward,
                  color: color,
                  size: 20,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      description,
                      style: AppTextStyles.bodyLarge.copyWith(fontWeight: FontWeight.w600),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '$categoryName \u2022 ${DateFormat('dd/MM/yyyy').format(date)}',
                      style: AppTextStyles.bodySmall,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    currencyFormat.format(amount),
                    style: AppTextStyles.bodyLarge.copyWith(
                      fontWeight: FontWeight.bold,
                      color: color,
                    ),
                  ),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (showReceipt)
                        GestureDetector(
                          onTap: onReceiptTap,
                          child: Icon(Icons.image_outlined, size: 18, color: AppColors.secondary),
                        ),
                      if (showReceipt) const SizedBox(width: 4),
                      if (onDeleteTap != null)
                        GestureDetector(
                          onTap: onDeleteTap,
                          child: Icon(Icons.delete_outline, size: 18, color: AppColors.expense),
                        ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
