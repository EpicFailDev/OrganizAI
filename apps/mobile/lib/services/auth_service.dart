import 'package:supabase_flutter/supabase_flutter.dart';
import '../core/supabase_client.dart';
import '../models/profile.dart';

class AuthService {
  User? get currentUser => supabase.auth.currentUser;

  Stream<AuthState> get authStateChanges => supabase.auth.onAuthStateChange;

  Future<void> signIn({
    required String email,
    required String password,
  }) async {
    await supabase.auth.signInWithPassword(
      email: email,
      password: password,
    );
  }

  Future<void> signUp({
    required String email,
    required String password,
    required String displayName,
  }) async {
    await supabase.auth.signUp(
      email: email,
      password: password,
      data: {'display_name': displayName},
    );
  }

  Future<void> signOut() async {
    await supabase.auth.signOut();
  }

  Future<Profile?> getProfile() async {
    final userId = currentUser?.id;
    if (userId == null) return null;
    final res = await supabase
        .from('profiles')
        .select()
        .eq('id', userId)
        .maybeSingle();
    return res != null ? Profile.fromJson(res) : null;
  }
}
