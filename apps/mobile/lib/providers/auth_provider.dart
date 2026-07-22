import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/auth_service.dart';

class AuthViewState {
  final bool isAuthenticated;
  final bool isLoading;

  const AuthViewState({
    this.isAuthenticated = false,
    this.isLoading = true,
  });
}

class AuthNotifier extends Notifier<AuthViewState> {
  late final AuthService _authService;
  StreamSubscription<AuthState>? _sub;

  @override
  AuthViewState build() {
    _authService = AuthService();
    _listenToAuthChanges();
    return const AuthViewState();
  }

  void _listenToAuthChanges() {
    _sub = _authService.authStateChanges.listen(
      (authState) {
        final event = authState.event;

        if (event == AuthChangeEvent.initialSession ||
            event == AuthChangeEvent.signedIn ||
            event == AuthChangeEvent.tokenRefreshed) {
          final user = _authService.currentUser;
          state = AuthViewState(
            isAuthenticated: user != null,
            isLoading: false,
          );
        } else if (event == AuthChangeEvent.signedOut) {
          state = const AuthViewState(isAuthenticated: false, isLoading: false);
        }
      },
      onError: (_) {
        state = const AuthViewState(isAuthenticated: false, isLoading: false);
      },
    );
  }

  AuthService get service => _authService;
}

final authProvider = NotifierProvider<AuthNotifier, AuthViewState>(
  AuthNotifier.new,
);
