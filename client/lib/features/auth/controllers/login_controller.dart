import 'package:flutter/material.dart';

import '../../../core/services/auth_repository.dart';

class LoginController extends ChangeNotifier {
  LoginController({AuthRepository? authRepository})
    : _authRepository = authRepository ?? AuthRepository();

  final AuthRepository _authRepository;

  static final RegExp _emailPattern = RegExp(
    r"^[a-zA-Z0-9.!#%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*",
  );

  String _email = '';
  String _password = '';
  bool _isLoading = false;
  String? _errorMessage;
  String? _emailError;
  String? _passwordError;

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String? get emailError => _emailError;
  String? get passwordError => _passwordError;
  bool get canSubmit =>
      !_isLoading && _email.isNotEmpty && _password.isNotEmpty;

  void updateEmail(String value) {
    _email = value.trim();
    _emailError = null;
    _errorMessage = null;
    notifyListeners();
  }

  void updatePassword(String value) {
    _password = value;
    _passwordError = null;
    _errorMessage = null;
    notifyListeners();
  }

  Future<void> signIn(BuildContext context) async {
    if (!_validateInputs()) {
      notifyListeners();
      return;
    }

    _setLoading(true);

    try {
      await _authRepository.signIn(_email, _password);
      _errorMessage = null;
    } on AuthFailure catch (failure) {
      _errorMessage = failure.message;
    } finally {
      _setLoading(false);
    }
  }

  /// Send password reset email for the given email address
  ///
  /// Used by ForgotPasswordDialog to send reset instructions
  /// Throws AuthFailure on error
  Future<void> sendPasswordReset(String email) async {
    final trimmedEmail = email.trim();

    if (!_emailPattern.hasMatch(trimmedEmail)) {
      throw const AuthFailure('Please enter a valid email address.');
    }

    await _authRepository.sendPasswordResetEmail(trimmedEmail);
  }

  bool _validateInputs() {
    _emailError = null;
    _passwordError = null;

    if (_email.isEmpty) {
      _emailError = 'Email is required.';
    } else if (!_emailPattern.hasMatch(_email)) {
      _emailError = 'Enter a valid email address.';
    }

    if (_password.isEmpty) {
      _passwordError = 'Password is required.';
    } else if (_password.length < 8) {
      _passwordError = 'Password must be at least 8 characters.';
    }

    return _emailError == null && _passwordError == null;
  }

  void _setLoading(bool value) {
    if (_isLoading == value) {
      return;
    }
    _isLoading = value;
    notifyListeners();
  }
}
