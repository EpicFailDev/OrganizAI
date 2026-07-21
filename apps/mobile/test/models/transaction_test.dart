import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/models/transaction.dart';

void main() {
  group('AppTransaction', () {
    test('fromJson parses correctly', () {
      final json = {
        'id': 'tx-1',
        'family_id': 'fam-1',
        'date': '2026-07-15',
        'description': 'Supermercado',
        'category_id': 'cat-1',
        'subcategory_id': null,
        'type': 'expense',
        'amount': 150.50,
        'created_by': 'user-1',
        'attachment_url': null,
        'created_at': '2026-07-15T10:30:00Z',
        'categories': {
          'id': 'cat-1',
          'name': 'Alimentação',
          'type': 'expense',
          'color': '#FF5722',
        },
        'subcategories': null,
        'profiles': {
          'id': 'user-1',
          'display_name': 'Guilherme',
        },
      };

      final tx = AppTransaction.fromJson(json);

      expect(tx.id, 'tx-1');
      expect(tx.familyId, 'fam-1');
      expect(tx.date, DateTime(2026, 7, 15));
      expect(tx.description, 'Supermercado');
      expect(tx.categoryId, 'cat-1');
      expect(tx.subcategoryId, isNull);
      expect(tx.type, 'expense');
      expect(tx.amount, 150.50);
      expect(tx.isIncome, false);
      expect(tx.monthKey, '2026-07');
      expect(tx.category?.name, 'Alimentação');
      expect(tx.profile?.displayName, 'Guilherme');
    });

    test('isIncome returns true for income type', () {
      final tx = AppTransaction(
        id: '1',
        familyId: 'fam-1',
        date: DateTime.now(),
        description: 'Salary',
        categoryId: 'cat-1',
        type: 'income',
        amount: 5000,
        createdBy: 'user-1',
        createdAt: DateTime.now(),
      );

      expect(tx.isIncome, true);
    });

    test('monthKey formats correctly', () {
      final tx = AppTransaction(
        id: '1',
        familyId: 'fam-1',
        date: DateTime(2026, 3, 10),
        description: 'Test',
        categoryId: 'cat-1',
        type: 'expense',
        amount: 100,
        createdBy: 'user-1',
        createdAt: DateTime.now(),
      );

      expect(tx.monthKey, '2026-03');
    });
  });
}
