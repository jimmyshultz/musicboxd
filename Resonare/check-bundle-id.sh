#!/bin/bash

echo "🔍 Bundle ID and Configuration Check"
echo "===================================="
echo ""

# Check iOS Bundle ID from Xcode project
echo "📱 iOS Project Bundle ID:"
if [ -f "ios/Resonare.xcodeproj/project.pbxproj" ]; then
    BUNDLE_ID=$(grep -m 1 "PRODUCT_BUNDLE_IDENTIFIER" ios/Resonare.xcodeproj/project.pbxproj | sed 's/.*= //' | sed 's/;//' | tr -d ' ')
    echo "   $BUNDLE_ID"
else
    echo "   ❌ Could not find iOS project file"
fi
echo ""

# Check production environment configuration
echo "🔧 Production Environment:"
if [ -f ".env.production" ]; then
    echo "✅ .env.production exists"
    
    # Check for Bundle ID references
    if grep -q "BUNDLE_ID" .env.production; then
        echo "   Bundle ID config: $(grep BUNDLE_ID .env.production)"
    fi
    
    # Check Supabase URL (without revealing full URL)
    if grep -q "SUPABASE_URL" .env.production; then
        SUPABASE_URL=$(grep SUPABASE_URL .env.production | cut -d'=' -f2)
        echo "   Supabase URL: ${SUPABASE_URL:0:30}..."
    fi
    
    # Check environment setting
    if grep -q "ENVIRONMENT=production" .env.production; then
        echo "   ✅ Environment set to production"
    else
        echo "   ⚠️  Environment not set to production"
    fi
else
    echo "❌ .env.production not found"
fi
echo ""

# Check Apple entitlements
echo "🍎 Apple Sign-In Entitlements:"
if [ -f "ios/Resonare/Resonare.entitlements" ]; then
    if grep -q "com.apple.developer.applesignin" ios/Resonare/Resonare.entitlements; then
        echo "   ✅ Apple Sign-In entitlement configured"
    else
        echo "   ❌ Apple Sign-In entitlement missing"
    fi
else
    echo "   ❌ Entitlements file not found"
fi
echo ""

echo "🎯 Key Points to Verify in Production Supabase:"
echo ""
echo "1. Apple Provider Configuration:"
echo "   - Client ID should be: $BUNDLE_ID"
echo "   - Team ID: Your Apple Developer Team ID (10 chars)"
echo "   - Key ID: Your Apple Sign-In Key ID (10 chars)"
echo "   - Private Key: Complete .p8 file content"
echo ""
echo "2. Google Provider Configuration:"
echo "   - Client ID: Your production Google OAuth Client ID"
echo "   - Client Secret: Your production Google OAuth Secret"
echo ""
echo "3. Environment Check:"
echo "   - Run with: ENVFILE=.env.production npm run ios"
echo "   - Console should show: 'Current Environment: production'"
echo ""