import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
import '../theme/app_spacing.dart';
import '../providers/category_provider.dart';
import '../providers/family_provider.dart';
import '../models/category.dart';
import '../widgets/category_tile.dart';
import '../widgets/section_header.dart';
import '../widgets/primary_button.dart';
import '../widgets/skeleton_loader.dart';
import '../core/snackbar_helper.dart';

class CategoriesTab extends ConsumerStatefulWidget {
  const CategoriesTab({super.key});

  @override
  ConsumerState<CategoriesTab> createState() => _CategoriesTabState();
}

class _CategoriesTabState extends ConsumerState<CategoriesTab> {
  @override
  Widget build(BuildContext context) {
    final categoriesAsync = ref.watch(categoryProvider);

    return categoriesAsync.when(
      loading: () => const _SkeletonCategories(),
      error: (e, _) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppColors.expense),
            const SizedBox(height: 16),
            Text('Erro ao carregar categorias', style: AppTextStyles.bodyLarge),
            const SizedBox(height: 8),
            ElevatedButton(
              onPressed: () => ref.invalidate(categoryProvider),
              child: const Text('Tentar novamente'),
            ),
          ],
        ),
      ),
      data: (categories) {
        final globalCats = categories.where((c) => c.isGlobal).toList();
        final customCats = categories.where((c) => !c.isGlobal).toList();

        return RefreshIndicator(
          onRefresh: () => ref.read(categoryProvider.notifier).refresh(),
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(AppSpacing.lg),
            children: [
              PrimaryButton(
                onPressed: () => _showCreateCategoryDialog(context),
                label: 'Nova Categoria Customizada',
                icon: Icons.add,
              ),
              const SizedBox(height: AppSpacing.xxl),

              const SectionHeader(title: 'Categorias Padrão'),
              ...globalCats.map((c) => CategoryTile(
                name: c.name,
                type: c.type,
                color: c.parsedColor,
                isGlobal: true,
              )),

              const SizedBox(height: AppSpacing.xxl),

              const SectionHeader(title: 'Categorias Customizadas'),
              if (customCats.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: AppSpacing.lg),
                  child: Text(
                    'Nenhuma categoria customizada criada.',
                    style: AppTextStyles.bodySmall,
                  ),
                )
              else
                ...customCats.map((c) => CategoryTile(
                  name: c.name,
                  type: c.type,
                  color: c.parsedColor,
                  isGlobal: false,
                  onDelete: () => _confirmDeleteCategory(context, c),
                )),
            ],
          ),
        );
      },
    );
  }

  void _showCreateCategoryDialog(BuildContext context) {
    final nameCtrl = TextEditingController();
    String type = 'expense';
    String colorHex = '#34D399';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Nova Categoria'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameCtrl,
                decoration: const InputDecoration(labelText: 'Nome da Categoria'),
              ),
              const SizedBox(height: AppSpacing.lg),
              DropdownButtonFormField<String>(
                value: type,
                items: const [
                  DropdownMenuItem(value: 'expense', child: Text('Despesa (Saída)')),
                  DropdownMenuItem(value: 'income', child: Text('Receita (Entrada)')),
                ],
                onChanged: (val) => setDialogState(() => type = val!),
                decoration: const InputDecoration(labelText: 'Tipo'),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar'),
            ),
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                _createCategory(nameCtrl.text.trim(), type, colorHex);
              },
              child: const Text('Criar'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _createCategory(String name, String type, String colorHex) async {
    if (name.isEmpty) return;
    final familyId = ref.read(familyProvider).valueOrNull?.familyId;
    if (familyId == null) return;

    try {
      await ref.read(categoryProvider.notifier).create(
        name: name,
        type: type,
        colorHex: colorHex,
        familyId: familyId,
      );
      if (mounted) {
        showSuccessSnackBar(context, 'Categoria criada!');
      }
    } catch (e) {
      if (mounted) {
        showErrorSnackBar(context, 'Erro ao criar: $e');
      }
    }
  }

  Future<void> _confirmDeleteCategory(BuildContext context, Category cat) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Excluir Categoria'),
        content: Text('Tem certeza que deseja excluir "${cat.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Confirmar'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await ref.read(categoryProvider.notifier).delete(cat.id);
    }
  }
}

class _SkeletonCategories extends StatelessWidget {
  const _SkeletonCategories();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: const [
        SkeletonLoader(width: double.infinity, height: 48),
        SizedBox(height: 24),
        SkeletonLoader(width: 120, height: 18),
        SizedBox(height: 12),
        SkeletonLoader(width: double.infinity, height: 56),
        SizedBox(height: 8),
        SkeletonLoader(width: double.infinity, height: 56),
        SizedBox(height: 8),
        SkeletonLoader(width: double.infinity, height: 56),
        SizedBox(height: 24),
        SkeletonLoader(width: 160, height: 18),
        SizedBox(height: 12),
        SkeletonLoader(width: double.infinity, height: 56),
      ],
    );
  }
}
