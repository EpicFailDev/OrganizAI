class ReceiptItem {
  final String? id;
  final String? transactionId;
  final String? familyId;
  final String itemName;
  final double quantity;
  final double unitPrice;
  final double totalPrice;
  final int? lineNumber;
  final DateTime? createdAt;

  const ReceiptItem({
    this.id,
    this.transactionId,
    this.familyId,
    required this.itemName,
    this.quantity = 1.0,
    required this.unitPrice,
    required this.totalPrice,
    this.lineNumber,
    this.createdAt,
  });

  factory ReceiptItem.fromJson(Map<String, dynamic> json) {
    return ReceiptItem(
      id: json['id'] as String?,
      transactionId: json['transaction_id'] as String?,
      familyId: json['family_id'] as String?,
      itemName: json['item_name'] as String,
      quantity: (json['quantity'] as num?)?.toDouble() ?? 1.0,
      unitPrice: (json['unit_price'] as num).toDouble(),
      totalPrice: (json['total_price'] as num).toDouble(),
      lineNumber: json['line_number'] as int?,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toInsertMap({
    required String transactionId,
    required String familyId,
  }) {
    return {
      'transaction_id': transactionId,
      'family_id': familyId,
      'item_name': itemName,
      'quantity': quantity,
      'unit_price': unitPrice,
      'total_price': totalPrice,
      'line_number': lineNumber,
    };
  }
}
