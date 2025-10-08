import 'package:firebase_auth/firebase_auth.dart';

class AuthFailure implements Exception {
  const AuthFailure(this.message);

  final String message;
}

class AuthRepository {
  AuthRepository({FirebaseAuth? firebaseAuth})
      : _firebaseAuth = firebaseAuth ?? FirebaseAuth.instance;

  final FirebaseAuth _firebaseAuth;

  Future<void> signIn(String email, String password) async {
    try {
      final UserCredential credential = await _firebaseAuth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );

      final user = credential.user;
      if (user == null) {
        throw const AuthFailure('Unable to complete sign in. Please try again.');
      }

      final idTokenResult = await user.getIdTokenResult(true);
      final role = idTokenResult.claims?['role'];

      if (role != 'employee') {
        await _firebaseAuth.signOut();
        throw const AuthFailure('Your account does not have employee access. Contact an administrator.');
      }
    } on FirebaseAuthException catch (error) {
      throw AuthFailure(_mapAuthError(error));
    }
  }

  Future<void> sendPasswordResetEmail(String email) async {
    try {
      await _firebaseAuth.sendPasswordResetEmail(email: email);
    } on FirebaseAuthException catch (error) {
      throw AuthFailure(_mapAuthError(error));
    }
  }

  Future<void> signOut() async {
    await _firebaseAuth.signOut();
  }

  String _mapAuthError(FirebaseAuthException error) {
    switch (error.code) {
      case 'invalid-email':
        return 'The email address appears to be invalid.';
      case 'user-disabled':
        return 'This account has been disabled. Contact an administrator.';
      case 'user-not-found':
        return 'No account found with that email address.';
      case 'wrong-password':
        return 'Incorrect password. Please try again.';
      case 'too-many-requests':
        return 'Too many attempts. Please wait a moment and try again.';
      case 'network-request-failed':
        return 'Network error. Check your connection and try again.';
      default:
        return 'Authentication failed. (${error.code})';
    }
  }
}

