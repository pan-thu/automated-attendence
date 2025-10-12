#!/bin/bash

# Firebase Emulator Setup Script
# This script starts emulators and seeds test data

set -e

echo "🚀 Firebase Emulator Setup"
echo "=========================="
echo ""

# Step 1: Build TypeScript
echo "📦 Building TypeScript..."
npm run build
echo "✅ Build complete"
echo ""

# Step 2: Start emulators in background
echo "🔧 Starting Firebase emulators in background..."
npm run serve > emulator.log 2>&1 &
EMULATOR_PID=$!

echo "   Emulator PID: $EMULATOR_PID"
echo "   Logs: functions/emulator.log"
echo ""

# Step 3: Wait for emulators to be ready
echo "⏳ Waiting for emulators to start..."
sleep 5

# Check if emulators are running
if ! curl -s http://localhost:4000 > /dev/null; then
  echo "⚠️  Emulators UI not responding yet, waiting longer..."
  sleep 10
fi

if curl -s http://localhost:4000 > /dev/null; then
  echo "✅ Emulators are ready!"
  echo "   UI: http://localhost:4000"
else
  echo "❌ Emulators failed to start. Check emulator.log for details."
  exit 1
fi
echo ""

# Step 4: Seed data
echo "🌱 Seeding test data..."
npm run seed:firestore
echo ""

# Step 5: Instructions
echo "=========================="
echo "✅ Setup Complete!"
echo ""
echo "📊 Emulator UI: http://localhost:4000"
echo "🔧 Emulator PID: $EMULATOR_PID"
echo ""
echo "Login Credentials:"
echo "  Email: admin@example.com"
echo "  Password: admin123"
echo ""
echo "To stop emulators:"
echo "  kill $EMULATOR_PID"
echo "  or press Ctrl+C and run: kill $EMULATOR_PID"
echo ""
echo "Emulator logs: functions/emulator.log"
echo "=========================="
