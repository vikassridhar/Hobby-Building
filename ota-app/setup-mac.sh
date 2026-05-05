#!/bin/bash
# ============================================================
# TravelApp — MacBook Setup Script
# Run this on your MacBook Pro (Apple Silicon)
# ============================================================
#
# Prerequisites (install if you don't have them):
#   brew install node
#   Download Android Studio: https://developer.android.com/studio
#   Xcode from Mac App Store (for iOS)
#
# ============================================================

set -e

echo "✈️  TravelApp — MacBook Setup"
echo "============================="

# 1. Create project directory
PROJECT_DIR="$HOME/Projects/ota-app"
mkdir -p "$PROJECT_DIR"

echo ""
echo "📦 Step 1: Copy project from GB10"
echo "   Run this FIRST if you haven't already:"
echo "   scp -r node@GB10_IP:/home/node/.openclaw/workspace/ota-app $PROJECT_DIR"
echo ""
echo "   OR if you downloaded ota-app.tar.gz:"
echo "   cd ~/Projects && tar xzf ota-app.tar.gz"
echo ""
read -p "Press Enter once files are in $PROJECT_DIR ..."

# 2. Install dependencies
echo ""
echo "📦 Step 2: Installing npm dependencies..."
cd "$PROJECT_DIR"
npm install

# 3. Build web app
echo ""
echo "🔨 Step 3: Building web app..."
npx vite build
echo "✅ Built! dist/ folder created"

# 4. Install Capacitor CLI globally (optional but handy)
echo ""
echo "📱 Step 4: Setting up Capacitor..."
npx cap sync

echo ""
echo "✅ Setup complete!"
echo ""
echo "============================="
echo "RUN THE WEB APP (development):"
echo "  cd $PROJECT_DIR"
echo "  npx vite --host 0.0.0.0"
echo "  → Open http://localhost:5173"
echo ""
echo "RUN ON iOS SIMULATOR:"
echo "  npx cap open ios"
echo "  → Xcode opens → Press ⌘R to run"
echo ""
echo "RUN ON ANDROID EMULATOR:"
echo "  npx cap open android"
echo "  → Android Studio opens → Press ▶ to run"
echo "============================="
