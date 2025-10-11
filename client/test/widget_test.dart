import 'package:client/core/config/app_environment.dart';
import 'package:client/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('App bootstrap smoke test', (WidgetTester tester) async {
    final appEnvironment = AppEnvironment();

    // Build the app and trigger a frame
    await tester.pumpWidget(AppBootstrap(environment: appEnvironment));

    // Verify that splash screen is shown initially
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });
}
