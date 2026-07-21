import '../core/supabase_client.dart';
import '../models/family_group.dart';
import '../models/family_member.dart';

class FamilyResult {
  final FamilyGroup? group;
  final String? familyId;
  final List<FamilyMember> members;

  const FamilyResult({
    this.group,
    this.familyId,
    this.members = const [],
  });
}

class FamilyService {
  Future<FamilyResult> getCurrentFamily() async {
    final userId = supabase.auth.currentUser?.id;
    if (userId == null) {
      return const FamilyResult();
    }

    final memberRes = await supabase
        .from('family_members')
        .select('*, family_groups(*)')
        .eq('profile_id', userId)
        .maybeSingle();

    if (memberRes == null) {
      return const FamilyResult();
    }

    final familyId = memberRes['family_id'] as String;
    final group = FamilyGroup.fromJson(
      memberRes['family_groups'] as Map<String, dynamic>,
    );

    final membersRes = await supabase
        .from('family_members')
        .select('*, profiles(*)')
        .eq('family_id', familyId);

    final members = (membersRes as List)
        .map((m) => FamilyMember.fromJson(m as Map<String, dynamic>))
        .toList();

    return FamilyResult(group: group, familyId: familyId, members: members);
  }

  Future<FamilyGroup> createFamily(String name) async {
    final userId = supabase.auth.currentUser!.id;

    final groupRes = await supabase
        .from('family_groups')
        .insert({'name': name})
        .select()
        .single();

    await supabase.from('family_members').insert({
      'family_id': groupRes['id'],
      'profile_id': userId,
      'role': 'admin',
    });

    return FamilyGroup.fromJson(groupRes);
  }

  Future<void> joinFamilyByCode(String inviteCode) async {
    await supabase.rpc('join_family', params: {
      'p_invite_code': inviteCode,
    });
  }
}
