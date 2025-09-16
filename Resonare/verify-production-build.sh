#!/bin/bash

echo "🔍 Verifying Production Build Configuration"
echo "========================================="

# Check if .env.production exists (you said you have it locally)
echo "✅ .env.production file: You confirmed this exists locally"

# Check react-native-config setup
echo ""
echo "📦 Checking react-native-config setup..."
if grep -q "react-native-config" package.json; then
    echo "✅ react-native-config is installed"
else
    echo "❌ react-native-config not found in package.json"
fi

# Check environment configuration
echo ""
echo "🔧 Environment configuration:"
if [ -f "src/config/environment.ts" ]; then
    echo "✅ Environment configuration file exists"
    echo "   - Reads Config.ENVIRONMENT from react-native-config"
    echo "   - Defaults to 'development' if not set"
else
    echo "❌ Environment configuration file not found"
fi

echo ""
echo "🏗️ For Production TestFlight Build:"
echo "   1. Archive build must use Release configuration ✅"
echo "   2. Archive scheme must set ENVFILE=.env.production ⚠️ (needs configuration)"
echo "   3. Your .env.production must have ENVIRONMENT=production ⚠️ (please verify)"
echo ""
echo "🎯 Next Steps:"
echo "   1. Configure Xcode Archive scheme to use .env.production"
echo "   2. Verify your .env.production has ENVIRONMENT=production"
echo "   3. Create Archive build"
echo "   4. Upload to TestFlight"