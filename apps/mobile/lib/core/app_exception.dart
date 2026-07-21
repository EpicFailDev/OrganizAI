class AppException implements Exception {
  final String message;
  final String? code;

  const AppException(this.message, {this.code});

  factory AppException.fromSupabase(dynamic error) {
    final msg = error.toString();
    if (msg.contains('PostgrestException')) {
      return AppException(msg, code: 'postgrest');
    }
    return AppException(msg);
  }

  @override
  String toString() => message;
}
