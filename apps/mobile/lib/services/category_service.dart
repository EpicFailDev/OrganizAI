import '../core/supabase_client.dart';
import '../models/category.dart';

class CategoryService {
  Future<List<Category>> getCategories(String? familyId) async {
    final res = await supabase
        .from('categories')
        .select()
        .or('family_id.is.null,family_id.eq.$familyId');

    return (res as List)
        .map((c) => Category.fromJson(c as Map<String, dynamic>))
        .toList();
  }

  Future<void> create({
    required String name,
    required String type,
    required String colorHex,
    required String familyId,
  }) async {
    await supabase.from('categories').insert({
      'name': name,
      'type': type,
      'color': colorHex,
      'family_id': familyId,
      'icon': type == 'income' ? 'payments' : 'shopping_bag',
    });
  }

  Future<void> delete(String id) async {
    await supabase.from('categories').delete().eq('id', id);
  }
}
