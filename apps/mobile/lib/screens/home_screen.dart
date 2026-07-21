import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
import '../providers/family_provider.dart';
import '../providers/transaction_provider.dart';
import '../providers/category_provider.dart';
import '../providers/auth_provider.dart';
import 'dashboard_tab.dart';
import 'transactions_tab.dart';
import 'categories_tab.dart';
import 'family_tab.dart';
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
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.surfaceBorder,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'Adicionar',
                style: AppTextStyles.headlineMedium,
              ),
              const SizedBox(height: 20),
              ListTile(
                leading: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.primaryMuted,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.edit_outlined, color: AppColors.primary),
                ),
                title: const Text('Lançamento Manual'),
                subtitle: const Text('Adicionar receita ou despesa'),
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
              const Divider(color: AppColors.surfaceBorder),
              ListTile(
                leading: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.expenseBg,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.document_scanner_outlined, color: AppColors.expense),
                ),
                title: const Text('Escanear Nota Fiscal'),
                subtitle: const Text('Escaneie e adicione itens automaticamente'),
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
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    const tabs = [
      DashboardTab(),
      TransactionsTab(),
      CategoriesTab(),
      FamilyTab(),
    ];

    const titles = ['OrganizAI', 'Lançamentos', 'Categorias', 'Família'];

    return Scaffold(
      appBar: AppBar(
        title: Text(titles[_currentIndex], style: AppTextStyles.displaySmall),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppColors.textSecondary),
            onPressed: () {
              ref.invalidate(familyProvider);
              ref.invalidate(transactionProvider);
              ref.invalidate(categoryProvider);
            },
          ),
        ],
      ),
      body: tabs[_currentIndex],
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(
            top: BorderSide(color: AppColors.surfaceBorder, width: 0.5),
          ),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (idx) => setState(() => _currentIndex = idx),
          type: BottomNavigationBarType.fixed,
          backgroundColor: AppColors.surface,
          selectedItemColor: AppColors.primary,
          unselectedItemColor: AppColors.textDisabled,
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.dashboard_outlined),
              label: 'Resumo',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.receipt_long_outlined),
              label: 'Lançamentos',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.sell_outlined),
              label: 'Categorias',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.people_outline),
              label: 'Família',
            ),
          ],
        ),
      ),
      floatingActionButton: _currentIndex != 3
          ? FloatingActionButton(
              backgroundColor: AppColors.primary,
              elevation: 2,
              onPressed: () => _showAddOptions(context, ref),
              child: const Icon(Icons.add, color: AppColors.black, size: 28),
            )
          : null,
    );
  }
}
