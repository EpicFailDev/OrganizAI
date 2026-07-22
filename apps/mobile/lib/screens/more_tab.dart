import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
import '../providers/auth_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class MoreTab extends ConsumerWidget {
  const MoreTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildMenuItem(
          icon: Icons.person_outline,
          title: 'Perfil',
          subtitle: 'Gerencie seus dados',
          onTap: () {},
        ),
        _buildMenuItem(
          icon: Icons.notifications_outlined,
          title: 'Notificações',
          subtitle: 'Configure alertas',
          onTap: () {},
        ),
        _buildMenuItem(
          icon: Icons.help_outline,
          title: 'Ajuda',
          subtitle: 'Dúvidas frequentes',
          onTap: () {},
        ),
        _buildMenuItem(
          icon: Icons.info_outline,
          title: 'Sobre',
          subtitle: 'OrganizAI v1.0',
          onTap: () {},
        ),
        const SizedBox(height: 24),
        _buildMenuItem(
          icon: Icons.logout,
          title: 'Sair',
          subtitle: 'Encerrar sessão',
          onTap: () => ref.read(authProvider.notifier).service.signOut(),
          isDestructive: true,
        ),
      ],
    );
  }

  Widget _buildMenuItem({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    bool isDestructive = false,
  }) {
    return ListTile(
      leading: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: isDestructive
              ? AppColors.expenseBg
              : AppColors.surfaceVariant,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(
          icon,
          color: isDestructive ? AppColors.expense : AppColors.primary,
        ),
      ),
      title: Text(
        title,
        style: AppTextStyles.bodyLarge.copyWith(
          color: isDestructive ? AppColors.expense : AppColors.textPrimary,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: AppTextStyles.bodySmall,
      ),
      trailing: const Icon(
        Icons.chevron_right,
        color: AppColors.textTertiary,
      ),
      onTap: onTap,
    );
  }
}
