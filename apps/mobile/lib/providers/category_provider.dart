import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/category.dart';
import '../services/category_service.dart';
import 'family_provider.dart';

class CategoryNotifier extends AsyncNotifier<List<Category>> {
  final _service = CategoryService();

  @override
  Future<List<Category>> build() async {
    final familyId = ref.watch(familyProvider).valueOrNull?.familyId;
    return _service.getCategories(familyId);
  }

  Future<void> refresh() async {
    final familyId = ref.read(familyProvider).valueOrNull?.familyId;
    state = await AsyncValue.guard(() => _service.getCategories(familyId));
  }

  Future<void> create({
    required String name,
    required String type,
    required String colorHex,
    required String familyId,
  }) async {
    await _service.create(
      name: name,
      type: type,
      colorHex: colorHex,
      familyId: familyId,
    );
    await refresh();
  }

  Future<void> delete(String id) async {
    await _service.delete(id);
    await refresh();
  }
}

final categoryProvider =
    AsyncNotifierProvider<CategoryNotifier, List<Category>>(
  CategoryNotifier.new,
);
