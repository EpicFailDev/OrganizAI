import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/recurring_bill.dart';
import '../services/recurring_bill_service.dart';
import 'family_provider.dart';

class RecurringBillState {
  final List<RecurringBill> bills;
  final bool isLoading;
  final String? error;

  const RecurringBillState({
    this.bills = const [],
    this.isLoading = false,
    this.error,
  });

  RecurringBillState copyWith({
    List<RecurringBill>? bills,
    bool? isLoading,
    String? error,
  }) {
    return RecurringBillState(
      bills: bills ?? this.bills,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class RecurringBillNotifier extends StateNotifier<RecurringBillState> {
  final _service = RecurringBillService();
  final Ref _ref;

  RecurringBillNotifier(this._ref) : super(const RecurringBillState());

  bool _loaded = false;

  Future<void> load() async {
    final familyId = _ref.read(familyProvider).valueOrNull?.familyId;
    if (familyId == null) {
      _loaded = true;
      return;
    }

    state = state.copyWith(isLoading: true);
    try {
      final bills = await _service.getBills(familyId);
      state = RecurringBillState(bills: bills);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    } finally {
      _loaded = true;
    }
  }

  Future<void> ensureLoaded() async {
    if (!_loaded) await load();
  }

  Future<void> addBill({
    required String familyId,
    required String name,
    required double amount,
    required int dueDay,
    String? categoryId,
  }) async {
    await _service.create(
      familyId: familyId,
      name: name,
      amount: amount,
      dueDay: dueDay,
      categoryId: categoryId,
    );
    await load();
  }

  Future<void> togglePaid(String billId) async {
    final bill = state.bills.firstWhere((b) => b.id == billId);
    final newPaid = !bill.paid;
    await _service.togglePaid(billId, paid: newPaid);
    await load();
  }

  Future<void> deleteBill(String id) async {
    await _service.delete(id);
    await load();
  }
}

final recurringBillProvider =
    StateNotifierProvider<RecurringBillNotifier, RecurringBillState>(
  (ref) => RecurringBillNotifier(ref),
);