#!/usr/bin/env python3

"""
Option 2: Disable CocoaPods check and enhance Production Environment script
"""

import os
import shutil

def main():
    print("🔧 Implementing Option 2: Enhanced Production Environment approach...")
    print("================================================================")
    
    project_file = "ios/Resonare.xcodeproj/project.pbxproj"
    
    if not os.path.exists(project_file):
        print(f"❌ Error: Could not find {project_file}")
        return 1
    
    # Create backup
    backup_file = project_file + ".option2.backup"
    shutil.copy2(project_file, backup_file)
    print(f"💾 Created backup: {backup_file}")
    
    # Read the project file
    with open(project_file, 'r') as f:
        content = f.read()
    
    # Step 1: Disable the CocoaPods check by commenting it out
    print("🔄 Step 1: Disabling CocoaPods check phase...")
    
    # Find the CocoaPods check script and comment it out
    cocoapods_check_pattern = 'shellScript = "# Auto-install CocoaPods if needed'
    if cocoapods_check_pattern in content:
        # Replace with a simple success script
        content = content.replace(
            'shellScript = "# Auto-install CocoaPods if needed\\nset -e\\n\\necho \\"🔍 Checking CocoaPods synchronization...\\"\\n\\nPODS_ROOT=\\"${PODS_ROOT}\\"\\nPODFILE_DIR=\\"${PODS_PODFILE_DIR_PATH}\\"\\nPODFILE_LOCK=\\"${PODFILE_DIR}/Podfile.lock\\"\\nMANIFEST_LOCK=\\"${PODS_ROOT}/Manifest.lock\\"\\n\\n# Check if pods need to be installed\\nif [ ! -d \\"${PODS_ROOT}\\" ] || [ ! -f \\"${MANIFEST_LOCK}\\" ] || ! diff \\"${PODFILE_LOCK}\\" \\"${MANIFEST_LOCK}\\" > /dev/null 2>&1; then\\n  echo \\"⚠️  CocoaPods out of sync. Running pod install...\\"\\n  \\n  cd \\"${PODFILE_DIR}\\"\\n  \\n  # Check if pod command exists\\n  if ! command -v pod &> /dev/null; then\\n    echo \\"❌ Error: pod command not found. Please install CocoaPods:\\"\\n    echo \\"   sudo gem install cocoapods\\"\\n    exit 1\\n  fi\\n  \\n  # Run pod install\\n  pod install\\n  \\n  if [ $? -eq 0 ]; then\\n    echo \\"✅ CocoaPods installation completed successfully\\"\\n  else\\n    echo \\"❌ Error: pod install failed\\"\\n    exit 1\\n  fi\\nelse\\n  echo \\"✅ CocoaPods already in sync\\"\\nfi\\n\\n# Output success for Xcode\\necho \\"SUCCESS\\" > \\"${SCRIPT_OUTPUT_FILE_0}\\"\\n";',
            'shellScript = "# CocoaPods check disabled - handled in Production Environment phase\\necho \\"✅ CocoaPods check skipped\\"\\necho \\"SUCCESS\\" > \\"${SCRIPT_OUTPUT_FILE_0}\\"\\n";'
        )
        print("✅ Disabled CocoaPods auto-install phase")
    else:
        print("⚠️  CocoaPods auto-install phase not found (maybe already disabled)")
    
    # Step 2: Enhance the Production Environment script
    print("🔄 Step 2: Enhancing Production Environment script...")
    
    # Find the existing production environment script
    old_prod_script = 'shellScript = "# Set up environment file for React Native Config\\nPROJECT_ROOT=\\"$SRCROOT/..\\\"\\n\\nif [ \\"${CONFIGURATION}\\" = \\"Release\\" ]; then\\n  ENV_SOURCE=\\"$PROJECT_ROOT/.env.production\\"\\n  ENV_TARGET=\\"$PROJECT_ROOT/.env\\"\\n  \\n  if [ -f \\"$ENV_SOURCE\\" ]; then\\n    echo \\"✅ Archive Build: Copying .env.production for Release configuration\\"\\n    cp \\"$ENV_SOURCE\\" \\"$ENV_TARGET\\"\\n    echo \\"✅ Production environment activated\\"\\n  else\\n    echo \\"⚠️  Warning: .env.production not found at $ENV_SOURCE\\"\\n    echo \\"⚠️  Archive build will use default .env file\\"\\n  fi\\nelse\\n  echo \\"ℹ️  Development Build: Using default .env for configuration: $CONFIGURATION\\"\\nfi\\n";'
    
    new_prod_script = 'shellScript = "# Enhanced Set Production Environment Script\\n# This version handles both environment setup AND CocoaPods installation\\n\\nPROJECT_ROOT=\\"$SRCROOT/..\\\"\\n\\necho \\"🔧 Build Phase: Set Production Environment + CocoaPods\\"\\necho \\"Configuration: $CONFIGURATION\\"\\n\\n# First, ensure CocoaPods are installed (for ALL configurations)\\necho \\"📦 Checking CocoaPods installation...\\"\\n\\n# Navigate to the iOS directory (SRCROOT is already the ios directory)\\ncd \\"$SRCROOT\\"\\n\\nif [ -f \\"Podfile\\" ]; then\\n  # Check if pods need installation\\n  if [ ! -d \\"Pods\\" ] || [ ! -f \\"Pods/Manifest.lock\\" ] || ! diff \\"Podfile.lock\\" \\"Pods/Manifest.lock\\" > /dev/null 2>&1; then\\n    echo \\"⚠️  CocoaPods out of sync. Installing pods...\\"\\n    \\n    if command -v pod >/dev/null 2>&1; then\\n      pod install\\n      echo \\"✅ CocoaPods installation completed\\"\\n    else\\n      echo \\"❌ Error: CocoaPods not found. Please install CocoaPods first.\\"\\n      exit 1\\n    fi\\n  else\\n    echo \\"✅ CocoaPods already in sync\\"\\n  fi\\nelse\\n  echo \\"❌ Error: Podfile not found in $SRCROOT\\"\\n  exit 1\\nfi\\n\\n# Then handle environment configuration\\nif [ \\"${CONFIGURATION}\\" = \\"Release\\" ]; then\\n  ENV_SOURCE=\\"$PROJECT_ROOT/.env.production\\"\\n  ENV_TARGET=\\"$PROJECT_ROOT/.env\\"\\n  \\n  if [ -f \\"$ENV_SOURCE\\" ]; then\\n    echo \\"✅ Archive Build: Copying .env.production for Release configuration\\"\\n    cp \\"$ENV_SOURCE\\" \\"$ENV_TARGET\\"\\n    echo \\"✅ Production environment activated\\"\\n  else\\n    echo \\"⚠️  Warning: .env.production not found at $ENV_SOURCE\\"\\n    echo \\"⚠️  Archive build will use default .env file\\"\\n  fi\\nelse\\n  echo \\"ℹ️  Development Build: Using default .env for configuration: $CONFIGURATION\\"\\nfi\\n\\necho \\"🎉 Build phase completed successfully\\"\\n";'
    
    if old_prod_script in content:
        content = content.replace(old_prod_script, new_prod_script)
        print("✅ Enhanced Production Environment script")
    else:
        print("⚠️  Production Environment script not found - may need manual update")
    
    # Write the modified content back
    with open(project_file, 'w') as f:
        f.write(content)
    
    print("")
    print("🎉 Option 2 implementation completed!")
    print("===================================")
    print("")
    print("📋 What was changed:")
    print("• CocoaPods check phase → Disabled (just outputs success)")
    print("• Production Environment script → Enhanced with CocoaPods installation")
    print("• CocoaPods will now be installed in the Production Environment phase")
    print("")
    print("🔄 To revert to Option 1 (recommended):")
    print(f"cp {backup_file} {project_file}")
    print("python3 fix-build-pods-targeted.py")
    
    return 0

if __name__ == "__main__":
    exit(main())