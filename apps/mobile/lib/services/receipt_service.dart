import 'dart:io';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import '../core/supabase_client.dart';
import '../models/receipt_item.dart';

class ReceiptService {
  /// Escaneia uma imagem e retorna o texto bruto reconhecido
  Future<String> recognizeText(File imageFile) async {
    final inputImage = InputImage.fromFile(imageFile);
    final textRecognizer = TextRecognizer(script: TextRecognitionScript.latin);

    try {
      final recognized = await textRecognizer.processImage(inputImage);
      return recognized.text;
    } finally {
      textRecognizer.close();
    }
  }

  /// Faz o parse do texto bruto do recibo e retorna itens estruturados
  List<ReceiptItem> parseReceiptText(String rawText) {
    final lines = rawText.split('\n').map((l) => l.trim()).where((l) => l.isNotEmpty).toList();
    final items = <ReceiptItem>[];

    // Padrões para identificar linhas de item em notas fiscais brasileiras
    // Formato típico: "NOME DO PRODUTO  QTD x PREÇO" ou "NOME DO PRODUTO  PREÇO"
    final itemPattern = RegExp(
      r'^(.+?)\s+(\d+)\s*[xX]\s*R?\$?\s*(\d+[.,]\d{2})',
      caseSensitive: false,
    );
    final simpleItemPattern = RegExp(
      r'^(.+?)\s+R?\$?\s*(\d+[.,]\d{2})$',
      caseSensitive: false,
    );
    // Padrão com unidade: "1.500KG X R$ 5,99 = R$ 8,98"
    final unitPattern = RegExp(
      r'^(.+?)\s+(\d+[.,]?\d*)\s*(KG|G|LT|L|UN|MT|M)\s*[xX]?\s*R?\$?\s*(\d+[.,]\d{2})',
      caseSensitive: false,
    );
    // Padrão com igualdade: "PRODUTO  R$ 5,99 = R$ 5,99"
    final equalsPattern = RegExp(
      r'^(.+?)\s+R?\$?\s*(\d+[.,]\d{2})\s*=\s*R?\$?\s*(\d+[.,]\d{2})',
      caseSensitive: false,
    );

    // Palavras-chave que indicam linhas que NÃO são itens
    final skipKeywords = [
      'subtotal', 'total', 'desconto', 'acréscimo', 'troco',
      'pagamento', 'dinheiro', 'crédito', 'débito', 'pix',
      'cpf', 'cnpj', 'nota fiscal', 'nfce', 'sat',
      'emitido', 'emissão', 'validade', 'código', 'barras',
      'operador', 'caixa', 'ticket', 'cupom', 'fiscal',
      'igual a zero', 'items:', 'item', 'qtde', 'valor',
      'produto', 'descrição', 'unidade', 'preço',
    ];

    for (int i = 0; i < lines.length; i++) {
      final line = lines[i];
      final lowerLine = line.toLowerCase();

      // Pular linhas que são claramente totais, cabeçalhos, rodapés
      if (skipKeywords.any((kw) => lowerLine.contains(kw))) continue;
      if (lowerLine.startsWith('*')) continue;
      if (line.length < 3) continue;

      // Tentar padrão com quantidade: "ARROZ 2 x 12,90"
      var match = itemPattern.firstMatch(line);
      if (match != null) {
        final name = match.group(1)!.trim();
        final qty = int.parse(match.group(2)!);
        final price = _parsePrice(match.group(3)!);
        items.add(ReceiptItem(
          itemName: _cleanItemName(name),
          quantity: qty.toDouble(),
          unitPrice: price,
          totalPrice: qty * price,
          lineNumber: i + 1,
        ));
        continue;
      }

      // Tentar padrão com unidade: "1.500KG X R$ 5,99"
      match = unitPattern.firstMatch(line);
      if (match != null) {
        final name = match.group(1)!.trim();
        final qty = _parsePrice(match.group(2)!);
        final price = _parsePrice(match.group(4)!);
        items.add(ReceiptItem(
          itemName: _cleanItemName(name),
          quantity: qty,
          unitPrice: price,
          totalPrice: qty * price,
          lineNumber: i + 1,
        ));
        continue;
      }

      // Tentar padrão com igualdade: "PRODUTO R$ 5,99 = R$ 5,99"
      match = equalsPattern.firstMatch(line);
      if (match != null) {
        final name = match.group(1)!.trim();
        final price = _parsePrice(match.group(3)!);
        items.add(ReceiptItem(
          itemName: _cleanItemName(name),
          quantity: 1.0,
          unitPrice: price,
          totalPrice: price,
          lineNumber: i + 1,
        ));
        continue;
      }

      // Tentar padrão simples: "ARROZ TIPO 1 12,90"
      match = simpleItemPattern.firstMatch(line);
      if (match != null) {
        final name = match.group(1)!.trim();
        final price = _parsePrice(match.group(2)!);

        // Filtrar falsos positivos (preços muito baixos que podem ser códigos)
        if (price > 0.10 && name.length > 2) {
          items.add(ReceiptItem(
            itemName: _cleanItemName(name),
            quantity: 1.0,
            unitPrice: price,
            totalPrice: price,
            lineNumber: i + 1,
          ));
        }
      }
    }

    return items;
  }

  /// Calcula o total dos itens parseados
  double calculateItemsTotal(List<ReceiptItem> items) {
    return items.fold(0.0, (sum, item) => sum + item.totalPrice);
  }

  /// Salva os itens do recibo no Supabase
  Future<void> saveReceiptItems({
    required String transactionId,
    required String familyId,
    required List<ReceiptItem> items,
  }) async {
    if (items.isEmpty) return;

    // Deletar itens existentes desta transação (para re-escaneamento)
    await supabase
        .from('receipt_items')
        .delete()
        .eq('transaction_id', transactionId);

    // Inserir novos itens
    final rows = items.map((item) => item.toInsertMap(
      transactionId: transactionId,
      familyId: familyId,
    )).toList();

    await supabase.from('receipt_items').insert(rows);
  }

  /// Busca os itens de recibo de uma transação
  Future<List<ReceiptItem>> getReceiptItems(String transactionId) async {
    final res = await supabase
        .from('receipt_items')
        .select()
        .eq('transaction_id', transactionId)
        .order('line_number', ascending: true);

    return (res as List)
        .map((r) => ReceiptItem.fromJson(r as Map<String, dynamic>))
        .toList();
  }

  /// Deleta os itens de recibo de uma transação
  Future<void> deleteReceiptItems(String transactionId) async {
    await supabase
        .from('receipt_items')
        .delete()
        .eq('transaction_id', transactionId);
  }

  /// Converte preço string para double (ex: "12,90" -> 12.90)
  double _parsePrice(String priceStr) {
    // Remove R$, espaços
    final clean = priceStr.replaceAll(RegExp(r'[R$\s]'), '');
    // Troca vírgula por ponto
    final normalized = clean.replaceAll(',', '.');
    return double.tryParse(normalized) ?? 0.0;
  }

  /// Limpa o nome do item (remove asteriscos, espaços extras, etc.)
  String _cleanItemName(String name) {
    return name
        .replaceAll(RegExp(r'[*#]'), '')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }
}
