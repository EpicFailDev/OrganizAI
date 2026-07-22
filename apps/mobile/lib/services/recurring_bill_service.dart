import '../core/supabase_client.dart';
import '../models/recurring_bill.dart';

class RecurringBillService {
  Future<List<RecurringBill>> getBills(String familyId) async {
    final now = DateTime.now();
    final monthStart = DateTime(now.year, now.month, 1).toIso8601String().split('T').first;
    final monthEnd = DateTime(now.year, now.month + 1, 1).toIso8601String().split('T').first;

    final res = await supabase
        .from('recurring_bills')
        .select('*, recurring_bill_payments!inner(paid, paid_at)')
        .eq('family_id', familyId)
        .eq('recurring_bill_payments.month_date', monthStart)
        .order('due_day', ascending: true);

    return (res as List)
        .map((r) {
          final json = r as Map<String, dynamic>;
          final payments = json['recurring_bill_payments'] as List?;
          final payment = payments?.isNotEmpty == true ? payments!.first as Map<String, dynamic> : null;

          return RecurringBill(
            id: json['id'] as String,
            familyId: json['family_id'] as String,
            name: json['name'] as String,
            amount: (json['amount'] as num).toDouble(),
            dueDay: json['due_day'] as int,
            categoryId: json['category_id'] as String?,
            createdBy: json['created_by'] as String,
            createdAt: DateTime.parse(json['created_at'] as String),
            paid: payment == null ? false : (payment['paid'] as bool? ?? false),
            paidAt: payment != null && payment['paid_at'] != null
                ? DateTime.parse(payment['paid_at'] as String)
                : null,
          );
        })
        .toList();
  }

  Future<void> create({
    required String familyId,
    required String name,
    required double amount,
    required int dueDay,
    String? categoryId,
  }) async {
    final userId = supabase.auth.currentUser!.id;
    await supabase.from('recurring_bills').insert({
      'family_id': familyId,
      'name': name,
      'amount': amount,
      'due_day': dueDay,
      'category_id': categoryId,
      'created_by': userId,
    });
  }

  Future<void> togglePaid(String billId, {required bool paid}) async {
    final monthStart = DateTime(DateTime.now().year, DateTime.now().month, 1).toIso8601String().split('T').first;
    final userId = supabase.auth.currentUser!.id;

    // Check if payment record exists
    final existing = await supabase
        .from('recurring_bill_payments')
        .select('id')
        .eq('bill_id', billId)
        .eq('month_date', monthStart)
        .maybeSingle();

    if (existing != null) {
      await supabase
          .from('recurring_bill_payments')
          .update({
            'paid': paid,
            if (paid) 'paid_at': DateTime.now().toIso8601String(),
            if (paid) 'paid_by': userId,
            if (!paid) 'paid_at': null,
            if (!paid) 'paid_by': null,
          })
          .eq('id', (existing as Map<String, dynamic>)['id'] as String);
    } else {
      await supabase.from('recurring_bill_payments').insert({
        'bill_id': billId,
        'month_date': monthStart,
        'paid': paid,
        if (paid) 'paid_at': DateTime.now().toIso8601String(),
        if (paid) 'paid_by': userId,
      });
    }
  }

  Future<void> delete(String id) async {
    await supabase.from('recurring_bills').delete().eq('id', id);
  }
}