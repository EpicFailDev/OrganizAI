import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../models/recurring_bill.dart';
import '../providers/recurring_bill_provider.dart';
import '../providers/family_provider.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
import '../theme/app_spacing.dart';
import '../theme/app_radius.dart';
import '../widgets/dark_card.dart';

class RecurringBillsTab extends ConsumerStatefulWidget {
  const RecurringBillsTab({super.key});

  @override
  ConsumerState<RecurringBillsTab> createState() => _RecurringBillsTabState();
}

class _RecurringBillsTabState extends ConsumerState<RecurringBillsTab> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(recurringBillProvider.notifier).ensureLoaded();
    });
  }

  void _showAddBillDialog() {
    final nameController = TextEditingController();
    final amountController = TextEditingController();
    final dueDayController = TextEditingController();
    final familyId = ref.read(familyProvider).valueOrNull?.familyId;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _BillFormSheet(
        title: 'Adicionar Conta Fixa',
        nameController: nameController,
        amountController: amountController,
        dueDayController: dueDayController,
        onSubmit: () async {
          final name = nameController.text.trim();
          final amount = double.tryParse(amountController.text.replaceAll(',', '.')) ?? 0;
          final dueDay = int.tryParse(dueDayController.text) ?? 1;

          if (name.isEmpty || amount <= 0 || familyId == null) return;

          await ref.read(recurringBillProvider.notifier).addBill(
                familyId: familyId,
                name: name,
                amount: amount,
                dueDay: dueDay,
              );
          if (context.mounted) {
            Navigator.pop(ctx);
          }
        },
      ),
    );
  }

  void _showEditBillDialog(RecurringBill bill) {
    final nameController = TextEditingController(text: bill.name);
    final amountController = TextEditingController(text: bill.amount.toStringAsFixed(2));
    final dueDayController = TextEditingController(text: bill.dueDay.toString());
    final familyId = ref.read(familyProvider).valueOrNull?.familyId;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _BillFormSheet(
        title: 'Editar Conta Fixa',
        nameController: nameController,
        amountController: amountController,
        dueDayController: dueDayController,
        onSubmit: () async {
          final name = nameController.text.trim();
          final amount = double.tryParse(amountController.text.replaceAll(',', '.')) ?? 0;
          final dueDay = int.tryParse(dueDayController.text) ?? 1;

          if (name.isEmpty || amount <= 0 || familyId == null) return;

          // Delete and re-add since the service doesn't have an update method
          await ref.read(recurringBillProvider.notifier).deleteBill(bill.id);
          await ref.read(recurringBillProvider.notifier).addBill(
                familyId: familyId,
                name: name,
                amount: amount,
                dueDay: dueDay,
              );
          if (context.mounted) {
            Navigator.pop(ctx);
          }
        },
        onDelete: () async {
          await ref.read(recurringBillProvider.notifier).deleteBill(bill.id);
          if (context.mounted) {
            Navigator.pop(ctx);
          }
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(recurringBillProvider);
    final currencyFormat = NumberFormat.simpleCurrency(locale: 'pt_BR');

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: Text(
          'Contas Fixas',
          style: AppTextStyles.headlineMedium,
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppColors.textSecondary),
            onPressed: () => ref.read(recurringBillProvider.notifier).load(),
          ),
        ],
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : state.bills.isEmpty
              ? _EmptyState(onAdd: _showAddBillDialog)
              : RefreshIndicator(
                  onRefresh: () => ref.read(recurringBillProvider.notifier).load(),
                  child: ListView.separated(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    itemCount: state.bills.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final bill = state.bills[index];
                      return Dismissible(
                        key: Key(bill.id),
                        direction: DismissDirection.endToStart,
                        background: Container(
                          alignment: Alignment.centerRight,
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          decoration: BoxDecoration(
                            color: AppColors.expense,
                            borderRadius: AppRadius.lgAll,
                          ),
                          child: const Icon(Icons.delete_rounded, color: Colors.white),
                        ),
                        onDismissed: (_) async {
                          await ref.read(recurringBillProvider.notifier).deleteBill(bill.id);
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('${bill.name} removida'),
                                backgroundColor: AppColors.expense,
                              ),
                            );
                          }
                        },
                        child: _BillTile(
                          bill: bill,
                          currencyFormat: currencyFormat,
                          onTogglePaid: () => ref.read(recurringBillProvider.notifier).togglePaid(bill.id),
                          onEdit: () => _showEditBillDialog(bill),
                        ),
                      );
                    },
                  ),
                ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddBillDialog,
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Nova Conta'),
      ),
    );
  }
}

class _BillTile extends StatelessWidget {
  final RecurringBill bill;
  final NumberFormat currencyFormat;
  final VoidCallback onTogglePaid;
  final VoidCallback onEdit;

  const _BillTile({
    required this.bill,
    required this.currencyFormat,
    required this.onTogglePaid,
    required this.onEdit,
  });

  @override
  Widget build(BuildContext context) {
    final daysLeft = bill.daysLeft;
    final isOverdue = daysLeft < 0 && !bill.paid;
    final isDueSoon = daysLeft <= 5 && daysLeft >= 0 && !bill.paid;

    return DarkCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.receipt_long_rounded, color: AppColors.primary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      bill.name,
                      style: AppTextStyles.bodyLarge.copyWith(
                        fontWeight: FontWeight.w600,
                        decoration: bill.paid
                            ? TextDecoration.lineThrough
                            : null,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Vence dia ${bill.dueDay} de cada mês',
                      style: AppTextStyles.bodySmall.copyWith(color: AppColors.textTertiary),
                    ),
                  ],
                ),
              ),
              Text(
                currencyFormat.format(bill.amount),
                style: AppTextStyles.bodyLarge.copyWith(
                  fontWeight: FontWeight.w600,
                  color: bill.paid ? AppColors.income : AppColors.expense,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              if (isOverdue)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.expense.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    'Vencida há ${-daysLeft} dias',
                    style: AppTextStyles.bodySmall.copyWith(
                      color: AppColors.expense,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              if (isDueSoon)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.goal.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    'Vence em $daysLeft dias',
                    style: AppTextStyles.bodySmall.copyWith(
                      color: AppColors.goal,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              if (!bill.paid && !isOverdue && !isDueSoon)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.textTertiary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    'Em aberto',
                    style: AppTextStyles.bodySmall.copyWith(
                      color: AppColors.textTertiary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              if (bill.paid)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.income.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    'Paga',
                    style: AppTextStyles.bodySmall.copyWith(
                      color: AppColors.income,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              const Spacer(),
              IconButton(
                icon: Icon(
                  bill.paid ? Icons.check_circle_rounded : Icons.circle_outlined,
                  color: bill.paid ? AppColors.income : AppColors.textSecondary,
                  size: 24,
                ),
                onPressed: onTogglePaid,
              ),
              IconButton(
                icon: const Icon(Icons.edit_rounded, color: AppColors.textSecondary, size: 20),
                onPressed: onEdit,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _BillFormSheet extends StatelessWidget {
  final String title;
  final TextEditingController nameController;
  final TextEditingController amountController;
  final TextEditingController dueDayController;
  final VoidCallback onSubmit;
  final VoidCallback? onDelete;

  const _BillFormSheet({
    required this.title,
    required this.nameController,
    required this.amountController,
    required this.dueDayController,
    required this.onSubmit,
    this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final isEditing = onDelete != null;

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 32),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.surfaceBorder, width: 0.5),
      ),
      child: SafeArea(
        child: Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(context).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(title, style: AppTextStyles.headlineMedium.copyWith(fontWeight: FontWeight.w600)),
                  if (isEditing)
                    IconButton(
                      icon: const Icon(Icons.delete_rounded, color: AppColors.expense),
                      onPressed: onDelete,
                    ),
                ],
              ),
              const SizedBox(height: 20),
              _FormTextField(
                controller: nameController,
                label: 'Nome da conta',
                hint: 'Ex: Internet, Aluguel...',
              ),
              const SizedBox(height: 16),
              _FormTextField(
                controller: amountController,
                label: 'Valor',
                hint: 'R\$ 0,00',
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 16),
              _FormTextField(
                controller: dueDayController,
                label: 'Dia de vencimento',
                hint: '1-31',
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    onSubmit();
                    Navigator.pop(context);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: Text(isEditing ? 'Salvar alterações' : 'Adicionar conta', style: AppTextStyles.bodyLarge.copyWith(color: AppColors.black, fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FormTextField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String hint;
  final TextInputType? keyboardType;

  const _FormTextField({
    required this.controller,
    required this.label,
    required this.hint,
    this.keyboardType,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary)),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          style: AppTextStyles.bodyLarge,
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: AppTextStyles.bodyLarge.copyWith(color: AppColors.textTertiary),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: AppColors.surfaceBorder),
            ),
            filled: true,
            fillColor: AppColors.surfaceVariant,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          ),
        ),
      ],
    );
  }
}

class _EmptyState extends StatelessWidget {
  final VoidCallback onAdd;

  const _EmptyState({required this.onAdd});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.receipt_long_rounded, size: 64, color: AppColors.textTertiary),
            const SizedBox(height: 16),
            Text('Nenhuma conta fixa', style: AppTextStyles.headlineMedium),
            const SizedBox(height: 8),
            Text('Adicione contas fixas para controlar suas despesas recorrentes.', style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textTertiary), textAlign: TextAlign.center),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: onAdd,
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12)),
              icon: const Icon(Icons.add_rounded),
              label: const Text('Adicionar conta fixa'),
            ),
          ],
        ),
      ),
    );
  }
}
