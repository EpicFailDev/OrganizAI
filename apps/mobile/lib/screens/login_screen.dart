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
    });

    final supabase = Supabase.instance.client;
    final user = _users[name]!;

    try {
      await supabase.auth.signInWithPassword(
        email: user['email']!,
        password: user['password']!,
      );
    } on AuthException catch (e) {
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

                // Logo
                FadeSlideTransition(
                  child: _buildLogo(),
                ),

                const SizedBox(height: AppSpacing.xxxl),

                // Título
                FadeSlideTransition(
                  delay: const Duration(milliseconds: 100),
                  child: Column(
                    children: [
                      Text(
                        'Bem-vindo! 👋',
                        textAlign: TextAlign.center,
                        style: AppTextStyles.displayLarge.copyWith(
                          fontSize: 28,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        'Para continue, selecione quem\nestá acessando hoje.',
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

                // Profile cards
                FadeSlideTransition(
                  delay: const Duration(milliseconds: 200),
                  child: Row(
                    children: [
                      Expanded(
                        child: _ProfileCard(
                          name: 'Guilherme',
                          role: 'Motorista',
                          isSelected: _selectedUser == 'Guilherme',
                          isPrincipal: true,
                          isLoading: _loading && _selectedUser == 'Guilherme',
                          gender: _ProfileGender.male,
                          onTap: () => _loginAs('Guilherme'),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: _ProfileCard(
                          name: 'Jenifer',
                          role: 'Vendedora de Salgados',
                          isSelected: _selectedUser == 'Jenifer',
                          isPrincipal: false,
                          isLoading: _loading && _selectedUser == 'Jenifer',
                          gender: _ProfileGender.female,
                          onTap: () => _loginAs('Jenifer'),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: AppSpacing.xxxl),

                // Security info
                FadeSlideTransition(
                  delay: const Duration(milliseconds: 350),
                  child: _buildSecurityInfo(),
                ),

                const SizedBox(height: AppSpacing.xxl),

                // Footer
                FadeSlideTransition(
                  delay: const Duration(milliseconds: 450),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        '💜 Juntos, construímos um ',
                        style: AppTextStyles.bodySmall.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                      Text(
                        'futuro melhor',
                        style: AppTextStyles.bodySmall.copyWith(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        '! 💚',
                        style: AppTextStyles.bodySmall.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: AppSpacing.lg),
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

enum _ProfileGender { male, female }

class _ProfileCard extends StatelessWidget {
  final String name;
  final String role;
  final bool isSelected;
  final bool isPrincipal;
  final bool isLoading;
  final _ProfileGender gender;
  final VoidCallback onTap;

  const _ProfileCard({
    required this.name,
    required this.role,
    required this.isSelected,
    required this.isPrincipal,
    required this.isLoading,
    required this.gender,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: isLoading ? null : onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
        padding: const EdgeInsets.all(AppSpacing.lg),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primary.withValues(alpha: 0.08)
              : AppColors.surface.withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected
                ? AppColors.primary.withValues(alpha: 0.6)
                : AppColors.surfaceBorder.withValues(alpha: 0.4),
            width: isSelected ? 2 : 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.15),
                    blurRadius: 20,
                  ),
                ]
              : [],
        ),
        child: Column(
          children: [
            // Principal badge
            if (isPrincipal)
              Align(
                alignment: Alignment.topLeft,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.star_rounded,
                        color: AppColors.primary,
                        size: 12,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'Principal',
                        style: AppTextStyles.labelSmall.copyWith(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              )
            else
              const SizedBox(height: 20),

            const SizedBox(height: AppSpacing.sm),

            // Avatar
            _AvatarWidget(
              gender: gender,
              isSelected: isSelected,
            ),

            const SizedBox(height: AppSpacing.md),

            // Name
            Text(
              name,
              style: AppTextStyles.headlineLarge.copyWith(
                fontSize: 16,
                color: AppColors.textPrimary,
              ),
            ),

            const SizedBox(height: 4),

            // Role
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  gender == _ProfileGender.male
                      ? Icons.directions_car_rounded
                      : Icons.storefront_rounded,
                  size: 12,
                  color: AppColors.primary,
                ),
                const SizedBox(width: 4),
                Flexible(
                  child: Text(
                    role,
                    style: AppTextStyles.bodySmall.copyWith(
                      color: AppColors.primary,
                      fontSize: 11,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),

            const SizedBox(height: AppSpacing.md),

            // Selection indicator
            isLoading
                ? const SizedBox(
                    width: 28,
                    height: 28,
                    child: CircularProgressIndicator(
                      color: AppColors.primary,
                      strokeWidth: 2.5,
                    ),
                  )
                : isSelected
                    ? Container(
                        width: 28,
                        height: 28,
                        decoration: const BoxDecoration(
                          color: AppColors.primary,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.check_rounded,
                          color: AppColors.background,
                          size: 18,
                        ),
                      )
                    : Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: AppColors.textTertiary,
                            width: 2,
                          ),
                        ),
                      ),
          ],
        ),
      ),
    );
  }
}

class _AvatarWidget extends StatelessWidget {
  final _ProfileGender gender;
  final bool isSelected;

  const _AvatarWidget({
    required this.gender,
    required this.isSelected,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 100,
      height: 100,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: RadialGradient(
          colors: [
            AppColors.primary.withValues(alpha: isSelected ? 0.2 : 0.1),
            AppColors.surface,
          ],
        ),
        border: Border.all(
          color: isSelected
              ? AppColors.primary.withValues(alpha: 0.3)
              : AppColors.surfaceBorder.withValues(alpha: 0.3),
          width: 2,
        ),
      ),
      child: ClipOval(
        child: CustomPaint(
          painter: _AvatarPainter(gender: gender),
          child: Center(
            child: Icon(
              gender == _ProfileGender.male
                  ? Icons.person_rounded
                  : Icons.person_rounded,
              size: 48,
              color: gender == _ProfileGender.male
                  ? AppColors.primary.withValues(alpha: 0.7)
                  : AppColors.primary.withValues(alpha: 0.6),
            ),
          ),
        ),
      ),
    );
  }
}

class _AvatarPainter extends CustomPainter {
  final _ProfileGender gender;

  _AvatarPainter({required this.gender});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);

    // Background circle
    final bgPaint = Paint()
      ..shader = RadialGradient(
        colors: [
          gender == _ProfileGender.male
              ? const Color(0xFF1A4D3A)
              : const Color(0xFF2D1A4D),
          AppColors.surface,
        ],
      ).createShader(Rect.fromCircle(center: center, radius: size.width / 2));

    canvas.drawCircle(center, size.width / 2, bgPaint);

    // Glow effect
    final glowPaint = Paint()
      ..shader = RadialGradient(
        colors: [
          AppColors.primary.withValues(alpha: 0.15),
          Colors.transparent,
        ],
      ).createShader(
          Rect.fromCircle(center: center, radius: size.width / 2),
      );

    canvas.drawCircle(center, size.width / 2, glowPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
