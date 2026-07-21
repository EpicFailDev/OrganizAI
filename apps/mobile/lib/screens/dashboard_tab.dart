import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
import '../theme/app_spacing.dart';
import '../providers/transaction_provider.dart';
import '../widgets/dark_card.dart';
import '../widgets/kpi_card.dart';
import '../widgets/skeleton_loader.dart';
import '../animations/fade_slide_transition.dart';

class DashboardTab extends ConsumerWidget {
  const DashboardTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final txState = ref.watch(transactionProvider);

    return txState.when(
      loading: () => const _SkeletonDashboard(),
      error: (e, _) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppColors.expense),
            const SizedBox(height: 16),
            Text('Erro ao carregar dados', style: AppTextStyles.bodyLarge),
            const SizedBox(height: 8),
            ElevatedButton(
              onPressed: () => ref.invalidate(transactionProvider),
              child: const Text('Tentar novamente'),
            ),
          ],
        ),
      ),
      data: (state) {
        final hasExpense = state.totalExpense > 0;
        final chartSections = _getChartSections(state);
        final chartKeys = _getChartKeys(state);

        return RefreshIndicator(
          onRefresh: () => ref.read(transactionProvider.notifier).refresh(),
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                FadeSlideTransition(
                  delay: Duration.zero,
                  child: Text(
                    'Bem-vindo!',
                    style: AppTextStyles.displayMedium.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.xxl),

                FadeSlideTransition(
                  delay: const Duration(milliseconds: 100),
                  child: Row(
                    children: [
                      Expanded(
                        child: KpiCard(
                          label: 'Receitas',
                          value: state.totalIncome,
                          valueColor: AppColors.income,
                          icon: Icons.trending_up,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: KpiCard(
                          label: 'Despesas',
                          value: state.totalExpense,
                          valueColor: AppColors.expense,
                          icon: Icons.trending_down,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.md),

                FadeSlideTransition(
                  delay: const Duration(milliseconds: 200),
                  child: KpiCard(
                    label: 'Saldo Atual',
                    value: state.balance,
                    valueColor: state.balance >= 0
                        ? AppColors.textPrimary
                        : AppColors.expense,
                    icon: Icons.wallet,
                    isLarge: true,
                  ),
                ),
                const SizedBox(height: AppSpacing.xxl),

                FadeSlideTransition(
                  delay: const Duration(milliseconds: 300),
                  child: DarkCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Despesas por Categoria',
                          style: AppTextStyles.headlineMedium,
                        ),
                        const SizedBox(height: AppSpacing.xl),
                        if (!hasExpense)
                          const SizedBox(
                            height: 150,
                            child: Center(
                              child: Text(
                                'Nenhuma despesa para exibir.',
                                style: AppTextStyles.bodySmall,
                              ),
                            ),
                          )
                        else
                          Row(
                            children: [
                              SizedBox(
                                width: 140,
                                height: 140,
                                child: PieChart(
                                  PieChartData(
                                    sections: chartSections,
                                    centerSpaceRadius: 35,
                                    sectionsSpace: 2,
                                  ),
                                ),
                              ),
                              const SizedBox(width: AppSpacing.xl),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: chartKeys,
                                ),
                              ),
                            ],
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  List<PieChartSectionData> _getChartSections(TransactionState state) {
    if (state.totalExpense == 0) return [];

    final Map<String, double> categorySums = {};
    final Map<String, String> categoryColors = {};

    for (final t in state.transactions) {
      if (!t.isIncome) {
        final catName = t.category?.name ?? 'Outros';
        categorySums[catName] = (categorySums[catName] ?? 0) + t.amount;
        categoryColors[catName] = t.category?.color ?? '#9E9E9E';
      }
    }

    return categorySums.entries.map((entry) {
      final percentage = (entry.value / state.totalExpense) * 100;
      final colorHex = categoryColors[entry.key]!;
      final color = Color(int.parse(colorHex.replaceFirst('#', '0xFF')));

      return PieChartSectionData(
        color: color,
        value: entry.value,
        title: '${percentage.toStringAsFixed(0)}%',
        radius: 40,
        titleStyle: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: AppColors.white,
        ),
      );
    }).toList();
  }

  List<Widget> _getChartKeys(TransactionState state) {
    final Map<String, String> categoryColors = {};
    for (final t in state.transactions) {
      if (!t.isIncome) {
        final catName = t.category?.name ?? 'Outros';
        categoryColors[catName] = t.category?.color ?? '#9E9E9E';
      }
    }

    return categoryColors.entries.map((entry) {
      final color = Color(int.parse(entry.value.replaceFirst('#', '0xFF')));
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 4.0),
        child: Row(
          children: [
            Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            const SizedBox(width: 8),
            Text(
              entry.key,
              style: AppTextStyles.bodySmall.copyWith(
                color: AppColors.textPrimary,
              ),
            ),
          ],
        ),
      );
    }).toList();
  }
}

class _SkeletonDashboard extends StatelessWidget {
  const _SkeletonDashboard();

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          const SkeletonLoader(width: 120, height: 24),
          const SizedBox(height: 24),
          const Row(
            children: [
              Expanded(child: SkeletonLoader(height: 90)),
              SizedBox(width: 12),
              Expanded(child: SkeletonLoader(height: 90)),
            ],
          ),
          const SizedBox(height: 12),
          const SkeletonLoader(width: double.infinity, height: 90),
          const SizedBox(height: 24),
          const SkeletonLoader(width: double.infinity, height: 200),
        ],
      ),
    );
  }
}
