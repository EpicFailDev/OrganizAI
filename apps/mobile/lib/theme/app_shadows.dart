import 'package:flutter/material.dart';
import 'app_colors.dart';

abstract final class AppShadows {
  static List<BoxShadow> get card => [
    BoxShadow(color: Colors.black.withValues(alpha: 0.15), blurRadius: 12, offset: const Offset(0, 4)),
  ];
  static List<BoxShadow> get elevated => [
    BoxShadow(color: Colors.black.withValues(alpha: 0.25), blurRadius: 20, offset: const Offset(0, 8)),
  ];
  static List<BoxShadow> get glow => [
    BoxShadow(color: AppColors.primary.withValues(alpha: 0.15), blurRadius: 24, offset: const Offset(0, 4)),
  ];
}
