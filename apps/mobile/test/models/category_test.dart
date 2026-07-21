import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/models/category.dart';

void main() {
  group('Category', () {
    test('fromJson parses correctly', () {
      final json = {
        'id': 'cat-1',
        'name': 'Alimentação',
        'type': 'expense',
        'color': '#FF5722',
        'icon': 'shopping_bag',
        'family_id': 'fam-1',
      };

      final cat = Category.fromJson(json);

      expect(cat.id, 'cat-1');
      expect(cat.name, 'Alimentação');
      expect(cat.type, 'expense');
      expect(cat.color, '#FF5722');
      expect(cat.icon, 'shopping_bag');
      expect(cat.familyId, 'fam-1');
      expect(cat.isGlobal, false);
    });

    test('fromJson handles null optional fields', () {
      final json = {
        'id': 'cat-2',
        'name': 'Vendas',
        'type': 'income',
        'color': null,
        'icon': null,
        'family_id': null,
      };

      final cat = Category.fromJson(json);

      expect(cat.color, '#9E9E9E');
      expect(cat.icon, isNull);
      expect(cat.familyId, isNull);
      expect(cat.isGlobal, true);
    });

    test('parsedColor returns correct Color', () {
      final cat = Category(
        id: '1',
        name: 'Test',
        type: 'expense',
        color: '#34D399',
      );

      final color = cat.parsedColor;
      expect(color.r, closeTo(0.204, 0.01));
      expect(color.g, closeTo(0.827, 0.01));
      expect(color.b, closeTo(0.600, 0.01));
    });
  });
}
