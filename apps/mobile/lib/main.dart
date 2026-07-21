import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'theme/app_colors.dart';
import 'theme/app_theme.dart';
import 'providers/auth_provider.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Supabase.initialize(
    url: const String.fromEnvironment(
      'SUPABASE_URL',
      defaultValue: 'YOUR_SUPABASE_URL',
    ),
    anonKey: const String.fromEnvironment(
      'SUPABASE_ANON_KEY',
      defaultValue: 'YOUR_SUPABASE_ANON_KEY',
    ),
  );
  runApp(const ProviderScope(child: OrganizAIApp()));
}

class OrganizAIApp extends StatelessWidget {
  const OrganizAIApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'OrganizAI',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.dark,
      home: const AuthGate(),
    );
  }
}

class AuthGate extends ConsumerWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    if (authState.isLoading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
      );
    }

    if (!authState.isAuthenticated) {
      return const LoginScreen();
    }

    return const HomeScreen();
  }
}
