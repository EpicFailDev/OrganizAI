import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/family_group.dart';
import '../models/family_member.dart';
import '../services/family_service.dart';

class FamilyState {
  final FamilyGroup? group;
  final String? familyId;
  final List<FamilyMember> members;
  final bool isLoading;
  final String? error;

  const FamilyState({
    this.group,
    this.familyId,
    this.members = const [],
    this.isLoading = false,
    this.error,
  });

  bool get hasFamily => familyId != null;

  FamilyState copyWith({
    FamilyGroup? group,
    String? familyId,
    List<FamilyMember>? members,
    bool? isLoading,
    String? error,
  }) {
    return FamilyState(
      group: group ?? this.group,
      familyId: familyId ?? this.familyId,
      members: members ?? this.members,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class FamilyNotifier extends AsyncNotifier<FamilyState> {
  final _service = FamilyService();

  @override
  Future<FamilyState> build() async {
    return _fetchFamily();
  }

  Future<FamilyState> _fetchFamily() async {
    final result = await _service.getCurrentFamily();
    return FamilyState(
      group: result.group,
      familyId: result.familyId,
      members: result.members,
    );
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => _fetchFamily());
  }

  Future<void> createFamily(String name) async {
    await _service.createFamily(name);
    await refresh();
  }

  Future<void> joinFamily(String code) async {
    await _service.joinFamilyByCode(code);
    await refresh();
  }
}

final familyProvider =
    AsyncNotifierProvider<FamilyNotifier, FamilyState>(FamilyNotifier.new);
