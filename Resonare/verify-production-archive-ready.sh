#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0
WARNINGS=0

echo -e "${BLUE}🔍 Production Archive Readiness Verification${NC}"
echo "=============================================="
echo ""

# Function to check and report
check_item() {
    local description="$1"
    local condition="$2"
    local fix_suggestion="$3"
    
    if eval "$condition"; then
        echo -e "✅ ${GREEN}$description${NC}"
        ((CHECKS_PASSED++))
        return 0
    else
        echo -e "❌ ${RED}$description${NC}"
        if [ -n "$fix_suggestion" ]; then
            echo -e "   ${YELLOW}Fix: $fix_suggestion${NC}"
        fi
        ((CHECKS_FAILED++))
        return 1
    fi
}

warn_item() {
    local description="$1"
    local suggestion="$2"
    
    echo -e "⚠️  ${YELLOW}$description${NC}"
    if [ -n "$suggestion" ]; then
        echo -e "   ${YELLOW}Note: $suggestion${NC}"
    fi
    ((WARNINGS++))
}

echo -e "${BLUE}📱 iOS Project Structure${NC}"
echo "------------------------"

check_item "Xcode workspace exists" \
    "[ -f 'ios/Resonare.xcworkspace/contents.xcworkspacedata' ]" \
    "Run 'cd ios && pod install'"

check_item "Xcode project exists" \
    "[ -f 'ios/Resonare.xcodeproj/project.pbxproj' ]" \
    "Xcode project is missing or corrupted"

check_item "Podfile.lock exists" \
    "[ -f 'ios/Podfile.lock' ]" \
    "Run 'cd ios && pod install'"

echo ""
echo -e "${BLUE}🔧 Environment Configuration${NC}"
echo "-----------------------------"

check_item "react-native-config dependency installed" \
    "grep -q 'react-native-config' package.json" \
    "Run 'npm install react-native-config'"

check_item "Environment configuration file exists" \
    "[ -f 'src/config/environment.ts' ]" \
    "Environment configuration is missing"

# Check if .env.production exists (user said they have it locally)
if [ -f ".env.production" ]; then
    check_item ".env.production file exists" "true"
    
    # Check if it has ENVIRONMENT=production
    if grep -q "ENVIRONMENT=production" .env.production; then
        check_item ".env.production has ENVIRONMENT=production" "true"
    else
        check_item ".env.production has ENVIRONMENT=production" "false" \
            "Add 'ENVIRONMENT=production' to your .env.production file"
    fi
    
    # Check for required variables
    check_item ".env.production has SUPABASE_URL" \
        "grep -q 'SUPABASE_URL=' .env.production" \
        "Add your production Supabase URL"
        
    check_item ".env.production has SUPABASE_ANON_KEY" \
        "grep -q 'SUPABASE_ANON_KEY=' .env.production" \
        "Add your production Supabase anon key"
        
else
    check_item ".env.production file exists" "false" \
        "Create .env.production with your production environment variables"
fi

echo ""
echo -e "${BLUE}🏗️ Build Configuration${NC}"
echo "-----------------------"

# Check Xcode scheme configuration
SCHEME_FILE="ios/Resonare.xcodeproj/xcshareddata/xcschemes/Resonare.xcscheme"
if [ -f "$SCHEME_FILE" ]; then
    check_item "Main Xcode scheme exists" "true"
    
    # Check if Archive uses Release configuration
    if grep -A 5 "ArchiveAction" "$SCHEME_FILE" | grep -q 'buildConfiguration = "Release"'; then
        check_item "Archive scheme uses Release configuration" "true"
    else
        check_item "Archive scheme uses Release configuration" "false" \
            "In Xcode: Edit Scheme → Archive → Build Configuration = Release"
    fi
else
    check_item "Main Xcode scheme exists" "false" \
        "Xcode scheme file is missing"
fi

# Check if project has Release configuration
if grep -q "Release.*= {" ios/Resonare.xcodeproj/project.pbxproj; then
    check_item "Release build configuration exists" "true"
else
    check_item "Release build configuration exists" "false" \
        "Release configuration is missing from Xcode project"
fi

echo ""
echo -e "${BLUE}🔐 Code Signing & Certificates${NC}"
echo "--------------------------------"

# Check for development team
if grep -q "DEVELOPMENT_TEAM" ios/Resonare.xcodeproj/project.pbxproj; then
    TEAM_ID=$(grep "DEVELOPMENT_TEAM" ios/Resonare.xcodeproj/project.pbxproj | head -1 | sed 's/.*= \(.*\);/\1/')
    if [ "$TEAM_ID" != '""' ] && [ "$TEAM_ID" != "" ]; then
        check_item "Development team configured" "true"
    else
        check_item "Development team configured" "false" \
            "Set your Apple Developer Team in Xcode project settings"
    fi
else
    check_item "Development team configured" "false" \
        "Set your Apple Developer Team in Xcode project settings"
fi

# Check bundle identifier
if grep -q "PRODUCT_BUNDLE_IDENTIFIER" ios/Resonare.xcodeproj/project.pbxproj; then
    check_item "Bundle identifier configured" "true"
else
    check_item "Bundle identifier configured" "false" \
        "Set bundle identifier in Xcode project settings"
fi

# Check for entitlements (Apple Sign-In)
check_item "App entitlements file exists" \
    "[ -f 'ios/Resonare/Resonare.entitlements' ]" \
    "Entitlements file needed for Apple Sign-In"

echo ""
echo -e "${BLUE}📦 Dependencies & Native Modules${NC}"
echo "----------------------------------"

# Check for key native dependencies
check_item "Google Sign-In configured" \
    "grep -q 'GoogleService-Info.plist\\|client.*\\.plist' ios/Resonare.xcodeproj/project.pbxproj || ls ios/ | grep -q 'client.*\\.plist'" \
    "Add GoogleService-Info.plist to iOS project"

check_item "Apple Authentication dependency" \
    "grep -q 'react-native-apple-authentication' package.json" \
    "Apple Sign-In dependency is installed"

# Check if pods are installed (Podfile.lock indicates they were installed previously)
if [ -f "ios/Podfile.lock" ]; then
    if [ -d "ios/Pods" ]; then
        check_item "CocoaPods installed and up to date" "true"
    else
        warn_item "Pods directory missing but Podfile.lock exists" \
            "May need to run 'cd ios && pod install' locally (this is normal in remote environments)"
    fi
else
    check_item "CocoaPods configured" "false" \
        "Run 'cd ios && pod install'"
fi

echo ""
echo -e "${BLUE}🧪 Build Script Verification${NC}"
echo "-----------------------------"

warn_item "Build script phase needs manual verification" \
    "Check in Xcode: Target → Build Phases → Look for 'Set Production Environment' script"

warn_item "Build script should be BEFORE Compile Sources" \
    "Drag the script phase above 'Compile Sources' in Build Phases"

echo ""
echo -e "${BLUE}🎯 Pre-Archive Checklist${NC}"
echo "-------------------------"

echo "Before creating your Archive, ensure:"
echo "1. 📱 Connect a physical iOS device OR select 'Any iOS Device (arm64)'"
echo "2. 🔐 Sign in to Xcode with your Apple Developer account"
echo "3. 🏗️  Build script phase added and positioned correctly"
echo "4. 📋 All failing checks above are resolved"

echo ""
echo -e "${BLUE}📊 Verification Summary${NC}"
echo "======================="
echo -e "✅ Checks Passed: ${GREEN}$CHECKS_PASSED${NC}"
echo -e "❌ Checks Failed: ${RED}$CHECKS_FAILED${NC}"
echo -e "⚠️  Warnings: ${YELLOW}$WARNINGS${NC}"

echo ""
if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 READY FOR PRODUCTION ARCHIVE!${NC}"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Open Xcode: open ios/Resonare.xcworkspace"
    echo "2. Add build script phase (if not done): Target → Build Phases → + → New Run Script Phase"
    echo "3. Select 'Any iOS Device (arm64)'"
    echo "4. Product → Archive"
    echo "5. The build will automatically use your .env.production environment"
    echo ""
    echo -e "${GREEN}Your TestFlight build will connect to PRODUCTION Supabase! 🚀${NC}"
else
    echo -e "${RED}❌ ISSUES FOUND - Please fix the failed checks before creating Archive${NC}"
    echo ""
    echo "Most common fixes:"
    echo "• Run 'cd ios && pod install' for missing pods"
    echo "• Create/update .env.production file"
    echo "• Configure Apple Developer team in Xcode"
    echo "• Add build script phase in Xcode Build Phases"
fi

echo ""
echo -e "${BLUE}💡 Production Build Verification:${NC}"
echo "After Archive completes, check the build logs for:"
echo "• '✅ Using production environment: .env.production'"
echo "• No environment-related errors"
echo "• Successful code signing"

exit $CHECKS_FAILED