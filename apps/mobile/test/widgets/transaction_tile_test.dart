import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/widgets/transaction_tile.dart';
import 'package:mobile/theme/app_colors.dart';

void main() {
  group('TransactionTile', () {
    testWidgets('renders expense transaction correctly', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TransactionTile(
              description: 'Supermercado',
              categoryName: 'Alimentação',
              date: DateTime(2026, 7, 15),
              amount: 150.50,
              isIncome: false,
            ),
          ),
        ),
      );

      expect(find.text('Supermercado'), findsOneWidget);
      expect(find.textContaining('Alimentação'), findsOneWidget);
      expect(find.byIcon(Icons.arrow_downward), findsOneWidget);
    });

    testWidgets('renders income transaction correctly', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TransactionTile(
              description: 'Salário',
              categoryName: 'Trabalho',
              date: DateTime(2026, 7, 1),
              amount: 5000,
              isIncome: true,
            ),
          ),
        ),
      );

      expect(find.text('Salário'), findsOneWidget);
      expect(find.byIcon(Icons.arrow_upward), findsOneWidget);
    });

    testWidgets('shows receipt icon when showReceipt is true', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TransactionTile(
              description: 'Compra',
              categoryName: 'Outros',
              date: DateTime(2026, 7, 10),
              amount: 50,
              isIncome: false,
              showReceipt: true,
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.image_outlined), findsOneWidget);
    });
  });
}
