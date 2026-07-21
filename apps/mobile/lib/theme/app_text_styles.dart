import 'package:flutter/material.dart';
import 'app_colors.dart';

abstract final class AppTextStyles {
  // Outfit (Headings / Display)
  static const displayLarge = TextStyle(
    fontFamily: 'Outfit', fontSize: 32, fontWeight: FontWeight.bold, color: AppColors.textPrimary,
  );
  static const displayMedium = TextStyle(
    fontFamily: 'Outfit', fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.textPrimary,
  );
  static const displaySmall = TextStyle(
    fontFamily: 'Outfit', fontSize: 20, fontWeight: FontWeight.w600, color: AppColors.textPrimary,
  );
  static const headlineLarge = TextStyle(
    fontFamily: 'Outfit', fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.textPrimary,
  );
  static const headlineMedium = TextStyle(
    fontFamily: 'Outfit', fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textPrimary,
  );

  // Inter (Body / Labels)
  static const bodyLarge = TextStyle(
    fontFamily: 'Inter', fontSize: 16, color: AppColors.textPrimary,
  );
  static const bodyMedium = TextStyle(
    fontFamily: 'Inter', fontSize: 14, color: AppColors.textSecondary,
  );
  static const bodySmall = TextStyle(
    fontFamily: 'Inter', fontSize: 12, color: AppColors.textTertiary,
  );
  static const labelLarge = TextStyle(
    fontFamily: 'Inter', fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary,
  );
  static const labelMedium = TextStyle(
    fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.textSecondary,
  );
  static const labelSmall = TextStyle(
    fontFamily: 'Inter', fontSize: 10, fontWeight: FontWeight.w500, color: AppColors.textTertiary,
  );

  // Semantic
  static const kpiValue = TextStyle(
    fontFamily: 'Outfit', fontSize: 28, fontWeight: FontWeight.bold,
  );
  static const kpiValueSmall = TextStyle(
    fontFamily: 'Outfit', fontSize: 22, fontWeight: FontWeight.bold,
  );
  static const kpiLabel = TextStyle(
    fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.textTertiary,
  );
}
