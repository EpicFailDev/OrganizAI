import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/models/profile.dart';

void main() {
  group('Profile', () {
    test('fromJson parses correctly', () {
      final json = {
        'id': 'user-1',
        'display_name': 'Guilherme',
        'avatar_url': 'https://example.com/avatar.jpg',
        'created_at': '2026-01-01T00:00:00Z',
      };

      final profile = Profile.fromJson(json);

      expect(profile.id, 'user-1');
      expect(profile.displayName, 'Guilherme');
      expect(profile.avatarUrl, 'https://example.com/avatar.jpg');
      expect(profile.createdAt, DateTime.utc(2026, 1, 1));
    });

    test('fromJson handles missing fields', () {
      final json = {
        'id': 'user-2',
        'display_name': null,
        'avatar_url': null,
        'created_at': null,
      };

      final profile = Profile.fromJson(json);

      expect(profile.displayName, '');
      expect(profile.avatarUrl, isNull);
    });
  });
}
