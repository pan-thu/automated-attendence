import 'package:flutter/material.dart';

class AuthTextField extends StatelessWidget {
  const AuthTextField({
    super.key,
    required this.label,
    required this.onChanged,
    this.obscureText = false,
    this.keyboardType,
    this.errorText,
  });

  final String label;
  final ValueChanged<String> onChanged;
  final bool obscureText;
  final TextInputType? keyboardType;
  final String? errorText;

  @override
  Widget build(BuildContext context) {
    return TextField(
      onChanged: onChanged,
      obscureText: obscureText,
      keyboardType: keyboardType,
      autofillHints: obscureText ? const [AutofillHints.password] : const [AutofillHints.username],
      textInputAction: obscureText ? TextInputAction.done : TextInputAction.next,
      decoration: InputDecoration(
        labelText: label,
        errorText: errorText,
        border: const OutlineInputBorder(),
      ),
    );
  }
}

