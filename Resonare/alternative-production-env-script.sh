# Enhanced Set Production Environment Script
# This version handles both environment setup AND CocoaPods installation

PROJECT_ROOT="$SRCROOT/.."

echo "🔧 Build Phase: Set Production Environment + CocoaPods"
echo "Configuration: $CONFIGURATION"

# First, ensure CocoaPods are installed (for ALL configurations)
echo "📦 Checking CocoaPods installation..."

# Navigate to the iOS directory (SRCROOT is already the ios directory)
cd "$SRCROOT"

if [ -f "Podfile" ]; then
  # Check if pods need installation
  if [ ! -d "Pods" ] || [ ! -f "Pods/Manifest.lock" ] || ! diff "Podfile.lock" "Pods/Manifest.lock" > /dev/null 2>&1; then
    echo "⚠️  CocoaPods out of sync. Installing pods..."
    
    if command -v pod >/dev/null 2>&1; then
      pod install
      echo "✅ CocoaPods installation completed"
    else
      echo "❌ Error: CocoaPods not found. Please install CocoaPods first."
      exit 1
    fi
  else
    echo "✅ CocoaPods already in sync"
  fi
else
  echo "❌ Error: Podfile not found in $SRCROOT"
  exit 1
fi

# Then handle environment configuration
if [ "${CONFIGURATION}" = "Release" ]; then
  ENV_SOURCE="$PROJECT_ROOT/.env.production"
  ENV_TARGET="$PROJECT_ROOT/.env"
  
  if [ -f "$ENV_SOURCE" ]; then
    echo "✅ Archive Build: Copying .env.production for Release configuration"
    cp "$ENV_SOURCE" "$ENV_TARGET"
    echo "✅ Production environment activated"
  else
    echo "⚠️  Warning: .env.production not found at $ENV_SOURCE"
    echo "⚠️  Archive build will use default .env file"
  fi
else
  echo "ℹ️  Development Build: Using default .env for configuration: $CONFIGURATION"
fi

echo "🎉 Build phase completed successfully"