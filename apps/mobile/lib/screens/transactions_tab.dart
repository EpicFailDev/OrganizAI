import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
import '../theme/app_spacing.dart';
import '../theme/app_radius.dart';
import '../providers/transaction_provider.dart';
import '../models/transaction.dart';
import '../widgets/skeleton_loader.dart';

class TransactionsTab extends ConsumerStatefulWidget {
  const TransactionsTab({super.key});

  @override
  ConsumerState<TransactionsTab> createState() => _TransactionsTabState();
}

class _TransactionsTabState extends ConsumerState<TransactionsTab>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String? _activeFilter; // 'category', 'account', 'payment', 'more'
  final Set<String> _expandedDays = {};

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _tabController.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final txState = ref.watch(transactionProvider);

    return txState.when(
      loading: () => const _SkeletonTransactionsList(),
      error: (e, _) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppColors.expense),
            const SizedBox(height: 16),
            Text('Erro ao carregar lançamentos', style: AppTextStyles.bodyLarge),
            const SizedBox(height: 8),
            ElevatedButton(
              onPressed: () => ref.invalidate(transactionProvider),
              child: const Text('Tentar novamente'),
            ),
          ],
        ),
      ),
      data: (state) {
        // Filter by tab
        var filtered = state.transactions;
        switch (_tabController.index) {
          case 1:
            filtered = filtered.where((t) => t.isIncome).toList();
            break;
          case 2:
            filtered = filtered.where((t) => !t.isIncome).toList();
            break;
          case 3:
            // Transferências - por enquanto vazio
            filtered = [];
            break;
        }

        // Sort by date descending
        filtered.sort((a, b) => b.date.compareTo(a.date));

        // Group by day
        final groupedByDay = <String, List<AppTransaction>>{};
        for (final t in filtered) {
          groupedByDay.putIfAbsent(t.dayKey, () => []).add(t);
        }
        final dayKeys = groupedByDay.keys.toList()..sort((a, b) => b.compareTo(a));

        // Monthly totals
        final now = DateTime.now();
        final monthTransactions = state.transactions
            .where((t) => t.date.month == now.month && t.date.year == now.year)
            .toList();
        final monthTotal = monthTransactions.fold<double>(
          0,
          (sum, t) => sum + (t.isIncome ? t.amount : -t.amount),
        );
        final daysInMonth = DateTime(now.year, now.month + 1, 0).day;
        final dailyAverage = monthTotal / daysInMonth;

        return Column(
          children: [
            // Header with icons
            _buildHeader(),

            // Summary cards
            _buildSummaryCards(state),

            // Tab bar
            _buildTabBar(),

            // Filter chips
            _buildFilterChips(),

            // Transaction list
            Expanded(
              child: Container(
                color: AppColors.background,
                child: filtered.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            _tabController.index == 3
                                ? Icons.swap_horiz_outlined
                                : Icons.receipt_long_outlined,
                            size: 48,
                            color: AppColors.textTertiary,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            _tabController.index == 3
                                ? 'Nenhuma transferência'
                                : 'Nenhum lançamento',
                            style: AppTextStyles.bodyLarge,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _tabController.index == 3
                                ? 'As transferências aparecerão aqui.'
                                : 'Adicione seu primeiro lançamento usando o botão +',
                            style: AppTextStyles.bodySmall,
                          ),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: () =>
                          ref.read(transactionProvider.notifier).refresh(),
                      child: ListView.builder(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(
                            AppSpacing.lg, 0, AppSpacing.lg, 100),
                        itemCount: dayKeys.length + 1, // +1 for monthly summary
                        itemBuilder: (context, index) {
                          if (index == dayKeys.length) {
                            return _MonthlySummaryCard(
                              total: monthTotal,
                              transactionCount: monthTransactions.length,
                              dailyAverage: dailyAverage,
                            );
                          }

                          final dayKey = dayKeys[index];
                          final dayTxs = groupedByDay[dayKey]!;
                          final dayTotal = dayTxs.fold<double>(
                            0,
                            (sum, t) => sum + (t.isIncome ? t.amount : -t.amount),
                          );
                          final isExpanded =
                              _expandedDays.contains(dayKey) || dayTxs.length <= 4;
                          final displayTxs =
                              isExpanded ? dayTxs : dayTxs.take(4).toList();

                          return _DayGroup(
                            dayKey: dayKey,
                            dayTotal: dayTotal,
                            transactions: displayTxs,
                            isExpanded: isExpanded,
                            hasMore: dayTxs.length > 4,
                            onToggleExpand: () {
                              setState(() {
                                if (_expandedDays.contains(dayKey)) {
                                  _expandedDays.remove(dayKey);
                                } else {
                                  _expandedDays.add(dayKey);
                                }
                              });
                            },
                            onTransactionTap: (t) =>
                                _showTransactionDetail(context, t),
                          );
                        },
                      ),
                    ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(AppSpacing.lg, 4, AppSpacing.lg, 0),
      child: Row(
        children: [
          // Search icon
          _HeaderIcon(
            icon: Icons.search,
            onTap: () {
              // TODO: show search overlay
            },
          ),
          const SizedBox(width: 8),
          // Filter icon
          _HeaderIcon(
            icon: Icons.tune,
            onTap: () {},
          ),
          const SizedBox(width: 8),
          // Calendar icon
          _HeaderIcon(
            icon: Icons.calendar_today_outlined,
            onTap: () {},
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCards(TransactionState state) {
    final currencyFormat = NumberFormat.simpleCurrency(locale: 'pt_BR');
    final now = DateTime.now();
    final monthTransactions = state.transactions
        .where((t) => t.date.month == now.month && t.date.year == now.year);
    final income = monthTransactions
        .where((t) => t.isIncome)
        .fold<double>(0, (sum, t) => sum + t.amount);
    final expense = monthTransactions
        .where((t) => !t.isIncome)
        .fold<double>(0, (sum, t) => sum + t.amount);
    final balance = income - expense;

    return Padding(
      padding: const EdgeInsets.fromLTRB(AppSpacing.lg, 12, AppSpacing.lg, 0),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.surfaceVariant,
          borderRadius: AppRadius.lgAll,
          border: Border.all(color: AppColors.surfaceBorder),
        ),
        child: Row(
          children: [
            Expanded(
              child: _SummaryItem(
                label: 'Entradas',
                value: currencyFormat.format(income),
                icon: Icons.arrow_downward_rounded,
                iconBg: AppColors.incomeBg,
                iconColor: AppColors.income,
                changePercent: 8,
                isPositive: true,
              ),
            ),
            Container(
              width: 1,
              height: 40,
              color: AppColors.surfaceBorder,
            ),
            Expanded(
              child: _SummaryItem(
                label: 'Saídas',
                value: currencyFormat.format(expense),
                icon: Icons.arrow_upward_rounded,
                iconBg: AppColors.expenseBg,
                iconColor: AppColors.expense,
                changePercent: -5,
                isPositive: false,
              ),
            ),
            Container(
              width: 1,
              height: 40,
              color: AppColors.surfaceBorder,
            ),
            Expanded(
              child: _SummaryItem(
                label: 'Saldo',
                value: currencyFormat.format(balance),
                icon: Icons.account_balance_wallet_outlined,
                iconBg: AppColors.goalBg,
                iconColor: AppColors.goal,
                changePercent: 12,
                isPositive: true,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTabBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(AppSpacing.lg, 12, AppSpacing.lg, 0),
      child: Container(
        height: 40,
        decoration: BoxDecoration(
          color: AppColors.surfaceVariant,
          borderRadius: AppRadius.mdAll,
          border: Border.all(color: AppColors.surfaceBorder),
        ),
        child: TabBar(
          controller: _tabController,
          indicator: BoxDecoration(
            color: AppColors.primary,
            borderRadius: AppRadius.smAll,
          ),
          indicatorSize: TabBarIndicatorSize.tab,
          dividerColor: Colors.transparent,
          labelColor: AppColors.background,
          unselectedLabelColor: AppColors.textTertiary,
          labelStyle: AppTextStyles.bodySmall.copyWith(
            fontWeight: FontWeight.w600,
            color: AppColors.background,
          ),
          unselectedLabelStyle: AppTextStyles.bodySmall.copyWith(
            color: AppColors.textTertiary,
          ),
          labelPadding: EdgeInsets.zero,
          indicatorPadding: const EdgeInsets.all(3),
          tabs: const [
            Tab(text: 'Todas'),
            Tab(text: 'Entradas'),
            Tab(text: 'Saídas'),
            Tab(text: 'Transferências'),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChips() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(AppSpacing.lg, 10, AppSpacing.lg, 0),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            _FilterChipItem(
              icon: Icons.category_outlined,
              label: 'Categoria',
              isActive: _activeFilter == 'category',
              onTap: () => setState(() {
                _activeFilter = _activeFilter == 'category' ? null : 'category';
              }),
            ),
            const SizedBox(width: 8),
            _FilterChipItem(
              icon: Icons.account_balance_outlined,
              label: 'Conta',
              isActive: _activeFilter == 'account',
              onTap: () => setState(() {
                _activeFilter = _activeFilter == 'account' ? null : 'account';
              }),
            ),
            const SizedBox(width: 8),
            _FilterChipItem(
              icon: Icons.credit_card_outlined,
              label: 'Forma de Pagamento',
              isActive: _activeFilter == 'payment',
              onTap: () => setState(() {
                _activeFilter = _activeFilter == 'payment' ? null : 'payment';
              }),
            ),
            const SizedBox(width: 8),
            _FilterChipItem(
              icon: Icons.tune,
              label: 'Mais filtros',
              isActive: _activeFilter == 'more',
              onTap: () => setState(() {
                _activeFilter = _activeFilter == 'more' ? null : 'more';
              }),
            ),
          ],
        ),
      ),
    );
  }

  void _showTransactionDetail(BuildContext context, AppTransaction t) {
    // TODO: Navigate to transaction detail
  }
}

// ─── Header Icon ──────────────────────────────────────────────

class _HeaderIcon extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _HeaderIcon({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: AppColors.surfaceVariant,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppColors.surfaceBorder),
        ),
        child: Icon(icon, size: 20, color: AppColors.textSecondary),
      ),
    );
  }
}

// ─── Summary Item ─────────────────────────────────────────────

class _SummaryItem extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color iconBg;
  final Color iconColor;
  final int changePercent;
  final bool isPositive;

  const _SummaryItem({
    required this.label,
    required this.value,
    required this.icon,
    required this.iconBg,
    required this.iconColor,
    required this.changePercent,
    required this.isPositive,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(color: iconBg, shape: BoxShape.circle),
          child: Icon(icon, size: 18, color: iconColor),
        ),
        const SizedBox(height: 6),
        Text(
          label,
          style: AppTextStyles.bodySmall.copyWith(
            color: AppColors.textTertiary,
            fontSize: 11,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: AppTextStyles.bodyLarge.copyWith(
            fontWeight: FontWeight.bold,
            fontSize: 13,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 2),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isPositive ? Icons.arrow_upward : Icons.arrow_downward,
              size: 10,
              color: isPositive ? AppColors.income : AppColors.expense,
            ),
            const SizedBox(width: 2),
            Text(
              '$changePercent%',
              style: AppTextStyles.bodySmall.copyWith(
                fontSize: 10,
                color: isPositive ? AppColors.income : AppColors.expense,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

// ─── Filter Chip Item ─────────────────────────────────────────

class _FilterChipItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isActive;
  final VoidCallback onTap;

  const _FilterChipItem({
    required this.icon,
    required this.label,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isActive
              ? AppColors.primary.withValues(alpha: 0.15)
              : AppColors.surfaceVariant,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isActive ? AppColors.primary : AppColors.surfaceBorder,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 14,
              color: isActive ? AppColors.primary : AppColors.textTertiary,
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: AppTextStyles.bodySmall.copyWith(
                color: isActive ? AppColors.primary : AppColors.textTertiary,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Day Group ────────────────────────────────────────────────

class _DayGroup extends StatelessWidget {
  final String dayKey;
  final double dayTotal;
  final List<AppTransaction> transactions;
  final bool isExpanded;
  final bool hasMore;
  final VoidCallback onToggleExpand;
  final void Function(AppTransaction) onTransactionTap;

  const _DayGroup({
    required this.dayKey,
    required this.dayTotal,
    required this.transactions,
    required this.isExpanded,
    required this.hasMore,
    required this.onToggleExpand,
    required this.onTransactionTap,
  });

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.simpleCurrency(locale: 'pt_BR');
    final date = DateTime.parse(dayKey);
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final day = DateTime(date.year, date.month, date.day);
    final diff = today.difference(day).inDays;

    String dayLabel;
    if (diff == 0) {
      dayLabel = 'Hoje, ${DateFormat("d 'de' MMMM", 'pt_BR').format(date)}';
    } else if (diff == 1) {
      dayLabel = 'Ontem, ${DateFormat("d 'de' MMMM", 'pt_BR').format(date)}';
    } else {
      dayLabel = DateFormat("EEEE, d 'de' MMMM", 'pt_BR').format(date);
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Day header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  dayLabel,
                  style: AppTextStyles.headlineMedium.copyWith(fontSize: 14),
                ),
                Row(
                  children: [
                    Text(
                      '${dayTotal >= 0 ? '' : '- '}${currencyFormat.format(dayTotal.abs())}',
                      style: AppTextStyles.bodyMedium.copyWith(
                        color: dayTotal >= 0 ? AppColors.income : AppColors.expense,
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(width: 4),
                    GestureDetector(
                      onTap: onToggleExpand,
                      child: Icon(
                        isExpanded
                            ? Icons.keyboard_arrow_up
                            : Icons.keyboard_arrow_down,
                        size: 18,
                        color: AppColors.textTertiary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          // Transactions
          ...transactions.map((t) => _DayTransactionTile(
                transaction: t,
                onTap: () => onTransactionTap(t),
              )),
          // Show more link
          if (hasMore && !isExpanded)
            GestureDetector(
              onTap: onToggleExpand,
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'Ver mais transações do dia',
                      style: AppTextStyles.bodySmall.copyWith(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(width: 4),
                    const Icon(
                      Icons.keyboard_arrow_down,
                      size: 16,
                      color: AppColors.primary,
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ─── Day Transaction Tile ─────────────────────────────────────

class _DayTransactionTile extends StatelessWidget {
  final AppTransaction transaction;
  final VoidCallback onTap;

  const _DayTransactionTile({
    required this.transaction,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.simpleCurrency(locale: 'pt_BR');
    final t = transaction;
    final isIncome = t.isIncome;
    final catName = t.category?.name ?? 'Sem Categoria';
    final catColor = t.category != null
        ? Color(int.parse(t.category!.color.replaceFirst('#', '0xFF')))
        : AppColors.textTertiary;
    final timeStr = DateFormat('HH:mm').format(t.date);

    // Map category icon from the model's icon field
    final IconData catIcon = _getCategoryIcon(t.category?.icon, catName);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 10),
        child: Row(
          children: [
            // Category icon
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: catColor.withValues(alpha: 0.2),
                shape: BoxShape.circle,
              ),
              child: Icon(catIcon, size: 20, color: catColor),
            ),
            const SizedBox(width: 12),
            // Description + category
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    t.description.isNotEmpty ? t.description : catName,
                    style: AppTextStyles.bodyLarge.copyWith(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 3),
                  Text(
                    '${t.type == 'income' ? 'Entrada' : catName} \u2022 ${_getPaymentLabel(t)}',
                    style: AppTextStyles.bodySmall.copyWith(fontSize: 11),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            // Amount + time
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '${isIncome ? '+ ' : '- '}${currencyFormat.format(t.amount)}',
                  style: AppTextStyles.bodyLarge.copyWith(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: isIncome ? AppColors.income : AppColors.expense,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  timeStr,
                  style: AppTextStyles.bodySmall.copyWith(fontSize: 11),
                ),
              ],
            ),
            const SizedBox(width: 4),
            const Icon(
              Icons.chevron_right,
              size: 18,
              color: AppColors.textTertiary,
            ),
          ],
        ),
      ),
    );
  }

  String _getPaymentLabel(AppTransaction t) {
    // Derive payment method from subtype or profile
    if (t.subcategory?.name != null) return t.subcategory!.name;
    if (t.type == 'income') return 'Conta Corrente';
    return 'Débito';
  }

  IconData _getCategoryIcon(String? iconName, String catName) {
    if (iconName != null) {
      // Try to map known icon names
      switch (iconName) {
        case 'shopping_cart':
          return Icons.shopping_cart;
        case 'local_gas_station':
          return Icons.local_gas_station;
        case 'account_balance_wallet':
          return Icons.account_balance_wallet;
        case 'home':
          return Icons.home;
        case 'bolt':
          return Icons.bolt;
        case 'water_drop':
          return Icons.water_drop;
        case 'health_and_safety':
          return Icons.health_and_safety;
        case 'restaurant':
          return Icons.restaurant;
        case 'local_cafe':
          return Icons.local_cafe;
        case 'directions_car':
          return Icons.directions_car;
        case 'school':
          return Icons.school;
        case 'sports_esports':
          return Icons.sports_esports;
        case 'favorite':
          return Icons.favorite;
        case 'flight':
          return Icons.flight;
        case 'pets':
          return Icons.pets;
        case 'child_care':
          return Icons.child_care;
        case 'build':
          return Icons.build;
        case 'phone':
          return Icons.phone;
        case 'wifi':
          return Icons.wifi;
        case 'local_grocery_store':
          return Icons.local_grocery_store;
        default:
          return Icons.receipt;
      }
    }

    // Fallback: map by category name
    final lower = catName.toLowerCase();
    if (lower.contains('alimenta') || lower.contains('mercado') || lower.contains('supermercado'))
      return Icons.shopping_cart;
    if (lower.contains('transporte') || lower.contains('combust') || lower.contains('posto'))
      return Icons.local_gas_station;
    if (lower.contains('salário') || lower.contains('salario') || lower.contains('renda'))
      return Icons.account_balance_wallet;
    if (lower.contains('casa') || lower.contains('aluguel'))
      return Icons.home;
    if (lower.contains('energia') || lower.contains('luz'))
      return Icons.bolt;
    if (lower.contains('água') || lower.contains('agua'))
      return Icons.water_drop;
    if (lower.contains('saúde') || lower.contains('saude') || lower.contains('farmácia') || lower.contains('farmacia'))
      return Icons.health_and_safety;
    if (lower.contains('alimenta') || lower.contains('café') || lower.contains('cafe') || lower.contains('padaria'))
      return Icons.local_cafe;
    if (lower.contains('lazer') || lower.contains('entretenimento'))
      return Icons.sports_esports;
    if (lower.contains('educação') || lower.contains('educacao') || lower.contains('escola'))
      return Icons.school;
    if (lower.contains('pets') || lower.contains('animal'))
      return Icons.pets;
    if (lower.contains('filho') || lower.contains('criança') || lower.contains('crianca'))
      return Icons.child_care;
    if (lower.contains('manutenção') || lower.contains('manutencao') || lower.contains('reparo'))
      return Icons.build;
    if (lower.contains('telefone') || lower.contains('celular'))
      return Icons.phone;
    if (lower.contains('internet') || lower.contains('wifi'))
      return Icons.wifi;
    if (lower.contains('vestuário') || lower.contains('roupa'))
      return Icons.checkroom;
    return Icons.receipt;
  }
}

// ─── Monthly Summary Card ─────────────────────────────────────

class _MonthlySummaryCard extends StatelessWidget {
  final double total;
  final int transactionCount;
  final double dailyAverage;

  const _MonthlySummaryCard({
    required this.total,
    required this.transactionCount,
    required this.dailyAverage,
  });

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.simpleCurrency(locale: 'pt_BR');

    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceVariant,
        borderRadius: AppRadius.lgAll,
        border: Border.all(color: AppColors.surfaceBorder),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Total de transações no mês',
                  style: AppTextStyles.bodySmall.copyWith(fontSize: 11),
                ),
                const SizedBox(height: 4),
                Text(
                  currencyFormat.format(total),
                  style: AppTextStyles.kpiValueSmall.copyWith(fontSize: 20),
                ),
                const SizedBox(height: 2),
                Text(
                  '$transactionCount transações',
                  style: AppTextStyles.bodySmall.copyWith(fontSize: 11),
                ),
              ],
            ),
          ),
          // Mini chart placeholder
          SizedBox(
            width: 80,
            height: 40,
            child: _MiniBarChart(),
          ),
          const SizedBox(width: 12),
          // Daily average
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.surfaceBorder),
            ),
            child: Column(
              children: [
                Text(
                  'Média diária',
                  style: AppTextStyles.bodySmall.copyWith(fontSize: 9),
                ),
                const SizedBox(height: 2),
                Text(
                  currencyFormat.format(dailyAverage),
                  style: AppTextStyles.bodyLarge.copyWith(
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Mini Bar Chart ───────────────────────────────────────────

class _MiniBarChart extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    // Generate random-ish bar heights for visual representation
    final values = [0.4, 0.7, 0.3, 0.8, 0.5, 0.9, 0.6, 0.4, 0.7, 0.3, 0.8, 0.5];

    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: values.map((v) {
        final isIncome = v > 0.5;
        return Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 1),
            child: Container(
              height: v * 36,
              decoration: BoxDecoration(
                color: isIncome ? AppColors.income : AppColors.expense,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}

// ─── Skeleton ─────────────────────────────────────────────────

class _SkeletonTransactionsList extends StatelessWidget {
  const _SkeletonTransactionsList();

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      itemCount: 6,
      itemBuilder: (_, __) => const Padding(
        padding: EdgeInsets.only(bottom: 12),
        child: SkeletonLoader(width: double.infinity, height: 72),
      ),
    );
  }
}
