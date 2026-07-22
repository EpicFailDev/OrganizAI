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
  String? _errorMsg;

  static const Map<String, Map<String, String>> _users = {
    'Guilherme': {
      'email': 'gui@organizai.local',
      'password': 'OrganizAI2026!',
      'role': 'Motorista',
    },
    'Jenifer': {
      'email': 'jen@organizai.local',
      'password': 'OrganizAI2026!',
      'role': 'Vendedora de Salgados',
    },
  };

  Future<void> _loginAs(String name) async {
    if (_loading) return;

    setState(() {
      _loading = true;
      _selectedUser = name;
      _errorMsg = null;
    });

    final supabase = Supabase.instance.client;
    final user = _users[name]!;

    try {
      await supabase.auth.signInWithPassword(
        email: user['email']!,
        password: user['password']!,
      );
    } on AuthException catch (e) {
      if (mounted) {
        setState(() => _errorMsg = e.message);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _errorMsg = 'Erro ao acessar. Tente novamente.');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment(0, -0.6),
            radius: 1.8,
            colors: [
              Color(0xFF0D2E1F),
              AppColors.background,
            ],
            stops: [0.0, 0.7],
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.xxl,
              vertical: AppSpacing.lg,
            ),
            child: Column(
              children: [
                const SizedBox(height: AppSpacing.xxl),

                FadeSlideTransition(
                  child: _buildLogo(),
                ),

                const SizedBox(height: AppSpacing.xxxl),

                FadeSlideTransition(
                  delay: const Duration(milliseconds: 100),
                  child: Column(
                    children: [
                      Text(
                        'Quem está usando agora?',
                        textAlign: TextAlign.center,
                        style: AppTextStyles.displayLarge.copyWith(
                          fontSize: 28,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        'Dados compartilhados entre os dois perfis.',
                        textAlign: TextAlign.center,
                        style: AppTextStyles.bodyMedium.copyWith(
                          color: AppColors.textSecondary,
                          height: 1.5,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: AppSpacing.xxxl),

                if (_errorMsg != null) ...[
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      color: AppColors.expenseBg.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: AppColors.expense.withValues(alpha: 0.4),
                      ),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.warning_amber_rounded,
                          color: AppColors.expense,
                          size: 20,
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: Text(
                            _errorMsg!,
                            style: AppTextStyles.bodySmall.copyWith(
                              color: AppColors.expense,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                ],

                FadeSlideTransition(
                  delay: const Duration(milliseconds: 200),
                  child: Column(
                    children: [
                      _ProfileButton(
                        name: 'Guilherme',
                        role: 'Motorista',
                        icon: Icons.person_rounded,
                        isLoading: _loading && _selectedUser == 'Guilherme',
                        isDisabled: _loading && _selectedUser != 'Guilherme',
                        color: AppColors.primary,
                        onTap: () => _loginAs('Guilherme'),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      _ProfileButton(
                        name: 'Jenifer',
                        role: 'Vendedora de Salgados',
                        icon: Icons.person_rounded,
                        isLoading: _loading && _selectedUser == 'Jenifer',
                        isDisabled: _loading && _selectedUser != 'Jenifer',
                        color: AppColors.secondary,
                        onTap: () => _loginAs('Jenifer'),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: AppSpacing.xxxl),

                FadeSlideTransition(
                  delay: const Duration(milliseconds: 350),
                  child: _buildSecurityInfo(),
                ),

                const SizedBox(height: AppSpacing.xxl),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLogo() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Icon(
            Icons.home_rounded,
            color: AppColors.primary,
            size: 22,
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        RichText(
          text: TextSpan(
            children: [
              TextSpan(
                text: 'Organiz',
                style: AppTextStyles.displayMedium.copyWith(
                  fontSize: 22,
                  color: AppColors.textPrimary,
                ),
              ),
              TextSpan(
                text: 'AI',
                style: AppTextStyles.displayMedium.copyWith(
                  fontSize: 22,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSecurityInfo() {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.surface.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppColors.surfaceBorder.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.shield_rounded,
              color: AppColors.primary,
              size: 20,
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Seus dados, sua família, sua segurança.',
                  style: AppTextStyles.labelLarge.copyWith(
                    fontSize: 13,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Utilizamos tecnologia de ponta para proteger o que realmente importa.',
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.textTertiary,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileButton extends StatelessWidget {
  final String name;
  final String role;
  final IconData icon;
  final bool isLoading;
  final bool isDisabled;
  final Color color;
  final VoidCallback onTap;

  const _ProfileButton({
    required this.name,
    required this.role,
    required this.icon,
    required this.isLoading,
    required this.isDisabled,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: isLoading || isDisabled ? null : onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(AppSpacing.lg),
        decoration: BoxDecoration(
          color: AppColors.surface.withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: AppColors.surfaceBorder.withValues(alpha: 0.4),
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(50),
                border: Border.all(
                  color: color.withValues(alpha: 0.3),
                ),
              ),
              child: isLoading
                  ? Padding(
                      padding: const EdgeInsets.all(14),
                      child: CircularProgressIndicator(
                        color: color,
                        strokeWidth: 2.5,
                      ),
                    )
                  : Icon(icon, color: color, size: 26),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: AppTextStyles.headlineLarge.copyWith(
                      fontSize: 16,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    role,
                    style: AppTextStyles.bodySmall.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right_rounded,
              color: color.withValues(alpha: isDisabled ? 0.2 : 0.6),
            ),
          ],
        ),
      ),
    );
  }
}
