import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import '../theme/app_radius.dart';

class ToggleSelector extends StatelessWidget {
  final String value;
  final ValueChanged<String> onChanged;

  const ToggleSelector({
    super.key,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final isExpense = value == 'expense';

    return Row(
      children: [
        Expanded(
          child: _ToggleOption(
            label: 'Despesa',
            icon: Icons.arrow_downward,
            isSelected: isExpense,
            selectedColor: AppColors.expense,
            selectedBg: AppColors.expenseBg,
            onTap: () => onChanged('expense'),
          ),
        ),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: _ToggleOption(
            label: 'Receita',
            icon: Icons.arrow_upward,
            isSelected: !isExpense,
            selectedColor: AppColors.income,
            selectedBg: AppColors.incomeBg,
            onTap: () => onChanged('income'),
          ),
        ),
      ],
    );
  }
}

class _ToggleOption extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool isSelected;
  final Color selectedColor;
  final Color selectedBg;
  final VoidCallback onTap;

  const _ToggleOption({
    required this.label,
    required this.icon,
    required this.isSelected,
    required this.selectedColor,
    required this.selectedBg,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeInOut,
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: isSelected ? selectedBg : Colors.transparent,
          borderRadius: AppRadius.mdAll,
          border: Border.all(
            color: isSelected ? selectedColor : AppColors.surfaceBorder,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 18, color: isSelected ? selectedColor : AppColors.textDisabled),
            const SizedBox(width: AppSpacing.sm),
            Text(
              label,
              style: TextStyle(
                fontFamily: 'Inter',
                fontWeight: FontWeight.w600,
                fontSize: 14,
                color: isSelected ? selectedColor : AppColors.textDisabled,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
