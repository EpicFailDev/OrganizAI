import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/widgets/kpi_card.dart';
import 'package:mobile/theme/app_colors.dart';

void main() {
  group('KpiCard', () {
    testWidgets('renders label and formatted value', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: KpiCard(
              label: 'Receitas',
              value: 1500.50,
              valueColor: AppColors.income,
              icon: Icons.trending_up,
            ),
          ),
        ),
      );

      expect(find.text('Receitas'), findsOneWidget);
      expect(find.byIcon(Icons.trending_up), findsOneWidget);
    });

    testWidgets('renders change percent when provided', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: KpiCard(
              label: 'Saldo',
              value: 5000,
              valueColor: AppColors.textPrimary,
              icon: Icons.wallet,
              changePercent: 10,
            ),
          ),
        ),
      );

      expect(find.text('Saldo'), findsOneWidget);
      expect(find.byIcon(Icons.wallet), findsOneWidget);
      expect(find.text('10%'), findsOneWidget);
    });
  });
}
