class RecurringBill {
  final String id;
  final String familyId;
  final String name;
  final double amount;
  final int dueDay;
  final String? categoryId;
  final String createdBy;
  final DateTime createdAt;
  final bool paid;
  final DateTime? paidAt;

  const RecurringBill({
    required this.id,
    required this.familyId,
    required this.name,
    required this.amount,
    required this.dueDay,
    this.categoryId,
    required this.createdBy,
    required this.createdAt,
    this.paid = false,
    this.paidAt,
  });

  factory RecurringBill.fromJson(Map<String, dynamic> json) {
    return RecurringBill(
      id: json['id'] as String,
      familyId: json['family_id'] as String,
      name: json['name'] as String,
      amount: (json['amount'] as num).toDouble(),
      dueDay: json['due_day'] as int,
      categoryId: json['category_id'] as String?,
      createdBy: json['created_by'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      paid: json['paid'] as bool? ?? false,
      paidAt: json['paid_at'] != null
          ? DateTime.parse(json['paid_at'] as String)
          : null,
    );
  }

  /// Calcula a data de vencimento para o mês atual (ou próximo)
  DateTime get currentDueDate {
    final now = DateTime.now();
    final due = DateTime(now.year, now.month, dueDay);
    return due.isBefore(now)
        ? DateTime(now.year, now.month + 1, dueDay)
        : due;
  }

  /// Dias restantes até o vencimento
  int get daysLeft {
    final due = currentDueDate;
    return due.difference(DateTime.now()).inDays;
  }
}