import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
import '../theme/app_spacing.dart';
import '../providers/transaction_provider.dart';
import '../models/transaction.dart';
import '../widgets/transaction_tile.dart';
import '../widgets/empty_state.dart';
import '../widgets/skeleton_loader.dart';
import '../services/storage_service.dart';
import '../services/receipt_service.dart';
import 'receipt_detail_screen.dart';

class TransactionsTab extends ConsumerStatefulWidget {
  const TransactionsTab({super.key});

  @override
  ConsumerState<TransactionsTab> createState() => _TransactionsTabState();
}

class _TransactionsTabState extends ConsumerState<TransactionsTab> {
  String _searchQuery = '';
  String? _filterType;

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
        var filtered = state.transactions;

        if (_searchQuery.isNotEmpty) {
          final query = _searchQuery.toLowerCase();
          filtered = filtered.where((t) =>
            t.description.toLowerCase().contains(query) ||
            (t.category?.name.toLowerCase().contains(query) ?? false)
          ).toList();
        }

        if (_filterType != null) {
          filtered = filtered.where((t) => t.type == _filterType).toList();
        }

        if (filtered.isEmpty && state.transactions.isEmpty) {
          return const EmptyState(
            icon: Icons.receipt_long_outlined,
            title: 'Nenhum lançamento',
            subtitle: 'Adicione seu primeiro lançamento usando o botão +',
          );
        }

        if (filtered.isEmpty) {
          return const EmptyState(
            icon: Icons.search_off,
            title: 'Nenhum resultado',
            subtitle: 'Tente buscar por outro termo.',
          );
        }

        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      decoration: InputDecoration(
                        hintText: 'Buscar lançamento...',
                        prefixIcon: const Icon(Icons.search),
                        filled: true,
                        fillColor: AppColors.surfaceVariant,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                      ),
                      onChanged: (val) => setState(() => _searchQuery = val),
                    ),
                  ),
                  const SizedBox(width: 8),
                  _FilterChip(
                    label: 'Todos',
                    isSelected: _filterType == null,
                    onTap: () => setState(() => _filterType = null),
                  ),
                  const SizedBox(width: 4),
                  _FilterChip(
                    label: 'Entrada',
                    isSelected: _filterType == 'income',
                    onTap: () => setState(() => _filterType = 'income'),
                    color: AppColors.income,
                  ),
                  const SizedBox(width: 4),
                  _FilterChip(
                    label: 'Saída',
                    isSelected: _filterType == 'expense',
                    onTap: () => setState(() => _filterType = 'expense'),
                    color: AppColors.expense,
                  ),
                ],
              ),
            ),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () => ref.read(transactionProvider.notifier).refresh(),
                child: _TransactionListView(transactions: filtered),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _TransactionListView extends StatefulWidget {
  final List<AppTransaction> transactions;

  const _TransactionListView({required this.transactions});

  @override
  State<_TransactionListView> createState() => _TransactionListViewState();
}

class _TransactionListViewState extends State<_TransactionListView> {
  final _receiptService = ReceiptService();
  Map<String, bool> _receiptItemsMap = {};

  @override
  void initState() {
    super.initState();
    _loadReceiptItemsInfo();
  }

  @override
  void didUpdateWidget(covariant _TransactionListView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.transactions != widget.transactions) {
      _loadReceiptItemsInfo();
    }
  }

  Future<void> _loadReceiptItemsInfo() async {
    final ids = widget.transactions.map((t) => t.id).toList();
    if (ids.isEmpty) return;

    final map = <String, bool>{};
    for (final id in ids) {
      final items = await _receiptService.getReceiptItems(id);
      map[id] = items.isNotEmpty;
    }
    if (mounted) {
      setState(() => _receiptItemsMap = map);
    }
  }

  @override
  Widget build(BuildContext context) {
    final grouped = <String, List<AppTransaction>>{};
    for (final t in widget.transactions) {
      grouped.putIfAbsent(t.monthKey, () => []).add(t);
    }
    final months = grouped.keys.toList()..sort((a, b) => b.compareTo(a));

    return ListView.builder(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(AppSpacing.lg),
      itemCount: months.length,
      itemBuilder: (context, monthIndex) {
        final monthKey = months[monthIndex];
        final txs = grouped[monthKey]!;
        final monthTotal = txs.fold<double>(
          0,
          (sum, t) => sum + (t.isIncome ? t.amount : -t.amount),
        );

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(_formatMonth(monthKey), style: AppTextStyles.headlineMedium),
                  Text(
                    NumberFormat.simpleCurrency(locale: 'pt_BR').format(monthTotal),
                    style: AppTextStyles.bodyMedium.copyWith(
                      color: monthTotal >= 0 ? AppColors.income : AppColors.expense,
                    ),
                  ),
                ],
              ),
            ),
            ...txs.map((t) => TransactionTile(
              description: t.description,
              categoryName: t.category?.name ?? 'Sem Categoria',
              date: t.date,
              amount: t.amount,
              isIncome: t.isIncome,
              showReceipt: t.attachmentUrl != null,
              hasReceiptItems: _receiptItemsMap[t.id] ?? false,
              onReceiptTap: t.attachmentUrl != null
                  ? () => _showReceipt(context, t.attachmentUrl!)
                  : null,
              onReceiptItemsTap: (_receiptItemsMap[t.id] ?? false)
                  ? () => _showReceiptItems(context, t)
                  : null,
              onDeleteTap: () => _confirmDelete(context, t),
            )),
          ],
        );
      },
    );
  }

  String _formatMonth(String monthKey) {
    final parts = monthKey.split('-');
    final date = DateTime(int.parse(parts[0]), int.parse(parts[1]));
    return DateFormat('MMMM yyyy', 'pt_BR').format(date);
  }

  void _showReceipt(BuildContext context, String path) {
    showDialog(
      context: context,
      builder: (_) => Dialog(
        backgroundColor: Colors.transparent,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppBar(
              backgroundColor: Colors.transparent,
              title: const Text('Comprovante'),
              leading: IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.pop(context),
              ),
            ),
            FutureBuilder<String>(
              future: StorageService().getSignedUrl(path),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const SizedBox(
                    height: 200,
                    child: Center(child: CircularProgressIndicator()),
                  );
                }
                if (snapshot.hasError) {
                  return const Icon(Icons.broken_image, size: 64, color: AppColors.textTertiary);
                }
                return ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.network(snapshot.data!, fit: BoxFit.contain),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showReceiptItems(BuildContext context, AppTransaction transaction) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ReceiptDetailScreen(transaction: transaction),
      ),
    );
  }

  void _confirmDelete(BuildContext context, AppTransaction t) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Excluir'),
        content: const Text('Confirmar exclusão deste lançamento?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              // TODO: Chamar transactionProvider.notifier.deleteTransaction
            },
            child: const Text('Confirmar'),
          ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;
  final Color? color;

  const _FilterChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected
              ? (color ?? AppColors.primary).withValues(alpha: 0.2)
              : AppColors.surfaceVariant,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected
                ? (color ?? AppColors.primary)
                : AppColors.surfaceBorder,
          ),
        ),
        child: Text(
          label,
          style: AppTextStyles.bodySmall.copyWith(
            color: isSelected
                ? (color ?? AppColors.primary)
                : AppColors.textTertiary,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}

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
