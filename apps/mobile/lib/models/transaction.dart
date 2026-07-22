import 'category.dart';
import 'subcategory.dart';
import 'profile.dart';

class AppTransaction {
  final String id;
  final String familyId;
  final DateTime date;
  final String description;
  final String categoryId;
  final String? subcategoryId;
  final String type;
  final double amount;
  final String createdBy;
  final String? attachmentUrl;
  final DateTime createdAt;

  final Category? category;
  final Subcategory? subcategory;
  final Profile? profile;

  const AppTransaction({
    required this.id,
    required this.familyId,
    required this.date,
    required this.description,
    required this.categoryId,
    this.subcategoryId,
    required this.type,
    required this.amount,
    required this.createdBy,
    this.attachmentUrl,
    required this.createdAt,
    this.category,
    this.subcategory,
    this.profile,
  });

  factory AppTransaction.fromJson(Map<String, dynamic> json) {
    return AppTransaction(
      id: json['id'] as String,
      familyId: json['family_id'] as String,
      date: DateTime.parse(json['date'] as String),
      description: json['description'] as String? ?? '',
      categoryId: json['category_id'] as String,
      subcategoryId: json['subcategory_id'] as String?,
      type: json['type'] as String,
      amount: (json['amount'] as num).toDouble(),
      createdBy: json['created_by'] as String,
      attachmentUrl: json['attachment_url'] as String?,
      createdAt: DateTime.parse(
        json['created_at'] as String? ??
            DateTime.now().toIso8601String(),
      ),
      category: json['categories'] != null
          ? Category.fromJson(json['categories'] as Map<String, dynamic>)
          : null,
      subcategory: json['subcategories'] != null
          ? Subcategory.fromJson(
              json['subcategories'] as Map<String, dynamic>,
            )
          : null,
      profile: json['profiles'] != null
          ? Profile.fromJson(json['profiles'] as Map<String, dynamic>)
          : null,
    );
  }

  bool get isIncome => type == 'income';

  String get monthKey =>
      '${date.year}-${date.month.toString().padLeft(2, '0')}';

  String get dayKey =>
      '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
}
