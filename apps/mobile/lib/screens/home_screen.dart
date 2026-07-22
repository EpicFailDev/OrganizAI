import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
import '../providers/family_provider.dart';
import '../providers/transaction_provider.dart';
import '../providers/auth_provider.dart';
import '../providers/recurring_bill_provider.dart';
import '../widgets/custom_bottom_nav_bar.dart';
import 'dashboard_tab.dart';
import 'transactions_tab.dart';
import 'categories_tab.dart';
import 'family_tab.dart';
import 'recurring_bills_tab.dart';
import 'add_transaction_screen.dart';
import 'scan_receipt_screen.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final familyAsync = ref.watch(familyProvider);

    return familyAsync.when(
      loading: () => const Scaffold(
        body: Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
      ),
      error: (e, _) => Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: AppColors.expense),
              const SizedBox(height: 16),
              Text('Erro ao carregar dados', style: AppTextStyles.bodyLarge),
              const SizedBox(height: 8),
              Text(
                e.toString(),
                style: AppTextStyles.bodySmall,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.invalidate(familyProvider),
                child: const Text('Tentar novamente'),
              ),
            ],
          ),
        ),
      ),
      data: (familyState) {
        if (!familyState.hasFamily) {
          return _NoFamilyShell(
            onLogout: () => ref.read(authProvider.notifier).service.signOut(),
          );
        }
        return const _FamilyShell();
      },
    );
  }
}

class _NoFamilyShell extends StatelessWidget {
  final VoidCallback onLogout;

  const _NoFamilyShell({required this.onLogout});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('OrganizAI', style: AppTextStyles.displaySmall),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: AppColors.textSecondary),
            onPressed: onLogout,
          ),
        ],
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.people_outline, size: 64, color: AppColors.textTertiary),
              const SizedBox(height: 16),
              Text('Conecte sua família!', style: AppTextStyles.displaySmall),
              const SizedBox(height: 8),
              Text(
                'Configure um grupo familiar para começar a compartilhar o orçamento.',
                textAlign: TextAlign.center,
                style: AppTextStyles.bodyMedium,
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const FamilyTab()),
                ),
                child: const Text('Configurar Família'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FamilyShell extends ConsumerStatefulWidget {
  const _FamilyShell();

  @override
  ConsumerState<_FamilyShell> createState() => _FamilyShellState();
}

class _FamilyShellState extends ConsumerState<_FamilyShell> {
  int _currentIndex = 0;

  void _showAddOptions(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => Container(
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: AppColors.surfaceBorder, width: 0.5),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Drag handle
                Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.surfaceBorder,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 20),
                // Title
                Text(
                  'Criar novo',
                  style: AppTextStyles.headlineMedium.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 24),
                // Options
                _AddOptionTile(
                  icon: Icons.edit_rounded,
                  iconColor: AppColors.primary,
                  iconBgColor: AppColors.primaryMuted,
                  title: 'Lançamento Manual',
                  subtitle: 'Registre receita ou despesa',
                  onTap: () async {
                    Navigator.pop(ctx);
                    final result = await Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const AddTransactionScreen(),
                      ),
                    );
                    if (result == true) {
                      ref.invalidate(transactionProvider);
                    }
                  },
                ),
                const SizedBox(height: 8),
                _AddOptionTile(
                  icon: Icons.document_scanner_rounded,
                  iconColor: AppColors.secondary,
                  iconBgColor: AppColors.secondary.withValues(alpha: 0.15),
                  title: 'Escanear Nota Fiscal',
                  subtitle: 'Capture itens automaticamente',
                  onTap: () async {
                    Navigator.pop(ctx);
                    final result = await Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const ScanReceiptScreen(),
                      ),
                    );
                    if (result == true) {
                      ref.invalidate(transactionProvider);
                    }
                  },
                ),
                const SizedBox(height: 8),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(WidgetRef ref) {
    final familyState = ref.watch(familyProvider);
    final familyName = familyState.valueOrNull?.group?.name ?? 'família';

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 4),
      child: Row(
        children: [
          // Avatar
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.surfaceVariant,
              border: Border.all(color: AppColors.surfaceBorder),
            ),
            child: const Icon(
              Icons.person,
              color: AppColors.textSecondary,
              size: 24,
            ),
          ),
          const SizedBox(width: 12),
          // Greeting
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Olá, Guilherme! 👋',
                  style: AppTextStyles.headlineLarge.copyWith(
                    fontSize: 18,
                    color: const Color(0xFF1F2937),
                  ),
                ),
                const SizedBox(height: 2),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Flexible(
                      child: Text(
                        'Visão geral da $familyName',
                        style: AppTextStyles.bodySmall.copyWith(
                          color: const Color(0xFF6B7280),
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Icon(
                      Icons.keyboard_arrow_down,
                      size: 14,
                      color: AppColors.textTertiary,
                    ),
                  ],
                ),
              ],
            ),
          ),
          // Search icon
          IconButton(
            icon: Icon(
              Icons.search,
              color: AppColors.textSecondary,
              size: 22,
            ),
            onPressed: () {},
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
          ),
          // Notification bell
          Stack(
            clipBehavior: Clip.none,
            children: [
              IconButton(
                icon: Icon(
                  Icons.notifications_outlined,
                  color: AppColors.textSecondary,
                  size: 22,
                ),
                onPressed: () {},
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
              ),
              Positioned(
                right: 6,
                top: 6,
                child: Container(
                  width: 16,
                  height: 16,
                  decoration: const BoxDecoration(
                    color: AppColors.expense,
                    shape: BoxShape.circle,
                  ),
                  child: const Center(
                    child: Text(
                      '3',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final tabs = [
      DashboardTab(onNavigateToTab: (index) => setState(() => _currentIndex = index)),
      TransactionsTab(),
      RecurringBillsTab(),
      CategoriesTab(),
      FamilyTab(),
    ];

    return Scaffold(
      extendBody: true,
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(60),
        child: _buildHeader(ref),
      ),
      body: tabs[_currentIndex],
      bottomNavigationBar: CustomBottomNavBar(
        currentIndex: _currentIndex,
        onItemTapped: (idx) => setState(() => _currentIndex = idx),
        onCenterButtonPressed: () => _showAddOptions(context, ref),
      ),
    );
  }
}

class _AddOptionTile extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final Color iconBgColor;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _AddOptionTile({
    required this.icon,
    required this.iconColor,
    required this.iconBgColor,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: AppColors.surfaceVariant,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: iconBgColor,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, color: iconColor, size: 24),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        color: AppColors.textTertiary,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right_rounded,
                color: AppColors.textDisabled,
                size: 20,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
