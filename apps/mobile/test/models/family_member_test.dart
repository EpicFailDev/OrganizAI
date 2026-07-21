import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/models/family_member.dart';

void main() {
  group('FamilyMember', () {
    test('fromJson parses correctly with nested objects', () {
      final json = {
        'family_id': 'fam-1',
        'profile_id': 'user-1',
        'role': 'admin',
        'profiles': {
          'id': 'user-1',
          'display_name': 'Guilherme',
        },
        'family_groups': {
          'id': 'fam-1',
          'name': 'Minha Família',
        },
      };

      final member = FamilyMember.fromJson(json);

      expect(member.familyId, 'fam-1');
      expect(member.profileId, 'user-1');
      expect(member.role, 'admin');
      expect(member.isAdmin, true);
      expect(member.profile?.displayName, 'Guilherme');
      expect(member.familyGroup?.name, 'Minha Família');
    });

    test('isAdmin returns false for member role', () {
      final member = FamilyMember(
        familyId: 'fam-1',
        profileId: 'user-2',
        role: 'member',
      );

      expect(member.isAdmin, false);
    });
  });
}
