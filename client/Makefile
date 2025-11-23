# Flutter Client Build Commands

# Development with Firebase Emulators (uses default platform-specific IP)
.PHONY: dev
dev:
	@echo "Running Flutter app with Firebase Emulators..."
	@echo "Android emulator will use: 10.0.2.2"
	@echo "iOS simulator will use: localhost"
	flutter run --dart-define=USE_EMULATORS=true

# Development with custom emulator host (for WSL2 or remote emulators)
.PHONY: dev-custom
dev-custom:
	@echo "Running Flutter app with custom emulator host..."
	flutter run --dart-define=USE_EMULATORS=true --dart-define=EMULATOR_HOST=172.26.32.1

# Development build (APK) with emulators
.PHONY: build-dev
build-dev:
	@echo "Building APK with Firebase Emulators configuration..."
	flutter build apk --dart-define=USE_EMULATORS=true

# Production run
.PHONY: prod
prod:
	@echo "Running Flutter app with Firebase Cloud (Production)..."


# Production build (APK)
.PHONY: build-prod
build-prod:
	@echo "Building APK for Production..."
	flutter build apk --release --dart-define=USE_EMULATORS=false

# Production build (iOS)
.PHONY: build-ios-prod
build-ios-prod:
	@echo "Building iOS for Production..."
	flutter build ios --release --dart-define=USE_EMULATORS=false

# Clean build files
.PHONY: clean
clean:
	flutter clean
	flutter pub get

# Run tests
.PHONY: test
test:
	flutter test

# Help command
.PHONY: help
help:
	@echo "Available commands:"
	@echo "  make dev            - Run app with Firebase Emulators (auto-detects Android/iOS)"
	@echo "  make dev-custom     - Run app with custom emulator host (for WSL2)"
	@echo "  make prod           - Run app with Firebase Cloud (Production)"
	@echo "  make build-dev      - Build APK with Firebase Emulators"
	@echo "  make build-prod     - Build APK for Production"
	@echo "  make build-ios-prod - Build iOS for Production"
	@echo "  make clean          - Clean build files and get packages"
	@echo "  make test           - Run Flutter tests"
	@echo "  make help           - Show this help message"