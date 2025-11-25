import 'dart:io';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:http/http.dart' as http;

class ProfileRepository {
  ProfileRepository({FirebaseFunctions? functions})
      : _functions = functions ?? FirebaseFunctions.instance;

  final FirebaseFunctions _functions;

  Future<Map<String, dynamic>> getOwnProfile() async {
    try {
      final result = await _functions.httpsCallable('getOwnProfile').call();
      return Map<String, dynamic>.from(result.data as Map);
    } catch (e) {
      throw Exception('Failed to fetch profile: ${e.toString()}');
    }
  }

  Future<void> updateOwnProfile({
    String? fullName,
    String? department,
    String? position,
    String? phoneNumber,
  }) async {
    try {
      final data = <String, dynamic>{};
      if (fullName != null) data['fullName'] = fullName;
      if (department != null) data['department'] = department;
      if (position != null) data['position'] = position;
      if (phoneNumber != null) data['phoneNumber'] = phoneNumber;

      await _functions.httpsCallable('updateOwnProfile').call(data);
    } catch (e) {
      throw Exception('Failed to update profile: ${e.toString()}');
    }
  }

  Future<Map<String, dynamic>> generateProfilePhotoUploadUrl({
    required String fileName,
    required String mimeType,
    required int sizeBytes,
  }) async {
    try {
      final result = await _functions
          .httpsCallable('generateProfilePhotoUploadUrl')
          .call({
        'fileName': fileName,
        'mimeType': mimeType,
        'sizeBytes': sizeBytes,
      });
      return Map<String, dynamic>.from(result.data as Map);
    } catch (e) {
      throw Exception('Failed to generate upload URL: ${e.toString()}');
    }
  }

  Future<void> uploadPhoto({
    required String uploadUrl,
    required File photoFile,
    required String mimeType,
  }) async {
    try {
      final bytes = await photoFile.readAsBytes();
      final response = await http.put(
        Uri.parse(uploadUrl),
        body: bytes,
        headers: {
          'Content-Type': mimeType,
        },
      );

      if (response.statusCode != 200) {
        throw Exception('Upload failed with status: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to upload photo: ${e.toString()}');
    }
  }

  Future<Map<String, dynamic>> registerProfilePhoto({
    required String photoId,
  }) async {
    try {
      final result = await _functions
          .httpsCallable('registerProfilePhoto')
          .call({
        'photoId': photoId,
      });
      return Map<String, dynamic>.from(result.data as Map);
    } catch (e) {
      throw Exception('Failed to register photo: ${e.toString()}');
    }
  }

  /// Complete photo upload flow
  Future<String> uploadProfilePhoto({
    required File photoFile,
    required String fileName,
    required String mimeType,
  }) async {
    try {
      // Step 1: Get file size
      final sizeBytes = await photoFile.length();

      // Step 2: Generate upload URL
      final uploadData = await generateProfilePhotoUploadUrl(
        fileName: fileName,
        mimeType: mimeType,
        sizeBytes: sizeBytes,
      );

      // Step 3: Upload the file
      await uploadPhoto(
        uploadUrl: uploadData['uploadUrl'] as String,
        photoFile: photoFile,
        mimeType: mimeType,
      );

      // Step 4: Register the photo
      final registerData = await registerProfilePhoto(
        photoId: uploadData['photoId'] as String,
      );

      return registerData['photoURL'] as String;
    } catch (e) {
      throw Exception('Failed to upload profile photo: ${e.toString()}');
    }
  }
}
