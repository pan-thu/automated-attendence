import 'dart:io';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../../core/auth/session_controller.dart';
import '../../../core/navigation/app_router.dart';
import '../../../core/services/auth_repository.dart';
import '../../../core/services/profile_repository.dart';
import '../../../core/services/telemetry_service.dart';
import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;

/// Simplified profile screen with essential account actions
///
/// Features:
/// - Profile header with avatar and user info
/// - Edit Profile
/// - Change Password
/// - Logout
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider<ProfileController>(
      create: (_) => ProfileController(),
      child: const _ProfileView(),
    );
  }
}

class _ProfileView extends StatelessWidget {
  const _ProfileView();

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<ProfileController>();
    final session = context.watch<SessionController>();
    final user = session.user;

    return Scaffold(
      backgroundColor: backgroundPrimary,
      body: CustomScrollView(
        slivers: [
          // Profile header with gradient background
          SliverToBoxAdapter(
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF4CAF50), Color(0xFF66BB6A)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: SafeArea(
                bottom: false,
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: paddingLarge,
                    vertical: paddingXLarge,
                  ),
                  child: Column(
                    children: [
                      // Avatar with shadow
                      Container(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.2),
                              blurRadius: 15,
                              offset: const Offset(0, 5),
                            ),
                          ],
                        ),
                        child: Container(
                          width: 100,
                          height: 100,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: Colors.white,
                              width: 4,
                            ),
                          ),
                          child: CircleAvatar(
                            radius: 46,
                            backgroundColor: backgroundPrimary,
                            backgroundImage: user?.photoURL != null
                                ? NetworkImage(user!.photoURL!)
                                : null,
                            child: user?.photoURL == null
                                ? Icon(
                                    Icons.person,
                                    size: 50,
                                    color: textSecondary,
                                  )
                                : null,
                          ),
                        ),
                      ),
                      const SizedBox(height: space5),
                      // Name
                      Text(
                        user?.displayName ?? user?.email?.split('@').first ?? 'User',
                        style: app_typography.headingLarge.copyWith(
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                          fontSize: 24,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: space2),
                      // Email with icon
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.email_outlined,
                            size: 16,
                            color: Colors.white.withOpacity(0.9),
                          ),
                          const SizedBox(width: space2),
                          Flexible(
                            child: Text(
                              user?.email ?? '',
                              style: app_typography.bodyMedium.copyWith(
                                color: Colors.white.withOpacity(0.95),
                              ),
                              textAlign: TextAlign.center,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: space6),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // Account actions
          SliverPadding(
            padding: const EdgeInsets.all(paddingLarge),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                Text(
                  'Account Settings',
                  style: app_typography.labelLarge.copyWith(
                    fontWeight: FontWeight.w600,
                    color: textSecondary,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: space4),
                Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFFE8E8E8),
                    borderRadius: BorderRadius.circular(radiusLarge * 1.5),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.03),
                        blurRadius: 10,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      _ProfileOption(
                        icon: Icons.person_outline,
                        title: 'Edit Profile',
                        subtitle: 'Update your personal information',
                        iconBackgroundColor: const Color(0xFF4CAF50).withOpacity(0.1),
                        iconColor: const Color(0xFF4CAF50),
                        onTap: () => _showEditProfile(context),
                      ),
                      Divider(
                        height: 1,
                        indent: paddingLarge,
                        endIndent: paddingLarge,
                        color: borderColor.withOpacity(0.2),
                      ),
                      _ProfileOption(
                        icon: Icons.lock_outline,
                        title: 'Change Password',
                        subtitle: 'Update your account password',
                        iconBackgroundColor: const Color(0xFF2196F3).withOpacity(0.1),
                        iconColor: const Color(0xFF2196F3),
                        onTap: () => _showChangePassword(context),
                      ),
                      Divider(
                        height: 1,
                        indent: paddingLarge,
                        endIndent: paddingLarge,
                        color: borderColor.withOpacity(0.2),
                      ),
                      _ProfileOption(
                        icon: Icons.logout_rounded,
                        title: 'Logout',
                        subtitle: 'Sign out of your account',
                        iconBackgroundColor: errorBackground.withOpacity(0.1),
                        iconColor: errorBackground,
                        textColor: errorBackground,
                        onTap: () => controller.logout(context),
                      ),
                    ],
                  ),
                ),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  void _showChangePassword(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (context) => const _ChangePasswordDialog(),
    );
  }

  void _showEditProfile(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (context) => const _EditProfileDialog(),
    );
  }
}

/// Profile option tile widget
class _ProfileOption extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback onTap;
  final Color? iconColor;
  final Color? iconBackgroundColor;
  final Color? textColor;

  const _ProfileOption({
    required this.icon,
    required this.title,
    this.subtitle,
    required this.onTap,
    this.iconColor,
    this.iconBackgroundColor,
    this.textColor,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(radiusLarge * 1.5),
      child: Padding(
        padding: const EdgeInsets.all(paddingLarge),
        child: Row(
          children: [
            // Icon with background
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: iconBackgroundColor ?? textPrimary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(radiusMedium),
              ),
              child: Icon(
                icon,
                color: iconColor ?? textPrimary,
                size: 22,
              ),
            ),
            const SizedBox(width: gapMedium),
            // Title and subtitle
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: app_typography.bodyLarge.copyWith(
                      fontWeight: FontWeight.w600,
                      color: textColor ?? textPrimary,
                    ),
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      subtitle!,
                      style: app_typography.bodySmall.copyWith(
                        color: textSecondary,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            // Chevron icon
            Icon(
              Icons.chevron_right,
              color: textSecondary.withOpacity(0.5),
              size: iconSizeMedium,
            ),
          ],
        ),
      ),
    );
  }
}

/// Edit profile dialog
class _EditProfileDialog extends StatefulWidget {
  const _EditProfileDialog();

  @override
  State<_EditProfileDialog> createState() => _EditProfileDialogState();
}

class _EditProfileDialogState extends State<_EditProfileDialog> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _imagePicker = ImagePicker();
  File? _selectedImage;
  bool _isLoading = false;
  bool _isUploadingPhoto = false;

  @override
  void initState() {
    super.initState();
    _loadCurrentProfile();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _loadCurrentProfile() async {
    final session = context.read<SessionController>();
    final user = session.user;

    if (user != null) {
      _nameController.text = user.displayName ?? '';
      _phoneController.text = user.phoneNumber ?? '';
    }
  }

  Future<void> _pickImage() async {
    try {
      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );

      if (image != null) {
        setState(() {
          _selectedImage = File(image.path);
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to pick image: ${e.toString()}'),
            backgroundColor: errorBackground,
          ),
        );
      }
    }
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _isLoading = true);

    try {
      final profileRepo = ProfileRepository();

      // Upload photo if selected
      if (_selectedImage != null) {
        setState(() => _isUploadingPhoto = true);

        final fileName = 'profile_${DateTime.now().millisecondsSinceEpoch}.jpg';
        await profileRepo.uploadProfilePhoto(
          photoFile: _selectedImage!,
          fileName: fileName,
          mimeType: 'image/jpeg',
        );

        setState(() => _isUploadingPhoto = false);
      }

      // Update profile
      await profileRepo.updateOwnProfile(
        fullName: _nameController.text.trim().isNotEmpty
            ? _nameController.text.trim()
            : null,
        phoneNumber: _phoneController.text.trim().isNotEmpty
            ? _phoneController.text.trim()
            : null,
      );

      // Reload user to get updated data
      await FirebaseAuth.instance.currentUser?.reload();

      if (mounted) {
        // Refresh the session
        context.read<SessionController>().refreshUser();

        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profile updated successfully'),
            backgroundColor: Color(0xFF4CAF50),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update profile: ${e.toString()}'),
            backgroundColor: errorBackground,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _isUploadingPhoto = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<SessionController>();
    final user = session.user;

    return AlertDialog(
      backgroundColor: backgroundPrimary,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radiusLarge * 1.5),
      ),
      title: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: const Color(0xFF4CAF50).withOpacity(0.1),
              borderRadius: BorderRadius.circular(radiusMedium),
            ),
            child: const Icon(
              Icons.person_outline,
              color: Color(0xFF4CAF50),
              size: 22,
            ),
          ),
          const SizedBox(width: gapMedium),
          Text(
            'Edit Profile',
            style: app_typography.headingMedium.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
      content: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Profile photo
              GestureDetector(
                onTap: _isLoading ? null : _pickImage,
                child: Stack(
                  children: [
                    Container(
                      width: 100,
                      height: 100,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: const Color(0xFF4CAF50),
                          width: 3,
                        ),
                      ),
                      child: ClipOval(
                        child: _selectedImage != null
                            ? Image.file(
                                _selectedImage!,
                                fit: BoxFit.cover,
                              )
                            : user?.photoURL != null
                                ? Image.network(
                                    user!.photoURL!,
                                    fit: BoxFit.cover,
                                  )
                                : Icon(
                                    Icons.person,
                                    size: 50,
                                    color: textSecondary,
                                  ),
                      ),
                    ),
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: const Color(0xFF4CAF50),
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: backgroundPrimary,
                            width: 2,
                          ),
                        ),
                        child: Icon(
                          _isUploadingPhoto
                              ? Icons.hourglass_empty
                              : Icons.camera_alt,
                          color: Colors.white,
                          size: 16,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: space2),
              Text(
                'Tap to change photo',
                style: app_typography.bodySmall.copyWith(
                  color: textSecondary,
                ),
              ),
              const SizedBox(height: space6),

              // Full name
              TextFormField(
                controller: _nameController,
                decoration: InputDecoration(
                  labelText: 'Full Name',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(radiusLarge),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(radiusLarge),
                    borderSide: BorderSide(color: borderColor),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(radiusLarge),
                    borderSide: const BorderSide(color: Color(0xFF4CAF50)),
                  ),
                  prefixIcon: const Icon(Icons.person_outline),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Please enter your name';
                  }
                  return null;
                },
              ),
              const SizedBox(height: space4),

              // Phone number
              TextFormField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(
                  labelText: 'Phone Number (Optional)',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(radiusLarge),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(radiusLarge),
                    borderSide: BorderSide(color: borderColor),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(radiusLarge),
                    borderSide: const BorderSide(color: Color(0xFF4CAF50)),
                  ),
                  prefixIcon: const Icon(Icons.phone_outlined),
                ),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isLoading ? null : () => Navigator.of(context).pop(),
          style: TextButton.styleFrom(
            padding: const EdgeInsets.symmetric(
              horizontal: paddingLarge,
              vertical: paddingSmall,
            ),
          ),
          child: Text(
            'Cancel',
            style: app_typography.labelMedium.copyWith(
              color: textSecondary,
            ),
          ),
        ),
        ElevatedButton(
          onPressed: _isLoading ? null : _handleSave,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF4CAF50),
            foregroundColor: backgroundPrimary,
            padding: const EdgeInsets.symmetric(
              horizontal: paddingLarge * 1.5,
              vertical: paddingSmall,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(radiusLarge),
            ),
            elevation: 0,
          ),
          child: _isLoading
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                )
              : Text(
                  'Save Changes',
                  style: app_typography.labelMedium.copyWith(
                    color: backgroundPrimary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
        ),
      ],
    );
  }
}

/// Change password dialog
class _ChangePasswordDialog extends StatefulWidget {
  const _ChangePasswordDialog();

  @override
  State<_ChangePasswordDialog> createState() => _ChangePasswordDialogState();
}

class _ChangePasswordDialogState extends State<_ChangePasswordDialog> {
  final _formKey = GlobalKey<FormState>();
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _isLoading = false;
  bool _obscureCurrentPassword = true;
  bool _obscureNewPassword = true;
  bool _obscureConfirmPassword = true;

  @override
  void dispose() {
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _handleChangePassword() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _isLoading = true);

    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null || user.email == null) {
        throw Exception('No user logged in');
      }

      // Reauthenticate
      final credential = EmailAuthProvider.credential(
        email: user.email!,
        password: _currentPasswordController.text,
      );
      await user.reauthenticateWithCredential(credential);

      // Update password
      await user.updatePassword(_newPasswordController.text);

      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Password changed successfully'),
            backgroundColor: Color(0xFF4CAF50),
          ),
        );
      }
    } on FirebaseAuthException catch (e) {
      String message = 'Failed to change password';
      if (e.code == 'wrong-password') {
        message = 'Current password is incorrect';
      } else if (e.code == 'weak-password') {
        message = 'New password is too weak';
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(message),
            backgroundColor: errorBackground,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: errorBackground,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: backgroundPrimary,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radiusLarge * 1.5),
      ),
      title: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: const Color(0xFF2196F3).withOpacity(0.1),
              borderRadius: BorderRadius.circular(radiusMedium),
            ),
            child: const Icon(
              Icons.lock_outline,
              color: Color(0xFF2196F3),
              size: 22,
            ),
          ),
          const SizedBox(width: gapMedium),
          Text(
            'Change Password',
            style: app_typography.headingMedium.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Current password
            TextFormField(
              controller: _currentPasswordController,
              obscureText: _obscureCurrentPassword,
              decoration: InputDecoration(
                labelText: 'Current Password',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(radiusLarge),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(radiusLarge),
                  borderSide: BorderSide(color: borderColor),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(radiusLarge),
                  borderSide: const BorderSide(color: Color(0xFF4CAF50)),
                ),
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscureCurrentPassword
                        ? Icons.visibility_off
                        : Icons.visibility,
                  ),
                  onPressed: () {
                    setState(() {
                      _obscureCurrentPassword = !_obscureCurrentPassword;
                    });
                  },
                ),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter current password';
                }
                return null;
              },
            ),
            const SizedBox(height: space4),

            // New password
            TextFormField(
              controller: _newPasswordController,
              obscureText: _obscureNewPassword,
              decoration: InputDecoration(
                labelText: 'New Password',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(radiusLarge),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(radiusLarge),
                  borderSide: BorderSide(color: borderColor),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(radiusLarge),
                  borderSide: const BorderSide(color: Color(0xFF4CAF50)),
                ),
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscureNewPassword
                        ? Icons.visibility_off
                        : Icons.visibility,
                  ),
                  onPressed: () {
                    setState(() {
                      _obscureNewPassword = !_obscureNewPassword;
                    });
                  },
                ),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter new password';
                }
                if (value.length < 6) {
                  return 'Password must be at least 6 characters';
                }
                return null;
              },
            ),
            const SizedBox(height: space4),

            // Confirm password
            TextFormField(
              controller: _confirmPasswordController,
              obscureText: _obscureConfirmPassword,
              decoration: InputDecoration(
                labelText: 'Confirm Password',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(radiusLarge),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(radiusLarge),
                  borderSide: BorderSide(color: borderColor),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(radiusLarge),
                  borderSide: const BorderSide(color: Color(0xFF4CAF50)),
                ),
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscureConfirmPassword
                        ? Icons.visibility_off
                        : Icons.visibility,
                  ),
                  onPressed: () {
                    setState(() {
                      _obscureConfirmPassword = !_obscureConfirmPassword;
                    });
                  },
                ),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please confirm password';
                }
                if (value != _newPasswordController.text) {
                  return 'Passwords do not match';
                }
                return null;
              },
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isLoading ? null : () => Navigator.of(context).pop(),
          style: TextButton.styleFrom(
            padding: const EdgeInsets.symmetric(
              horizontal: paddingLarge,
              vertical: paddingSmall,
            ),
          ),
          child: Text(
            'Cancel',
            style: app_typography.labelMedium.copyWith(
              color: textSecondary,
            ),
          ),
        ),
        ElevatedButton(
          onPressed: _isLoading ? null : _handleChangePassword,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF4CAF50),
            foregroundColor: backgroundPrimary,
            padding: const EdgeInsets.symmetric(
              horizontal: paddingLarge * 1.5,
              vertical: paddingSmall,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(radiusLarge),
            ),
            elevation: 0,
          ),
          child: _isLoading
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                )
              : Text(
                  'Change Password',
                  style: app_typography.labelMedium.copyWith(
                    color: backgroundPrimary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
        ),
      ],
    );
  }
}

/// Profile controller
class ProfileController extends ChangeNotifier {
  ProfileController({
    TelemetryService? telemetry,
  }) : _telemetry = telemetry ?? TelemetryService();

  final TelemetryService _telemetry;

  Future<void> logout(BuildContext context) async {
    _telemetry.recordEvent('profile_logout_initiated');

    // Capture session controller reference before showing dialog
    final sessionController = Provider.of<SessionController>(context, listen: false);

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: backgroundPrimary,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusLarge * 1.5),
        ),
        title: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: errorBackground.withOpacity(0.1),
                borderRadius: BorderRadius.circular(radiusMedium),
              ),
              child: Icon(
                Icons.logout_rounded,
                color: errorBackground,
                size: 22,
              ),
            ),
            const SizedBox(width: gapMedium),
            Text(
              'Logout',
              style: app_typography.headingSmall.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        content: Text(
          'Are you sure you want to logout?',
          style: app_typography.bodyMedium,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(
                horizontal: paddingLarge,
                vertical: paddingSmall,
              ),
            ),
            child: Text(
              'Cancel',
              style: app_typography.labelMedium.copyWith(
                color: textSecondary,
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: errorBackground,
              foregroundColor: backgroundPrimary,
              padding: const EdgeInsets.symmetric(
                horizontal: paddingLarge,
                vertical: paddingSmall,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(radiusLarge),
              ),
            ),
            child: Text(
              'Logout',
              style: app_typography.labelMedium.copyWith(
                color: backgroundPrimary,
              ),
            ),
          ),
        ],
      ),
    );

    if (confirmed == true && context.mounted) {
      try {
        // Use SessionController's signOut method which handles all cleanup
        await sessionController.signOut();

        _telemetry.recordEvent('profile_logout_completed');

        if (context.mounted) {
          context.go(AppRoutePaths.login);
        }
      } catch (error) {
        _telemetry.recordEvent('profile_logout_failed', metadata: {'error': error.toString()});

        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Logout failed: $error'),
              backgroundColor: errorBackground,
            ),
          );
        }
      }
    }
  }
}
