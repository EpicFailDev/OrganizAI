import 'family_group.dart';
import 'profile.dart';

class FamilyMember {
  final String familyId;
  final String profileId;
  final String role;
  final Profile? profile;
  final FamilyGroup? familyGroup;

  const FamilyMember({
    required this.familyId,
    required this.profileId,
    required this.role,
    this.profile,
    this.familyGroup,
  });

  factory FamilyMember.fromJson(Map<String, dynamic> json) {
    return FamilyMember(
      familyId: json['family_id'] as String,
      profileId: json['profile_id'] as String,
      role: json['role'] as String? ?? 'member',
      profile: json['profiles'] != null
          ? Profile.fromJson(json['profiles'] as Map<String, dynamic>)
          : null,
      familyGroup: json['family_groups'] != null
          ? FamilyGroup.fromJson(
              json['family_groups'] as Map<String, dynamic>,
            )
          : null,
    );
  }

  bool get isAdmin => role == 'admin';
}
