import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
import '../theme/app_spacing.dart';
import '../theme/app_radius.dart';
import '../providers/category_provider.dart';
import '../providers/family_provider.dart';
import '../providers/transaction_provider.dart';
import '../models/category.dart';
import '../services/storage_service.dart';
import '../widgets/dark_card.dart';
import '../widgets/primary_button.dart';
import '../widgets/toggle_selector.dart';
import '../animations/fade_slide_transition.dart';
import '../core/snackbar_helper.dart';

class AddTransactionScreen extends ConsumerStatefulWidget {
  const AddTransactionScreen({super.key});

  @override
  ConsumerState<AddTransactionScreen> createState() =>
      _AddTransactionScreenState();
}

class _AddTransactionScreenState extends ConsumerState<AddTransactionScreen> {
  final _descriptionCtrl = TextEditingController();
  final _amountCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  String _type = 'expense';
  DateTime _date = DateTime.now();
  String? _selectedCategoryId;
  String? _selectedSubcategoryId;

  List<Map<String, dynamic>> _subcategories = [];
  File? _imageFile;
  bool _loading = false;

  final _picker = ImagePicker();
  final _storageService = StorageService();

  List<Category> get _filteredCategories {
    final categories = ref.read(categoryProvider).valueOrNull ?? [];
    return categories.where((c) => c.type == _type).toList();
  }

  Future<void> _fetchSubcategories(String categoryId) async {
    try {
      final res = await Supabase.instance.client
          .from('subcategories')
          .select()
          .eq('category_id', categoryId);

      setState(() {
        _subcategories = List<Map<String, dynamic>>.from(res);
        _selectedSubcategoryId = null;
      });
    } catch (e) {
      if (mounted) {
        showErrorSnackBar(context, 'Erro ao buscar subcategorias: $e');
      }
    }
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final pickedFile = await _picker.pickImage(
        source: source,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );

      if (pickedFile != null) {
        setState(() {
          _imageFile = File(pickedFile.path);
        });
      }
    } catch (e) {
      if (mounted) {
        showErrorSnackBar(context, 'Erro ao selecionar imagem: $e');
      }
    }
  }

  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (picked != null) {
      setState(() => _date = picked);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() || _selectedCategoryId == null) {
      showErrorSnackBar(context, 'Preencha todos os campos obrigatórios.');
      return;
    }

    final familyId = ref.read(familyProvider).valueOrNull?.familyId;
    if (familyId == null) {
      showErrorSnackBar(context, 'Nenhuma família configurada.');
      return;
    }

    setState(() => _loading = true);

    try {
      final description = _descriptionCtrl.text.trim();
      final amount = double.parse(_amountCtrl.text.replaceAll(',', '.'));
      String? attachmentUrl;

      if (_imageFile != null) {
        final path = await _storageService.uploadReceipt(
          familyId: familyId,
          file: _imageFile!,
        );
        attachmentUrl = path;
      }

      await ref.read(transactionProvider.notifier).addTransaction(
        familyId: familyId,
        date: _date,
        description: description,
        categoryId: _selectedCategoryId!,
        subcategoryId: _selectedSubcategoryId,
        type: _type,
        amount: amount,
        attachmentUrl: attachmentUrl,
      );

      if (mounted) {
        showSuccessSnackBar(context, 'Lançamento salvo!');
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        showErrorSnackBar(context, 'Erro ao salvar: $e');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _descriptionCtrl.dispose();
    _amountCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Novo Lançamento'),
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    FadeSlideTransition(
                      delay: Duration.zero,
                      child: ToggleSelector(
                        value: _type,
                        onChanged: (val) => setState(() {
                          _type = val;
                          _selectedCategoryId = null;
                          _selectedSubcategoryId = null;
                          _subcategories = [];
                        }),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xxl),

                    FadeSlideTransition(
                      delay: const Duration(milliseconds: 100),
                      child: DarkCard(
                        child: Column(
                          children: [
                            InkWell(
                              onTap: _selectDate,
                              child: InputDecorator(
                                decoration: const InputDecoration(
                                  labelText: 'Data',
                                  prefixIcon:
                                      Icon(Icons.calendar_today_outlined),
                                ),
                                child: Text(
                                  DateFormat('dd/MM/yyyy').format(_date),
                                  style: AppTextStyles.bodyLarge,
                                ),
                              ),
                            ),
                            const SizedBox(height: AppSpacing.lg),

                            TextFormField(
                              controller: _amountCtrl,
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                decimal: true,
                              ),
                              style: AppTextStyles.kpiValueSmall.copyWith(
                                color: AppColors.textPrimary,
                              ),
                              decoration: const InputDecoration(
                                labelText: 'Valor (R\$)',
                                prefixIcon:
                                    Icon(Icons.attach_money_outlined),
                              ),
                              validator: (val) {
                                if (val == null || val.isEmpty) {
                                  return 'Insira o valor';
                                }
                                final cleanVal = val.replaceAll(',', '.');
                                if (double.tryParse(cleanVal) == null ||
                                    double.parse(cleanVal) <= 0) {
                                  return 'Valor inválido';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: AppSpacing.lg),

                            TextFormField(
                              controller: _descriptionCtrl,
                              decoration: const InputDecoration(
                                labelText: 'Descrição',
                                prefixIcon:
                                    Icon(Icons.description_outlined),
                              ),
                              validator: (val) =>
                                  val == null || val.isEmpty
                                      ? 'Insira a descrição'
                                      : null,
                            ),
                            const SizedBox(height: AppSpacing.lg),

                            DropdownButtonFormField<String>(
                              value: _selectedCategoryId,
                              items: _filteredCategories.map((c) {
                                return DropdownMenuItem<String>(
                                  value: c.id,
                                  child: Text(c.name),
                                );
                              }).toList(),
                              onChanged: (val) {
                                setState(() {
                                  _selectedCategoryId = val;
                                });
                                if (val != null) {
                                  _fetchSubcategories(val);
                                }
                              },
                              decoration: const InputDecoration(
                                labelText: 'Categoria',
                                prefixIcon:
                                    Icon(Icons.category_outlined),
                              ),
                              validator: (val) => val == null
                                  ? 'Selecione a categoria'
                                  : null,
                            ),
                            const SizedBox(height: AppSpacing.lg),

                            DropdownButtonFormField<String>(
                              value: _selectedSubcategoryId,
                              items: _subcategories.map((s) {
                                return DropdownMenuItem<String>(
                                  value: s['id'] as String,
                                  child: Text(s['name'] as String),
                                );
                              }).toList(),
                              onChanged: (val) => setState(
                                () => _selectedSubcategoryId = val,
                              ),
                              decoration: InputDecoration(
                                labelText: 'Subcategoria (Opcional)',
                                prefixIcon:
                                    const Icon(Icons.label_outline),
                                enabled: _selectedCategoryId != null &&
                                    _subcategories.isNotEmpty,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xxl),

                    FadeSlideTransition(
                      delay: const Duration(milliseconds: 200),
                      child: DarkCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Comprovante / Recibo',
                              style: AppTextStyles.headlineMedium,
                            ),
                            const SizedBox(height: AppSpacing.lg),
                            if (_imageFile != null) ...[
                              ClipRRect(
                                borderRadius: AppRadius.mdAll,
                                child: Image.file(
                                  _imageFile!,
                                  height: 180,
                                  width: double.infinity,
                                  fit: BoxFit.cover,
                                ),
                              ),
                              const SizedBox(height: AppSpacing.md),
                              Align(
                                alignment: Alignment.centerRight,
                                child: TextButton.icon(
                                  onPressed: () =>
                                      setState(() => _imageFile = null),
                                  icon: const Icon(
                                    Icons.delete_outline,
                                    color: AppColors.expense,
                                  ),
                                  label: const Text(
                                    'Remover',
                                    style: TextStyle(
                                      color: AppColors.expense,
                                    ),
                                  ),
                                ),
                              ),
                            ] else ...[
                              Row(
                                children: [
                                  Expanded(
                                    child: OutlinedButton.icon(
                                      onPressed: () =>
                                          _pickImage(ImageSource.camera),
                                      icon: const Icon(
                                        Icons.camera_alt_outlined,
                                      ),
                                      label: const Text('Foto'),
                                    ),
                                  ),
                                  const SizedBox(width: AppSpacing.md),
                                  Expanded(
                                    child: OutlinedButton.icon(
                                      onPressed: () =>
                                          _pickImage(ImageSource.gallery),
                                      icon: const Icon(
                                        Icons.image_search_outlined,
                                      ),
                                      label: const Text('Galeria'),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xxxl),

                    FadeSlideTransition(
                      delay: const Duration(milliseconds: 300),
                      child: PrimaryButton(
                        onPressed: _submit,
                        label: 'Salvar Lançamento',
                        icon: Icons.check,
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
