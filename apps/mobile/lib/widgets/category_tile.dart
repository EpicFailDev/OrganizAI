import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
import '../theme/app_spacing.dart';

class CategoryTile extends StatelessWidget {
  final String name;
  final String type;
  final Color color;
  final bool isGlobal;
  final VoidCallback? onDelete;

  const CategoryTile({
    super.key,
    required this.name,
    required this.type,
    required this.color,
    required this.isGlobal,
    this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.xs),
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
                width: 16,
                height: 16,
                decoration: BoxDecoration(color: color, shape: BoxShape.circle),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name, style: AppTextStyles.bodyLarge.copyWith(fontWeight: FontWeight.w500)),
                    const SizedBox(height: 2),
                    Text(
                      type == 'income' ? 'Receita' : 'Despesa',
                      style: AppTextStyles.labelSmall,
                    ),
                  ],
                ),
              ),
              if (!isGlobal && onDelete != null)
                GestureDetector(
                  onTap: onDelete,
                  child: Icon(Icons.delete_outline, size: 20, color: AppColors.expense),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
