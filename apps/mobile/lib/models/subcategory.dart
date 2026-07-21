class Subcategory {
  final String id;
  final String name;
  final String categoryId;

  const Subcategory({
    required this.id,
    required this.name,
    required this.categoryId,
  });

  factory Subcategory.fromJson(Map<String, dynamic> json) {
    return Subcategory(
      id: json['id'] as String,
      name: json['name'] as String,
      categoryId: json['category_id'] as String,
    );
  }
}
