import 'package:flutter/material.dart';

abstract final class AppColors {
  // Backgrounds
  static const background = Color(0xFF0A1A14);
  static const surface = Color(0xFF122A21);
  static const surfaceVariant = Color(0xFF1A3529);
  static const surfaceBorder = Color(0xFF2A4A3D);

  // Primary (Green spectrum)
  static const primary = Color(0xFF34D399);
  static const primaryDark = Color(0xFF10B981);
  static const primaryMuted = Color(0xFF065F46);

  // Hero gradient
  static const heroGradientStart = Color(0xFF1A3A2C);
  static const heroGradientEnd = Color(0xFF0D2418);
  static const heroBorder = Color(0xFF2A5A42);

  // Secondary
  static const secondary = Color(0xFF818CF8);

  // Semantic: Income / Expense
  static const income = Color(0xFF34D399);
  static const incomeBg = Color(0xFF065F46);
  static const expense = Color(0xFFF87171);
  static const expenseBg = Color(0xFF7F1D1D);

  // Savings / Economy
  static const savings = Color(0xFF60A5FA);
  static const savingsBg = Color(0xFF1E3A5F);

  // Goal
  static const goal = Color(0xFFFBBF24);
  static const goalBg = Color(0xFF78350F);

  // Neutrals
  static const textPrimary = Color(0xFFFFFFFF);
  static const textSecondary = Color(0xFF94A3B8);
  static const textTertiary = Color(0xFF64748B);
  static const textDisabled = Color(0xFF475569);

  // Misc
  static const divider = Color(0xFF1E3A2F);
  static const white = Color(0xFFFFFFFF);
  static const black = Color(0xFF000000);

  // Chart line
  static const chartLine = Color(0xFF34D399);
  static const chartFill = Color(0x3334D399);
}
