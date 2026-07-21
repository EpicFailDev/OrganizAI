import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
import '../theme/app_spacing.dart';
import '../theme/app_radius.dart';
import '../providers/receipt_provider.dart';
import '../providers/family_provider.dart';
import '../providers/transaction_provider.dart';
import '../providers/category_provider.dart';
import '../models/receipt_item.dart';
import '../services/receipt_service.dart';
import '../services/storage_service.dart';
import '../widgets/dark_card.dart';
import '../widgets/primary_button.dart';
import '../core/snackbar_helper.dart';

class ScanReceiptScreen extends ConsumerStatefulWidget {
  const ScanReceiptScreen({super.key});

  @override
  ConsumerState<ScanReceiptScreen> createState() => _ScanReceiptScreenState();
}

class _ScanReceiptScreenState extends ConsumerState<ScanReceiptScreen> {
  final _picker = ImagePicker();
  final _storageService = StorageService();
  final _receiptService = ReceiptService();

  bool _saving = false;
  String _type = 'expense';
  DateTime _date = DateTime.now();
  String? _selectedCategoryId;

  @override
  void initState() {
    super.initState();
    // Auto-select "Alimentação" category for expenses
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final categories = ref.read(categoryProvider).valueOrNull ?? [];
      final alim = categories.firstWhere(
        (c) => c.name == 'Alimentação' && c.type == 'expense',
        orElse: () => categories.firstWhere(
          (c) => c.type == 'expense',
          orElse: () => categories.first,
        ),
      );
      setState(() => _selectedCategoryId = alim.id);
    });
  }

  @override
  void dispose() {
    // Reset provider when leaving
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(receiptScanProvider.notifier).reset();
    });
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picked = await _picker.pickImage(
        source: source,
        maxWidth: 2048,
        maxHeight: 2048,
        imageQuality: 90,
      );

      if (picked != null) {
        final file = File(picked.path);
        await ref.read(receiptScanProvider.notifier).scanImage(file);
      }
    } catch (e) {
      if (mounted) {
        showErrorSnackBar(context, 'Erro ao selecionar imagem: $e');
      }
    }
  }

  Future<void> _saveReceipt() async {
    final state = ref.read(receiptScanProvider);
    if (!state.hasItems) {
      showErrorSnackBar(context, 'Nenhum item para salvar.');
      return;
    }

    if (_selectedCategoryId == null) {
      showErrorSnackBar(context, 'Selecione uma categoria.');
      return;
    }

    final familyId = ref.read(familyProvider).valueOrNull?.familyId;
    if (familyId == null) {
      showErrorSnackBar(context, 'Nenhuma família configurada.');
      return;
    }

    setState(() => _saving = true);

    try {
      // 1. Upload da imagem
      String? attachmentUrl;
      if (state.scannedImage != null) {
        attachmentUrl = await _storageService.uploadReceipt(
          familyId: familyId,
          file: state.scannedImage!,
        );
      }

      // 2. Criar a transação com o total dos itens
      final total = state.itemsTotal;
      final itemCount = state.items.length;
      final description = 'Mercado ($itemCount ${itemCount == 1 ? 'item' : 'itens'})';

      await ref.read(transactionProvider.notifier).addTransaction(
        familyId: familyId,
        date: _date,
        description: description,
        categoryId: _selectedCategoryId!,
        type: _type,
        amount: total,
        attachmentUrl: attachmentUrl,
      );

      // 3. Buscar a transação recém-criada para vincular os itens
      final txs = ref.read(transactionProvider).valueOrNull?.transactions ?? [];
      final latestTx = txs.isNotEmpty ? txs.first : null;

      if (latestTx != null) {
        // 4. Salvar os itens do recibo
        await _receiptService.saveReceiptItems(
          transactionId: latestTx.id,
          familyId: familyId,
          items: state.items,
        );
      }

      if (mounted) {
        showSuccessSnackBar(context, 'Nota fiscal salva com sucesso!');
        ref.read(receiptScanProvider.notifier).reset();
        ref.invalidate(transactionProvider);
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        showErrorSnackBar(context, 'Erro ao salvar: $e');
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scanState = ref.watch(receiptScanProvider);
    final categories = ref.watch(categoryProvider).valueOrNull ?? [];
    final expenseCategories = categories.where((c) => c.type == 'expense').toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Escanear Nota Fiscal'),
        actions: [
          if (scanState.hasItems)
            TextButton(
              onPressed: _saving ? null : _saveReceipt,
              child: _saving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text(
                      'Salvar',
                      style: TextStyle(color: AppColors.primary),
                    ),
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Área de captura
            if (!scanState.hasItems && !scanState.isScanning && !scanState.isParsing)
              _buildCaptureArea(scanState),

            // Loading
            if (scanState.isScanning || scanState.isParsing)
              _buildLoadingArea(scanState),

            // Erro
            if (scanState.error != null)
              _buildErrorArea(scanState),

            // Preview da imagem + itens
            if (scanState.hasItems) ...[
              _buildImagePreview(scanState),
              const SizedBox(height: AppSpacing.lg),
              _buildCategorySelector(expenseCategories),
              const SizedBox(height: AppSpacing.lg),
              _buildDateSelector(),
              const SizedBox(height: AppSpacing.lg),
              _buildItemsList(scanState),
              const SizedBox(height: AppSpacing.lg),
              _buildSummary(scanState),
              const SizedBox(height: AppSpacing.xxl),
              PrimaryButton(
                onPressed: _saving ? null : _saveReceipt,
                label: _saving ? 'Salvando...' : 'Salvar Nota Fiscal',
                icon: Icons.check,
              ),
            ],

            // Botão de re-escanear
            if (scanState.hasItems) ...[
              const SizedBox(height: AppSpacing.md),
              Center(
                child: TextButton.icon(
                  onPressed: () {
                    ref.read(receiptScanProvider.notifier).reset();
                  },
                  icon: const Icon(Icons.refresh, color: AppColors.textSecondary),
                  label: const Text(
                    'Escanear outra nota',
                    style: TextStyle(color: AppColors.textSecondary),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildCaptureArea(ReceiptScanState scanState) {
    return DarkCard(
      child: Column(
        children: [
          const Icon(
            Icons.document_scanner_outlined,
            size: 64,
            color: AppColors.primary,
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            'Escaneie sua nota fiscal',
            style: AppTextStyles.headlineMedium,
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Tire uma foto ou selecione da galeria.\n'
            'O app identificará os itens automaticamente.',
            textAlign: TextAlign.center,
            style: AppTextStyles.bodyMedium.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: AppSpacing.xxl),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _pickImage(ImageSource.camera),
                  icon: const Icon(Icons.camera_alt_outlined),
                  label: const Text('Câmera'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _pickImage(ImageSource.gallery),
                  icon: const Icon(Icons.photo_library_outlined),
                  label: const Text('Galeria'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLoadingArea(ReceiptScanState scanState) {
    return DarkCard(
      child: Column(
        children: [
          if (scanState.scannedImage != null)
            ClipRRect(
              borderRadius: AppRadius.mdAll,
              child: Image.file(
                scanState.scannedImage!,
                height: 160,
                width: double.infinity,
                fit: BoxFit.cover,
              ),
            ),
          const SizedBox(height: AppSpacing.xl),
          const CircularProgressIndicator(color: AppColors.primary),
          const SizedBox(height: AppSpacing.lg),
          Text(
            scanState.isScanning
                ? 'Reconhecendo texto na imagem...'
                : 'Analisando itens da nota fiscal...',
            style: AppTextStyles.bodyLarge.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorArea(ReceiptScanState scanState) {
    return DarkCard(
      color: AppColors.expenseBg,
      child: Column(
        children: [
          const Icon(Icons.error_outline, size: 48, color: AppColors.expense),
          const SizedBox(height: AppSpacing.md),
          Text(
            scanState.error!,
            textAlign: TextAlign.center,
            style: AppTextStyles.bodyMedium.copyWith(color: AppColors.expense),
          ),
          const SizedBox(height: AppSpacing.lg),
          OutlinedButton(
            onPressed: () {
              ref.read(receiptScanProvider.notifier).reset();
            },
            child: const Text('Tentar novamente'),
          ),
        ],
      ),
    );
  }

  Widget _buildImagePreview(ReceiptScanState scanState) {
    if (scanState.scannedImage == null) return const SizedBox.shrink();

    return DarkCard(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: ClipRRect(
        borderRadius: AppRadius.smAll,
        child: Image.file(
          scanState.scannedImage!,
          height: 140,
          width: double.infinity,
          fit: BoxFit.cover,
        ),
      ),
    );
  }

  Widget _buildCategorySelector(List categories) {
    return DarkCard(
      child: DropdownButtonFormField<String>(
        value: _selectedCategoryId,
        items: categories.map((c) {
          return DropdownMenuItem<String>(
            value: c.id,
            child: Text(c.name),
          );
        }).toList(),
        onChanged: (val) => setState(() => _selectedCategoryId = val),
        decoration: const InputDecoration(
          labelText: 'Categoria',
          prefixIcon: Icon(Icons.category_outlined),
        ),
      ),
    );
  }

  Widget _buildDateSelector() {
    return DarkCard(
      child: InkWell(
        onTap: () async {
          final picked = await showDatePicker(
            context: context,
            initialDate: _date,
            firstDate: DateTime(2020),
            lastDate: DateTime(2030),
          );
          if (picked != null) setState(() => _date = picked);
        },
        child: InputDecorator(
          decoration: const InputDecoration(
            labelText: 'Data',
            prefixIcon: Icon(Icons.calendar_today_outlined),
          ),
          child: Text(
            DateFormat('dd/MM/yyyy').format(_date),
            style: AppTextStyles.bodyLarge,
          ),
        ),
      ),
    );
  }

  Widget _buildItemsList(ReceiptScanState scanState) {
    final currencyFormat = NumberFormat.simpleCurrency(locale: 'pt_BR');

    return DarkCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Itens Identificados',
                style: AppTextStyles.headlineMedium,
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primaryMuted,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${scanState.items.length} ${scanState.items.length == 1 ? 'item' : 'itens'}',
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          const Divider(color: AppColors.surfaceBorder),
          ...scanState.items.asMap().entries.map((entry) {
            final idx = entry.key;
            final item = entry.value;
            return _ReceiptItemTile(
              item: item,
              currencyFormat: currencyFormat,
              onRemove: () => ref.read(receiptScanProvider.notifier).removeItem(idx),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildSummary(ReceiptScanState scanState) {
    final currencyFormat = NumberFormat.simpleCurrency(locale: 'pt_BR');

    return DarkCard(
      color: AppColors.surfaceVariant,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            'Total dos Itens',
            style: AppTextStyles.bodyLarge.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          Text(
            currencyFormat.format(scanState.itemsTotal),
            style: AppTextStyles.kpiValueSmall.copyWith(
              color: AppColors.primary,
            ),
          ),
        ],
      ),
    );
  }
}

class _ReceiptItemTile extends StatelessWidget {
  final ReceiptItem item;
  final NumberFormat currencyFormat;
  final VoidCallback onRemove;

  const _ReceiptItemTile({
    required this.item,
    required this.currencyFormat,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: const BoxDecoration(
        border: Border(
          bottom: BorderSide(color: AppColors.surfaceBorder, width: 0.5),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.itemName,
                  style: AppTextStyles.bodyMedium.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  '${item.quantity.toStringAsFixed(item.quantity.truncateToDouble() == item.quantity ? 0 : 2)}x ${currencyFormat.format(item.unitPrice)}',
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.textTertiary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          Text(
            currencyFormat.format(item.totalPrice),
            style: AppTextStyles.bodyMedium.copyWith(
              fontWeight: FontWeight.bold,
              color: AppColors.expense,
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          GestureDetector(
            onTap: onRemove,
            child: const Icon(
              Icons.close,
              size: 18,
              color: AppColors.textTertiary,
            ),
          ),
        ],
      ),
    );
  }
}
