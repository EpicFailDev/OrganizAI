import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/transaction.dart';
import '../services/transaction_service.dart';
import 'family_provider.dart';

class TransactionState {
  final List<AppTransaction> transactions;
  final bool isLoading;
  final String? error;

  const TransactionState({
    this.transactions = const [],
    this.isLoading = false,
    this.error,
  });

  Map<String, List<AppTransaction>> get groupedByMonth {
    final map = <String, List<AppTransaction>>{};
    for (final t in transactions) {
      map.putIfAbsent(t.monthKey, () => []).add(t);
    }
    return map;
  }

  double get totalIncome => transactions
      .where((t) => t.isIncome)
      .fold(0.0, (sum, t) => sum + t.amount);

  double get totalExpense => transactions
      .where((t) => !t.isIncome)
      .fold(0.0, (sum, t) => sum + t.amount);

  double get balance => totalIncome - totalExpense;
}

class TransactionNotifier extends AsyncNotifier<TransactionState> {
  final _service = TransactionService();

  @override
  Future<TransactionState> build() async {
    final familyId = ref.watch(familyProvider).valueOrNull?.familyId;
    if (familyId == null) {
      return const TransactionState();
    }
    return _fetchTransactions(familyId);
  }

  Future<TransactionState> _fetchTransactions(String familyId) async {
    final txs = await _service.getTransactions(familyId);
    return TransactionState(transactions: txs);
  }

  Future<void> refresh() async {
    final familyId = ref.read(familyProvider).valueOrNull?.familyId;
    if (familyId == null) return;
    state = await AsyncValue.guard(() => _fetchTransactions(familyId));
  }

  Future<void> addTransaction({
    required String familyId,
    required DateTime date,
    required String description,
    required String categoryId,
    String? subcategoryId,
    required String type,
    required double amount,
    String? attachmentUrl,
  }) async {
    await _service.create(
      familyId: familyId,
      date: date,
      description: description,
      categoryId: categoryId,
      subcategoryId: subcategoryId,
      type: type,
      amount: amount,
      attachmentUrl: attachmentUrl,
    );
    await refresh();
  }

  Future<void> deleteTransaction(String id) async {
    await _service.delete(id);
    await refresh();
  }
}

final transactionProvider =
    AsyncNotifierProvider<TransactionNotifier, TransactionState>(
  TransactionNotifier.new,
);
