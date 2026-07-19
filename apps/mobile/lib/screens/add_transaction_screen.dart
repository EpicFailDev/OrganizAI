import 'dart:io';
import 'package:flutter/material';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';

class AddTransactionScreen extends StatefulWidget {
  final List<Map<String, dynamic>> categories;
  final String familyId;

  const AddTransactionScreen({
    super.key,
    required this.categories,
    required this.familyId,
  });

  @override
  State<AddTransactionScreen> createState() => _AddTransactionScreenState();
}

class _AddTransactionScreenState extends State<AddTransactionScreen> {
  final _descriptionCtrl = TextEditingController();
  final _amountCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  String _type = 'expense'; // 'expense' (Saída) ou 'income' (Entrada)
  DateTime _date = DateTime.now();
  String? _selectedCategoryId;
  String? _selectedSubcategoryId;

  List<Map<String, dynamic>> _subcategories = [];
  File? _imageFile;
  bool _loading = false;

  final _picker = ImagePicker();

  List<Map<String, dynamic>> get _filteredCategories {
    return widget.categories.where((c) => c['type'] == _type).toList();
  }

  @override
  void initState() {
    super.initState();
  }

  // Fetch subcategories when category changes
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
      debugPrint('Erro ao buscar subcategorias: $e');
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
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erro ao selecionar imagem: $e')),
      );
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
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Por favor, preencha todos os campos obrigatórios.')),
      );
      return;
    }

    setState(() => _loading = true);

    try {
      final supabase = Supabase.instance.client;
      final userId = supabase.auth.currentUser!.id;
      final description = _descriptionCtrl.text.trim();
      final amount = double.parse(_amountCtrl.text.replaceAll(',', '.'));
      String? attachmentUrl;

      // 1. Upload receipt to Supabase Storage if file exists
      if (_imageFile != null) {
        final fileExt = _imageFile!.path.split('.').pop();
        final fileName = '${widget.familyId}/${DateTime.now().millisecondsSinceEpoch}.${fileExt}';
        final filePath = 'receipts/$fileName';

        await supabase.storage
            .from('attachments')
            .upload(filePath, _imageFile!, fileOptions: const FileOptions(upsert: true));

        final publicUrl = supabase.storage.from('attachments').getPublicUrl(filePath);
        attachmentUrl = publicUrl;
      }

      // 2. Save transaction
      await supabase.from('transactions').insert({
        'family_id': widget.familyId,
        'date': DateFormat('yyyy-MM-dd').format(_date),
        'description': description,
        'category_id': _selectedCategoryId,
        'subcategory_id': _selectedSubcategoryId,
        'type': _type,
        'amount': amount,
        'created_by': userId,
        'attachment_url': attachmentUrl,
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Lançamento salvo com sucesso!'), backgroundColor: Colors.emerald),
        );
        Navigator.pop(context, true); // Return true to trigger refresh
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao salvar lançamento: $e'), backgroundColor: Colors.redAccent),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Novo Lançamento'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Toggle Buttons for Entry / Exit
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton(
                            onPressed: () => setState(() => _type = 'expense'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: _type == 'expense' ? theme.colorScheme.error.withOpacity(0.2) : Colors.transparent,
                              side: BorderSide(color: _type == 'expense' ? theme.colorScheme.error : Colors.white10),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            child: Text(
                              'Despesa (Saída)',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: _type == 'expense' ? theme.colorScheme.error : Colors.white60,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: () => setState(() => _type = 'income'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: _type == 'income' ? theme.colorScheme.secondary.withOpacity(0.2) : Colors.transparent,
                              side: BorderSide(color: _type == 'income' ? theme.colorScheme.secondary : Colors.white10),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            child: Text(
                              'Receita (Entrada)',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: _type == 'income' ? theme.colorScheme.secondary : Colors.white60,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Inputs block
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: theme.cardColor,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.white10),
                      ),
                      child: Column(
                        children: [
                          // Date Picker
                          InkWell(
                            onTap: _selectDate,
                            child: InputDecorator(
                              decoration: const InputDecoration(
                                labelText: 'Data',
                                prefixIcon: Icon(Icons.calendar_today_outlined),
                                border: OutlineInputBorder(),
                              ),
                              child: Text(DateFormat('dd/MM/yyyy').format(_date)),
                            ),
                          ),
                          const SizedBox(height: 16),

                          // Amount
                          TextFormField(
                            controller: _amountCtrl,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            decoration: const InputDecoration(
                              labelText: 'Valor (R$)',
                              prefixIcon: Icon(Icons.attach_money_outlined),
                              border: OutlineInputBorder(),
                            ),
                            validator: (val) {
                              if (val == null || val.isEmpty) return 'Insira o valor';
                              final cleanVal = val.replaceAll(',', '.');
                              if (double.tryParse(cleanVal) == null || double.parse(cleanVal) <= 0) {
                                return 'Valor inválido';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),

                          // Description
                          TextFormField(
                            controller: _descriptionCtrl,
                            decoration: const InputDecoration(
                              labelText: 'Descrição / Lançamento',
                              prefixIcon: Icon(Icons.description_outlined),
                              border: OutlineInputBorder(),
                            ),
                            validator: (val) => val == null || val.isEmpty ? 'Insira a descrição' : null,
                          ),
                          const SizedBox(height: 16),

                          // Category select
                          DropdownButtonFormField<String>(
                            value: _selectedCategoryId,
                            items: _filteredCategories.map((c) {
                              return DropdownMenuItem<String>(
                                value: c['id'],
                                child: Text(c['name']),
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
                              prefixIcon: Icon(Icons.category_outlined),
                              border: OutlineInputBorder(),
                            ),
                            validator: (val) => val == null ? 'Selecione a categoria' : null,
                          ),
                          const SizedBox(height: 16),

                          // Subcategory select
                          DropdownButtonFormField<String>(
                            value: _selectedSubcategoryId,
                            items: _subcategories.map((s) {
                              return DropdownMenuItem<String>(
                                value: s['id'],
                                child: Text(s['name']),
                              );
                            }).toList(),
                            onChanged: (val) => setState(() => _selectedSubcategoryId = val),
                            decoration: InputDecoration(
                              labelText: 'Subcategoria (Opcional)',
                              prefixIcon: const Icon(Icons.label_outline),
                              border: const OutlineInputBorder(),
                              enabled: _selectedCategoryId != null && _subcategories.isNotEmpty,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Receipt Upload
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: theme.cardColor,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.white10),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Anexar Comprovante / Recibo',
                            style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          const SizedBox(height: 16),
                          if (_imageFile != null) ...[
                            ClipRRect(
                              borderRadius: BorderRadius.circular(10),
                              child: Image.file(
                                _imageFile!,
                                height: 180,
                                width: double.infinity,
                                fit: BoxFit.cover,
                              ),
                            ),
                            const SizedBox(height: 12),
                            TextButton.icon(
                              onPressed: () => setState(() => _imageFile = null),
                              icon: const Icon(Icons.delete_outline, color: Colors.redAccent),
                              label: const Text('Remover Imagem', style: TextStyle(color: Colors.redAccent)),
                            ),
                          ] else ...[
                            Row(
                              children: [
                                Expanded(
                                  child: OutlinedButton.icon(
                                    onPressed: () => _pickImage(ImageSource.camera),
                                    icon: const Icon(Icons.camera_alt_outlined),
                                    label: const Text('Tirar Foto'),
                                    style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 12)),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: OutlinedButton.icon(
                                    onPressed: () => _pickImage(ImageSource.gallery),
                                    icon: const Icon(Icons.image_search_outlined),
                                    label: const Text('Galeria'),
                                    style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 12)),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 32),

                    // Save Button
                    ElevatedButton(
                      onPressed: _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: theme.primaryColor,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text(
                        'Salvar Lançamento',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
