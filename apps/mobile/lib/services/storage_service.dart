import 'dart:io';
import 'package:supabase_flutter/supabase_flutter.dart' show FileOptions;
import '../core/supabase_client.dart';

class StorageService {
  Future<String> uploadReceipt({
    required String familyId,
    required File file,
  }) async {
    final ext = file.path.split('.').last;
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final path = 'receipts/$familyId/$timestamp.$ext';

    await supabase.storage.from('attachments').upload(
          path,
          file,
          fileOptions: const FileOptions(upsert: true),
        );

    return path;
  }

  Future<String> getSignedUrl(String path, {int expirySeconds = 3600}) async {
    final signedUrl = await supabase.storage
        .from('attachments')
        .createSignedUrl(path, expirySeconds);
    return signedUrl;
  }

  String getPublicUrl(String path) {
    return supabase.storage.from('attachments').getPublicUrl(path);
  }
}
