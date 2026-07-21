import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/receipt_item.dart';
import '../services/receipt_service.dart';

/// Estado do processo de escaneamento de recibo
class ReceiptScanState {
  final bool isScanning;
  final bool isParsing;
  final String? rawText;
  final List<ReceiptItem> items;
  final String? error;
  final File? scannedImage;

  const ReceiptScanState({
    this.isScanning = false,
    this.isParsing = false,
    this.rawText,
    this.items = const [],
    this.error,
    this.scannedImage,
  });

  ReceiptScanState copyWith({
    bool? isScanning,
    bool? isParsing,
    String? rawText,
    List<ReceiptItem>? items,
    String? error,
    File? scannedImage,
    bool clearError = false,
    bool clearImage = false,
  }) {
    return ReceiptScanState(
      isScanning: isScanning ?? this.isScanning,
      isParsing: isParsing ?? this.isParsing,
      rawText: rawText ?? this.rawText,
      items: items ?? this.items,
      error: clearError ? null : (error ?? this.error),
      scannedImage: clearImage ? null : (scannedImage ?? this.scannedImage),
    );
  }

  double get itemsTotal =>
      items.fold(0.0, (sum, item) => sum + item.totalPrice);

  bool get hasItems => items.isNotEmpty;
}

class ReceiptScanNotifier extends StateNotifier<ReceiptScanState> {
  final _service = ReceiptService();

  ReceiptScanNotifier() : super(const ReceiptScanState());

  /// Escaneia uma imagem e parseia os itens
  Future<void> scanImage(File imageFile) async {
    state = state.copyWith(
      isScanning: true,
      scannedImage: imageFile,
      clearError: true,
    );

    try {
      // 1. OCR na imagem
      final rawText = await _service.recognizeText(imageFile);

      state = state.copyWith(
        isScanning: false,
        isParsing: true,
        rawText: rawText,
      );

      // 2. Parse do texto
      final items = _service.parseReceiptText(rawText);

      state = state.copyWith(
        isParsing: false,
        items: items,
      );
    } catch (e) {
      state = state.copyWith(
        isScanning: false,
        isParsing: false,
        error: 'Erro ao escanear: ${e.toString()}',
      );
    }
  }

  /// Salva os itens no banco e retorna o total
  Future<double> saveItems({
    required String transactionId,
    required String familyId,
  }) async {
    if (state.items.isEmpty) return 0.0;

    await _service.saveReceiptItems(
      transactionId: transactionId,
      familyId: familyId,
      items: state.items,
    );

    return state.itemsTotal;
  }

  /// Limpa o estado
  void reset() {
    state = const ReceiptScanState();
  }

  /// Remove um item da lista
  void removeItem(int index) {
    final newItems = List<ReceiptItem>.from(state.items);
    if (index >= 0 && index < newItems.length) {
      newItems.removeAt(index);
      state = state.copyWith(items: newItems);
    }
  }

  /// Atualiza um item da lista
  void updateItem(int index, ReceiptItem updatedItem) {
    final newItems = List<ReceiptItem>.from(state.items);
    if (index >= 0 && index < newItems.length) {
      newItems[index] = updatedItem;
      state = state.copyWith(items: newItems);
    }
  }
}

final receiptScanProvider =
    StateNotifierProvider<ReceiptScanNotifier, ReceiptScanState>((ref) {
  return ReceiptScanNotifier();
});

/// Provider para buscar itens de recibo já salvos
final receiptItemsProvider =
    FutureProvider.family<List<ReceiptItem>, String>((ref, transactionId) async {
  final service = ReceiptService();
  return service.getReceiptItems(transactionId);
});
