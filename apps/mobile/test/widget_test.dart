import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/widgets/empty_state.dart';
import 'package:mobile/widgets/kpi_card.dart';
import 'package:mobile/theme/app_colors.dart';

void main() {
  testWidgets('EmptyState renders correctly', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: EmptyState(
            icon: Icons.receipt_long_outlined,
            title: 'Nenhum lançamento',
            subtitle: 'Adicione seu primeiro lançamento',
          ),
        ),
      ),
    );

    expect(find.byIcon(Icons.receipt_long_outlined), findsOneWidget);
    expect(find.text('Nenhum lançamento'), findsOneWidget);
  });

  testWidgets('KpiCard renders correctly', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: KpiCard(
            label: 'Saldo',
            value: 1000,
            valueColor: AppColors.income,
            icon: Icons.wallet,
          ),
        ),
      ),
    );

    expect(find.text('Saldo'), findsOneWidget);
    expect(find.byIcon(Icons.wallet), findsOneWidget);
  });
}
