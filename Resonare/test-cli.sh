#!/bin/bash

echo "🔧 Testing React Native CLI..."
echo ""

# Test if React Native CLI is available
echo "Testing npx @react-native-community/cli..."
npx @react-native-community/cli --version 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ React Native CLI is working!"
    echo ""
    echo "Available commands:"
    echo "  npm run ios:dev     - Development build"
    echo "  npm run ios:staging - Staging build" 
    echo "  npm run ios         - Basic build"
    echo ""
    echo "🚀 You can now run:"
    echo "  npm run ios:dev"
else
    echo "❌ React Native CLI not working"
    echo ""
    echo "Try installing the CLI:"
    echo "  npm install -g @react-native-community/cli"
    echo ""
    echo "Or use npx directly:"
    echo "  ENVFILE=.env.development npx @react-native-community/cli run-ios --scheme Resonare-Development"
fi

echo ""