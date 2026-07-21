import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
import '../theme/app_spacing.dart';
import '../providers/family_provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/dark_card.dart';
import '../widgets/primary_button.dart';
import '../core/snackbar_helper.dart';

class FamilyTab extends ConsumerWidget {
  const FamilyTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final familyAsync = ref.watch(familyProvider);

    return familyAsync.when(
      loading: () => const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      ),
      error: (e, _) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppColors.expense),
            const SizedBox(height: 16),
            Text('Erro ao carregar família', style: AppTextStyles.bodyLarge),
            const SizedBox(height: 8),
            ElevatedButton(
              onPressed: () => ref.invalidate(familyProvider),
              child: const Text('Tentar novamente'),
            ),
          ],
        ),
      ),
      data: (familyState) {
        if (familyState.hasFamily) {
          return _buildWithFamily(context, ref, familyState);
        }
        return _buildNoFamily(context, ref);
      },
    );
  }

  Widget _buildNoFamily(BuildContext context, WidgetRef ref) {
    final nameCtrl = TextEditingController();
    final codeCtrl = TextEditingController();

    return ListView(
      padding: const EdgeInsets.all(AppSpacing.xl),
      children: [
        DarkCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Criar Grupo Familiar', style: AppTextStyles.headlineMedium),
              const SizedBox(height: AppSpacing.xs),
              Text(
                'Comece um novo controle compartilhado com sua família.',
                style: AppTextStyles.bodySmall,
              ),
              const SizedBox(height: AppSpacing.lg),
              TextField(
                controller: nameCtrl,
                decoration: const InputDecoration(labelText: 'Nome da Família'),
              ),
              const SizedBox(height: AppSpacing.lg),
              PrimaryButton(
                onPressed: () async {
                  if (nameCtrl.text.trim().isEmpty) return;
                  try {
                    await ref.read(familyProvider.notifier).createFamily(
                      nameCtrl.text.trim(),
                    );
                    if (context.mounted) {
                      showSuccessSnackBar(context, 'Família criada com sucesso!');
                    }
                  } catch (e) {
                    if (context.mounted) {
                      showErrorSnackBar(context, 'Erro ao criar: $e');
                    }
                  }
                },
                label: 'Criar',
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.xxl),
        DarkCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Participar de Grupo', style: AppTextStyles.headlineMedium),
              const SizedBox(height: AppSpacing.xs),
              Text(
                'Se alguém já criou o grupo, cole o código abaixo.',
                style: AppTextStyles.bodySmall,
              ),
              const SizedBox(height: AppSpacing.lg),
              TextField(
                controller: codeCtrl,
                decoration: const InputDecoration(
                  labelText: 'Código de Convite',
                ),
                textCapitalization: TextCapitalization.characters,
              ),
              const SizedBox(height: AppSpacing.lg),
              OutlinedButton(
                onPressed: () async {
                  if (codeCtrl.text.trim().isEmpty) return;
                  try {
                    await ref.read(familyProvider.notifier).joinFamily(
                      codeCtrl.text.trim().toUpperCase(),
                    );
                    if (context.mounted) {
                      showSuccessSnackBar(context, 'Entrou na família!');
                    }
                  } catch (e) {
                    if (context.mounted) {
                      showErrorSnackBar(context, 'Erro ao entrar: $e');
                    }
                  }
                },
                child: const Text('Entrar'),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.xxxl),
        OutlinedButton.icon(
          onPressed: () => ref.read(authProvider.notifier).service.signOut(),
          icon: const Icon(Icons.logout, color: AppColors.expense),
          label: const Text(
            'Sair da Conta',
            style: TextStyle(color: AppColors.expense),
          ),
          style: OutlinedButton.styleFrom(
            side: const BorderSide(color: AppColors.expense),
            padding: const EdgeInsets.symmetric(vertical: 16),
          ),
        ),
      ],
    );
  }

  Widget _buildWithFamily(
    BuildContext context,
    WidgetRef ref,
    FamilyState familyState,
  ) {
    final userId = Supabase.instance.client.auth.currentUser?.id;

    return ListView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      children: [
        DarkCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                familyState.group?.name ?? 'Família',
                style: AppTextStyles.displaySmall,
              ),
              const SizedBox(height: AppSpacing.xs),
              const Text(
                'Grupo Familiar Compartilhado',
                style: AppTextStyles.bodySmall,
              ),
              const SizedBox(height: AppSpacing.lg),
              Text(
                'Compartilhe o código abaixo:',
                style: AppTextStyles.labelMedium,
              ),
              const SizedBox(height: AppSpacing.sm),
              SelectableText(
                familyState.group?.inviteCode ?? 'Gerando...',
                style: AppTextStyles.bodyLarge.copyWith(
                  color: AppColors.primary,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 2,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.xxl),

        Text('Membros da Família', style: AppTextStyles.headlineMedium),
        const SizedBox(height: AppSpacing.md),
        ...familyState.members.map((m) {
          final isMe = m.profileId == userId;
          final name = m.profile?.displayName ?? 'Usuário';
          final isAdmin = m.isAdmin;

          return Container(
            margin: const EdgeInsets.only(bottom: AppSpacing.sm),
            child: Material(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.lg,
                  vertical: AppSpacing.md,
                ),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.surfaceBorder),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: AppColors.primaryMuted,
                      child: Text(
                        name.substring(0, 1).toUpperCase(),
                        style: const TextStyle(color: AppColors.primary),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Text(
                        '$name ${isMe ? '(Eu)' : ''}',
                        style: AppTextStyles.bodyLarge,
                      ),
                    ),
                    Text(
                      isAdmin ? 'Admin' : 'Membro',
                      style: TextStyle(
                        color: isAdmin
                            ? AppColors.primary
                            : AppColors.textTertiary,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }),

        const SizedBox(height: AppSpacing.xxxl),
        OutlinedButton.icon(
          onPressed: () => ref.read(authProvider.notifier).service.signOut(),
          icon: const Icon(Icons.logout, color: AppColors.expense),
          label: const Text(
            'Sair da Conta',
            style: TextStyle(color: AppColors.expense),
          ),
          style: OutlinedButton.styleFrom(
            side: const BorderSide(color: AppColors.expense),
            padding: const EdgeInsets.symmetric(vertical: 16),
          ),
        ),
      ],
    );
  }
}
