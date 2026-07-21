import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/widgets/empty_state.dart';

void main() {
  group('EmptyState', () {
    testWidgets('renders icon, title and subtitle', (tester) async {
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
      expect(find.text('Adicione seu primeiro lançamento'), findsOneWidget);
    });

    testWidgets('renders action widget when provided', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: EmptyState(
              icon: Icons.search_off,
              title: 'Nenhum resultado',
              subtitle: 'Tente outro termo',
              action: ElevatedButton(
                onPressed: () {},
                child: const Text('Limpar'),
              ),
            ),
          ),
        ),
      );

      expect(find.text('Limpar'), findsOneWidget);
    });
  });
}
