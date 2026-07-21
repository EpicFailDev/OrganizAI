import '../core/supabase_client.dart';
import '../models/transaction.dart';

class TransactionService {
  Future<List<AppTransaction>> getTransactions(String familyId) async {
    final res = await supabase
        .from('transactions')
        .select('*, categories(*), subcategories(*), profiles(*)')
        .eq('family_id', familyId)
        .order('date', ascending: false);

    return (res as List)
        .map((t) => AppTransaction.fromJson(t as Map<String, dynamic>))
        .toList();
  }

  Future<void> create({
    required String familyId,
    required DateTime date,
    required String description,
    required String categoryId,
    String? subcategoryId,
    required String type,
    required double amount,
    String? attachmentUrl,
  }) async {
    final userId = supabase.auth.currentUser!.id;

    await supabase.from('transactions').insert({
      'family_id': familyId,
      'date': date.toIso8601String().split('T').first,
      'description': description,
      'category_id': categoryId,
      'subcategory_id': subcategoryId,
      'type': type,
      'amount': amount,
      'created_by': userId,
      'attachment_url': attachmentUrl,
    });
  }

  Future<void> delete(String id) async {
    await supabase.from('transactions').delete().eq('id', id);
  }
}
