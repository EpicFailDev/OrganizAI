import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
import '../theme/app_spacing.dart';
import '../animations/fade_slide_transition.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool _loading = false;
  String? _selectedUser;

  // Credenciais fixas para login automático
  static const Map<String, Map<String, String>> _users = {
    'Guilherme': {
      'email': 'gui@organizai.local',
      'password': 'OrganizAI2026!',
    },
    'Jenifer': {
      'email': 'jen@organizai.local',
      'password': 'OrganizAI2026!',
    },
  };

  Future<void> _loginAs(String name) async {
    if (_loading) return;

    setState(() {
      _loading = true;
      _selectedUser = name;
    });

    final supabase = Supabase.instance.client;
    final user = _users[name]!;

    try {
      // Tenta fazer login
      await supabase.auth.signInWithPassword(
        email: user['email']!,
        password: user['password']!,
      );
    } on AuthException catch (e) {
      // Se usuário não existe, cria a conta
      if (e.message.contains('Invalid login credentials')) {
        try {
          await supabase.auth.signUp(
            email: user['email']!,
            password: user['password']!,
            data: {'display_name': name},
          );
        } catch (signUpError) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Erro ao criar conta: $signUpError'),
                backgroundColor: AppColors.expenseBg,
              ),
            );
          }
          return;
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(e.message),
              backgroundColor: AppColors.expenseBg,
            ),
          );
        }
        return;
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erro: $e'),
            backgroundColor: AppColors.expenseBg,
          ),
        );
      }
      return;
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment.topCenter,
            radius: 1.5,
            colors: [
              AppColors.primaryMuted,
              AppColors.background,
            ],
            stops: [0.0, 0.6],
          ),
        ),
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.xxl),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Logo
                FadeSlideTransition(
                  delay: Duration.zero,
                  child: Column(
                    children: [
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.15),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.account_balance_wallet_rounded,
                          size: 40,
                          color: AppColors.primary,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      Text(
                        'OrganizAI',
                        textAlign: TextAlign.center,
                        style: AppTextStyles.displayLarge.copyWith(
                          color: AppColors.primary,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        'Controle financeiro da sua casa',
                        textAlign: TextAlign.center,
                        style: AppTextStyles.bodyMedium,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.xxxl),

                // Título da seleção
                FadeSlideTransition(
                  delay: const Duration(milliseconds: 150),
                  child: Text(
                    'Quem está entrando?',
                    textAlign: TextAlign.center,
                    style: AppTextStyles.titleLarge.copyWith(
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.xxl),

                // Botão Guilherme
                FadeSlideTransition(
                  delay: const Duration(milliseconds: 200),
                  child: _ProfileButton(
                    name: 'Guilherme',
                    icon: Icons.person,
                    isLoading: _loading && _selectedUser == 'Guilherme',
                    onPressed: () => _loginAs('Guilherme'),
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),

                // Botão Jenifer
                FadeSlideTransition(
                  delay: const Duration(milliseconds: 300),
                  child: _ProfileButton(
                    name: 'Jenifer',
                    icon: Icons.person,
                    isLoading: _loading && _selectedUser == 'Jenifer',
                    onPressed: () => _loginAs('Jenifer'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ProfileButton extends StatelessWidget {
  final String name;
  final IconData icon;
  final bool isLoading;
  final VoidCallback onPressed;

  const _ProfileButton({
    required this.name,
    required this.icon,
    required this.isLoading,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 80,
      child: ElevatedButton(
        onPressed: isLoading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.surface,
          foregroundColor: AppColors.textPrimary,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(
              color: AppColors.primary.withValues(alpha: 0.3),
              width: 1,
            ),
          ),
          elevation: 0,
        ),
        child: isLoading
            ? const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  color: AppColors.primary,
                  strokeWidth: 2,
                ),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      icon,
                      color: AppColors.primary,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.lg),
                  Text(
                    name,
                    style: AppTextStyles.titleLarge.copyWith(
                      color: AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
