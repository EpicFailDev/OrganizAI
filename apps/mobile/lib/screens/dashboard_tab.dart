import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart' as riverpod;
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
import '../theme/app_spacing.dart';
import '../theme/app_radius.dart';
import '../models/transaction.dart';
import '../models/recurring_bill.dart';
import '../providers/transaction_provider.dart';
import '../providers/recurring_bill_provider.dart';
import '../widgets/dark_card.dart';
import '../widgets/kpi_card.dart';
import '../widgets/balance_hero_card.dart';
import '../widgets/skeleton_loader.dart';
import '../animations/fade_slide_transition.dart';

class DashboardTab extends riverpod.ConsumerStatefulWidget {
  final ValueChanged<int>? onNavigateToTab;
  const DashboardTab({super.key, this.onNavigateToTab});

  @override
  riverpod.ConsumerState<DashboardTab> createState() => _DashboardTabState();
}

class _DashboardTabState extends riverpod.ConsumerState<DashboardTab> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      // Ensure recurring bills are loaded
      ref.read(recurringBillProvider.notifier).ensureLoaded();
    });
  }

  @override
  Widget build(BuildContext context) {
    final txState = ref.watch(transactionProvider);

    // ensureLoaded é chamado apenas no initState (post-frame) para evitar
    // "modify provider while building". Aqui só observamos o state para
    // recompor a UI quando ele mudar.
    ref.watch(recurringBillProvider);

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

        // Recent transactions (last 3)
        final recentTx = List.of(state.transactions)
          ..sort((a, b) => b.date.compareTo(a.date));
        final lastThree = recentTx.take(3).toList();

        return RefreshIndicator(
          onRefresh: () => ref.read(transactionProvider.notifier).refresh(),
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Hero balance card
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                  child: BalanceHeroCard(
                    balance: state.balance,
                    totalIncome: state.totalIncome,
                    totalExpense: state.totalExpense,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),

                // 4 KPIs in a single card
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                  child: FadeSlideTransition(
                    delay: const Duration(milliseconds: 150),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8F9FA),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: const Color(0xFFE8EAED),
                          width: 0.5,
                        ),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: KpiCard(
                              label: 'Entradas',
                              value: state.totalIncome,
                              valueColor: const Color(0xFF16A34A),
                              iconBgColor: const Color(0xFF22C55E),
                              icon: Icons.arrow_downward,
                              changePercent: 8,
                            ),
                          ),
                          Expanded(
                            child: KpiCard(
                              label: 'Saídas',
                              value: state.totalExpense,
                              valueColor: const Color(0xFFDC2626),
                              iconBgColor: const Color(0xFFEF4444),
                              icon: Icons.arrow_upward,
                              changePercent: -5,
                            ),
                          ),
                          Expanded(
                            child: KpiCard(
                              label: 'Economia',
                              value: state.balance > 0 ? state.balance : 0,
                              valueColor: const Color(0xFF7C3AED),
                              iconBgColor: const Color(0xFF8B5CF6),
                              icon: Icons.leaderboard,
                              changePercent: 12,
                            ),
                          ),
                          Expanded(
                            child: _GoalKpi(
                              percent: state.totalIncome > 0
                                  ? (state.balance / state.totalIncome * 100)
                                      .clamp(0, 100)
                                  : 0,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.xxl),

                // Distribution + Budget row
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                  child: FadeSlideTransition(
                    delay: const Duration(milliseconds: 300),
                    child: IntrinsicHeight(
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Expense Distribution
                          Expanded(
                            child: _DistributionCard(
                              sections: chartSections,
                              keys: chartKeys,
                              hasData: hasExpense,
                              total: state.totalExpense,
                              onNavigateToTab: widget.onNavigateToTab,
                            ),
                          ),
                          const SizedBox(width: AppSpacing.md),
                          // Monthly Budget
                          Expanded(
                            child: _BudgetCard(
                              percent: state.totalIncome > 0
                                  ? (state.balance / state.totalIncome * 100)
                                      .clamp(0, 100)
                                  : 0,
                              onNavigateToTab: widget.onNavigateToTab,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.xxl),

                // Upcoming Bills
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                  child: FadeSlideTransition(
                    delay: const Duration(milliseconds: 400),
                    child: _UpcomingBillsCard(
                      transactions: state.transactions,
                      onNavigateToTab: widget.onNavigateToTab,
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.xxl),

                // Recent Transactions
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                  child: FadeSlideTransition(
                    delay: const Duration(milliseconds: 500),
                    child: _RecentTransactionsCard(
                      transactions: lastThree,
                      onNavigateToTab: widget.onNavigateToTab,
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.xxl),

                // Quick Actions
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                  child: FadeSlideTransition(
                    delay: const Duration(milliseconds: 600),
                    child: _QuickActionsRow(
                      onNavigateToTab: widget.onNavigateToTab,
                    ),
                  ),
                ),
                const SizedBox(height: 100), // space for bottom nav
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
        radius: 35,
        titleStyle: const TextStyle(
          fontSize: 10,
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
        padding: const EdgeInsets.symmetric(vertical: 3.0),
        child: Row(
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                entry.key,
                style: const TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 11,
                  color: Color(0xFF374151),
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      );
    }).toList();
  }
}

// ─── Distribution Card ──────────────────────────────────────

class _DistributionCard extends StatelessWidget {
  final List<PieChartSectionData> sections;
  final List<Widget> keys;
  final bool hasData;
  final double total;
  final ValueChanged<int>? onNavigateToTab;

  const _DistributionCard({
    required this.sections,
    required this.keys,
    required this.hasData,
    required this.total,
    this.onNavigateToTab,
  });

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.simpleCurrency(locale: 'pt_BR');

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF8F9FA),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE8EAED), width: 0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Title row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  'Distribuição de Gastos',
                  style: const TextStyle(
                    fontFamily: 'Outfit',
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1F2937),
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'Este mês',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 10,
                      color: Color(0xFF6B7280),
                    ),
                  ),
                  const SizedBox(width: 2),
                  const Icon(Icons.keyboard_arrow_down, size: 12, color: Color(0xFF9CA3AF)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (!hasData)
            const SizedBox(
              height: 140,
              child: Center(
                child: Text(
                  'Sem dados',
                  style: TextStyle(fontFamily: 'Inter', fontSize: 12, color: Color(0xFF9CA3AF)),
                ),
              ),
            )
          else
            // Chart + Legend row
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Donut chart with center text
                SizedBox(
                  width: 110,
                  height: 130,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      PieChart(
                        PieChartData(
                          sections: sections,
                          centerSpaceRadius: 30,
                          sectionsSpace: 2,
                        ),
                      ),
                      Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            currencyFormat.format(total),
                            style: const TextStyle(
                              fontFamily: 'Outfit',
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF1F2937),
                            ),
                          ),
                          const Text(
                            'Total',
                            style: TextStyle(
                              fontFamily: 'Inter',
                              fontSize: 9,
                              color: Color(0xFF9CA3AF),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                // Legend
                SizedBox(
                  height: 120,
                  child: ListView(
                    children: keys,
                  ),
                ),
              ],
            ),
          const SizedBox(height: 8),
          // Link
          GestureDetector(
            onTap: () => onNavigateToTab?.call(2),
            child: const Row(
              children: [
                Text(
                  'Ver relatório completo',
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 11,
                    color: Color(0xFF16A34A),
                  ),
                ),
                SizedBox(width: 4),
                Icon(Icons.arrow_forward, size: 12, color: Color(0xFF16A34A)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Budget Card ────────────────────────────────────────────

class _BudgetCard extends StatelessWidget {
  final double percent;
  final ValueChanged<int>? onNavigateToTab;

  const _BudgetCard({required this.percent, this.onNavigateToTab});

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.simpleCurrency(locale: 'pt_BR');
    final target = 4650.0;
    final spent = target * (percent / 100);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF8F9FA),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE8EAED), width: 0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Title row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Expanded(
                child: Text(
                  'Orçamento Mensal',
                  style: TextStyle(
                    fontFamily: 'Outfit',
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1F2937),
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              GestureDetector(
                onTap: () {},
                child: const Text(
                  'Editar meta',
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 10,
                    color: Color(0xFF16A34A),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Circular progress centered
          Center(
            child: SizedBox(
              width: 100,
              height: 100,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  SizedBox(
                    width: 100,
                    height: 100,
                    child: CircularProgressIndicator(
                      value: percent / 100,
                      strokeWidth: 10,
                      backgroundColor: const Color(0xFFE5E7EB),
                      valueColor: const AlwaysStoppedAnimation(Color(0xFF16A34A)),
                      strokeCap: StrokeCap.round,
                    ),
                  ),
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '${percent.toStringAsFixed(0)}%',
                        style: const TextStyle(
                          fontFamily: 'Outfit',
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1F2937),
                        ),
                      ),
                      Text(
                        currencyFormat.format(spent),
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 10,
                          color: Color(0xFF6B7280),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 4),
          Center(
            child: Text(
              'de ${currencyFormat.format(target)}',
              style: const TextStyle(
                fontFamily: 'Inter',
                fontSize: 9,
                color: Color(0xFF9CA3AF),
              ),
            ),
          ),
          const SizedBox(height: 10),
          // Motivational message
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFECFDF5),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Parabéns!',
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF16A34A),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Você está no caminho certo para alcançar sua meta.',
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 9,
                          color: const Color(0xFF6B7280),
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                const Text('🎯', style: TextStyle(fontSize: 20)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Upcoming Bills ─────────────────────────────────────────

class _UpcomingBillsCard extends StatelessWidget {
  final List<AppTransaction> transactions;
  final ValueChanged<int>? onNavigateToTab;

  const _UpcomingBillsCard({required this.transactions, this.onNavigateToTab});

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final expenses = transactions
        .where((t) => !t.isIncome && t.date.isAfter(now))
        .take(3)
        .toList();

    return Container(
      padding: const EdgeInsets.all(16),
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
              Text(
                'Próximas Contas',
                style: AppTextStyles.headlineMedium.copyWith(fontSize: 14),
              ),
              GestureDetector(
                onTap: () {},
                child: Text(
                  'Ver todas',
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.primary,
                    fontSize: 11,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (expenses.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Center(
                child: Text(
                  'Nenhuma conta pendente',
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.textTertiary,
                  ),
                ),
              ),
            )
          else
            ...expenses.map((tx) => _BillItem(transaction: tx)),
        ],
      ),
    );
  }
}

class _BillItem extends StatelessWidget {
  final AppTransaction transaction;

  const _BillItem({required this.transaction});

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.simpleCurrency(locale: 'pt_BR');
    final daysLeft = transaction.date.difference(DateTime.now()).inDays;
    final catName = transaction.category?.name ?? 'Conta';
    final icon = _getCategoryIcon(catName);
    final iconColor = _getCategoryColor(catName);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          // Icon
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: iconColor),
          ),
          const SizedBox(width: 12),
          // Name + due
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  transaction.description.isNotEmpty
                      ? transaction.description
                      : catName,
                  style: AppTextStyles.bodyLarge.copyWith(fontSize: 13),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  'Vence em $daysLeft dias',
                  style: AppTextStyles.bodySmall.copyWith(
                    fontSize: 11,
                    color: AppColors.textTertiary,
                  ),
                ),
              ],
            ),
          ),
          // Amount
          Text(
            currencyFormat.format(transaction.amount),
            style: AppTextStyles.bodyLarge.copyWith(
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  IconData _getCategoryIcon(String name) {
    final lower = name.toLowerCase();
    if (lower.contains('aluguel') || lower.contains('casa')) return Icons.home;
    if (lower.contains('energia') || lower.contains('luz')) return Icons.bolt;
    if (lower.contains('água') || lower.contains('agua')) return Icons.water_drop;
    if (lower.contains('mercado') || lower.contains('alimenta')) return Icons.shopping_cart;
    if (lower.contains('transporte') || lower.contains('combust')) return Icons.directions_car;
    return Icons.receipt;
  }

  Color _getCategoryColor(String name) {
    final lower = name.toLowerCase();
    if (lower.contains('aluguel') || lower.contains('casa')) return AppColors.expense;
    if (lower.contains('energia') || lower.contains('luz')) return AppColors.goal;
    if (lower.contains('água') || lower.contains('agua')) return AppColors.savings;
    return AppColors.textSecondary;
  }
}

// ─── Recent Transactions ────────────────────────────────────

class _RecentTransactionsCard extends StatelessWidget {
  final List<AppTransaction> transactions;
  final ValueChanged<int>? onNavigateToTab;

  const _RecentTransactionsCard({required this.transactions, this.onNavigateToTab});

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.simpleCurrency(locale: 'pt_BR');

    return Container(
      padding: const EdgeInsets.all(16),
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
              Text(
                'Últimas Transações',
                style: AppTextStyles.headlineMedium.copyWith(fontSize: 14),
              ),
              GestureDetector(
                onTap: () {},
                child: Text(
                  'Ver todas',
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.primary,
                    fontSize: 11,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (transactions.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Center(
                child: Text(
                  'Nenhuma transação',
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.textTertiary,
                  ),
                ),
              ),
            )
          else
            ...transactions.map((tx) => _TransactionItem(
                  transaction: tx,
                  currencyFormat: currencyFormat,
                )),
        ],
      ),
    );
  }
}

class _TransactionItem extends StatelessWidget {
  final AppTransaction transaction;
  final NumberFormat currencyFormat;

  const _TransactionItem({
    required this.transaction,
    required this.currencyFormat,
  });

  @override
  Widget build(BuildContext context) {
    final isIncome = transaction.isIncome;
    final catName = transaction.category?.name ?? '';
    final icon = _getCategoryIcon(catName);
    final iconColor = isIncome ? AppColors.income : AppColors.expense;
    final timeStr = DateFormat('HH:mm').format(transaction.date);
    final dateStr = transaction.date.day == DateTime.now().day
        ? 'Hoje, $timeStr'
        : 'Ontem, $timeStr';

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          // Icon
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: iconColor),
          ),
          const SizedBox(width: 12),
          // Name + category + time
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  transaction.description.isNotEmpty
                      ? transaction.description
                      : catName,
                  style: AppTextStyles.bodyLarge.copyWith(fontSize: 13),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  '$dateStr • $catName',
                  style: AppTextStyles.bodySmall.copyWith(
                    fontSize: 10,
                    color: AppColors.textTertiary,
                  ),
                ),
              ],
            ),
          ),
          // Amount
          Text(
            '${isIncome ? '+' : '-'} ${currencyFormat.format(transaction.amount)}',
            style: AppTextStyles.bodyLarge.copyWith(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: isIncome ? AppColors.income : AppColors.expense,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  IconData _getCategoryIcon(String name) {
    final lower = name.toLowerCase();
    if (lower.contains('mercado') || lower.contains('alimenta')) return Icons.shopping_cart;
    if (lower.contains('transporte') || lower.contains('combust') || lower.contains('posto')) return Icons.local_gas_station;
    if (lower.contains('salário') || lower.contains('salario') || lower.contains('entrada')) return Icons.account_balance_wallet;
    if (lower.contains('aluguel') || lower.contains('casa')) return Icons.home;
    if (lower.contains('energia') || lower.contains('luz')) return Icons.bolt;
    if (lower.contains('lazer') || lower.contains('entretenimento')) return Icons.sports_esports;
    return Icons.receipt;
  }
}

// ─── Quick Actions ──────────────────────────────────────────

class _QuickActionsRow extends StatelessWidget {
  final ValueChanged<int>? onNavigateToTab;
  const _QuickActionsRow({this.onNavigateToTab});

  @override
  Widget build(BuildContext context) {
    final actions = [
      _QuickAction(
        icon: Icons.add_circle,
        label: 'Nova entrada',
        color: AppColors.income,
        bgColor: AppColors.incomeBg,
        onTap: () {},
      ),
      _QuickAction(
        icon: Icons.remove_circle,
        label: 'Nova saída',
        color: AppColors.expense,
        bgColor: AppColors.expenseBg,
        onTap: () {},
      ),
      _QuickAction(
        icon: Icons.swap_horiz,
        label: 'Transferência',
        color: AppColors.savings,
        bgColor: AppColors.savingsBg,
        onTap: () {},
      ),
      _QuickAction(
        icon: Icons.payment,
        label: 'Parcelar',
        color: AppColors.secondary,
        bgColor: AppColors.secondary.withValues(alpha: 0.15),
        onTap: () {},
      ),
      _QuickAction(
        icon: Icons.bar_chart,
        label: 'Relatórios',
        color: AppColors.goal,
        bgColor: AppColors.goalBg,
        onTap: () => onNavigateToTab?.call(1), // 1 is TransactionsTab / Reports? Let's check tab indices in home_screen: 0 is Dashboard, 1 is TransactionsTab, 2 is RecurringBillsTab...
      ),
    ];

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: actions
          .map((a) => Expanded(
                child: GestureDetector(
                  onTap: a.onTap,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: a.bgColor,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(a.icon, size: 20, color: a.color),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        a.label,
                        style: AppTextStyles.bodySmall.copyWith(
                          fontSize: 9,
                          color: AppColors.textSecondary,
                        ),
                        textAlign: TextAlign.center,
                        overflow: TextOverflow.ellipsis,
                        maxLines: 1,
                      ),
                    ],
                  ),
                ),
              ))
          .toList(),
    );
  }
}

class _QuickAction {
  final IconData icon;
  final String label;
  final Color color;
  final Color bgColor;
  final VoidCallback? onTap;

  const _QuickAction({
    required this.icon,
    required this.label,
    required this.color,
    required this.bgColor,
    this.onTap,
  });
}

// ─── Goal Card (KPI row) ───────────────────────────────────

class _GoalKpi extends StatelessWidget {
  final double percent;

  const _GoalKpi({required this.percent});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: const BoxDecoration(
            color: Color(0xFFFFF3E0),
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.track_changes,
            size: 18,
            color: Color(0xFFF97316),
          ),
        ),
        const SizedBox(height: 10),
        const Text(
          'Meta do mês',
          style: TextStyle(
            fontFamily: 'Inter',
            fontSize: 11,
            fontWeight: FontWeight.w500,
            color: Color(0xFF6B7280),
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 4),
        Text(
          '${percent.toStringAsFixed(0)}%',
          style: const TextStyle(
            fontFamily: 'Outfit',
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: Color(0xFFF97316),
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: percent / 100,
            minHeight: 5,
            backgroundColor: const Color(0xFFFEF3E2),
            valueColor: const AlwaysStoppedAnimation(Color(0xFFF97316)),
          ),
        ),
      ],
    );
  }
}

// ─── Skeleton ───────────────────────────────────────────────

class _SkeletonDashboard extends StatelessWidget {
  const _SkeletonDashboard();

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          const SkeletonLoader(width: double.infinity, height: 220),
          const SizedBox(height: 16),
          const Row(
            children: [
              Expanded(child: SkeletonLoader(height: 110)),
              SizedBox(width: 8),
              Expanded(child: SkeletonLoader(height: 110)),
              SizedBox(width: 8),
              Expanded(child: SkeletonLoader(height: 110)),
              SizedBox(width: 8),
              Expanded(child: SkeletonLoader(height: 110)),
            ],
          ),
          const SizedBox(height: 24),
          const Row(
            children: [
              Expanded(child: SkeletonLoader(height: 200)),
              SizedBox(width: 12),
              Expanded(child: SkeletonLoader(height: 200)),
            ],
          ),
          const SizedBox(height: 24),
          const SkeletonLoader(width: double.infinity, height: 150),
          const SizedBox(height: 16),
          const SkeletonLoader(width: double.infinity, height: 150),
        ],
      ),
    );
  }
}
