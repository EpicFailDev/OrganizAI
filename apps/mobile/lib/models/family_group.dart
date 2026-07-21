class FamilyGroup {
  final String id;
  final String name;
  final String? inviteCode;
  final DateTime createdAt;

  const FamilyGroup({
    required this.id,
    required this.name,
    this.inviteCode,
    required this.createdAt,
  });

  factory FamilyGroup.fromJson(Map<String, dynamic> json) {
    return FamilyGroup(
      id: json['id'] as String,
      name: json['name'] as String,
      inviteCode: json['invite_code'] as String?,
      createdAt: DateTime.parse(
        json['created_at'] as String? ?? DateTime.now().toIso8601String(),
      ),
    );
  }
}
