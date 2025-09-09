#!/bin/bash

echo "🔧 Testing React Native CLI..."
echo ""

# Test if React Native CLI is available
echo "Testing npx react-native..."
npx react-native --version 2>/dev/null

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
    echo "Try using npx directly:"
    echo "  ENVFILE=.env.development npx react-native run-ios --scheme Resonare-Development"
fi

echo ""