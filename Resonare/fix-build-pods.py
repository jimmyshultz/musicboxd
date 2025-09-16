#!/usr/bin/env python3

"""
Fix CocoaPods Build Integration
This script modifies the Xcode project to automatically run pod install during builds
"""

import re
import os
import shutil

def main():
    print("🔧 Fixing CocoaPods build integration...")
    print("======================================")
    
    project_file = "ios/Resonare.xcodeproj/project.pbxproj"
    
    if not os.path.exists(project_file):
        print(f"❌ Error: Could not find {project_file}")
        return 1
    
    print("📁 Found Xcode project file")
    
    # Create backup
    backup_file = project_file + ".backup"
    shutil.copy2(project_file, backup_file)
    print(f"💾 Created backup: {backup_file}")
    
    # Read the project file
    with open(project_file, 'r') as f:
        content = f.read()
    
    # Define the new script
    new_script = '''# Auto-install CocoaPods if needed
set -e

echo "🔍 Checking CocoaPods synchronization..."

PODS_ROOT="${PODS_ROOT}"
PODFILE_DIR="${PODS_PODFILE_DIR_PATH}"
PODFILE_LOCK="${PODFILE_DIR}/Podfile.lock"
MANIFEST_LOCK="${PODS_ROOT}/Manifest.lock"

# Check if pods need to be installed
if [ ! -d "${PODS_ROOT}" ] || [ ! -f "${MANIFEST_LOCK}" ] || ! diff "${PODFILE_LOCK}" "${MANIFEST_LOCK}" > /dev/null 2>&1; then
  echo "⚠️  CocoaPods out of sync. Running pod install..."
  
  cd "${PODFILE_DIR}"
  
  # Check if pod command exists
  if ! command -v pod &> /dev/null; then
    echo "❌ Error: pod command not found. Please install CocoaPods:"
    echo "   sudo gem install cocoapods"
    exit 1
  fi
  
  # Run pod install
  pod install
  
  if [ $? -eq 0 ]; then
    echo "✅ CocoaPods installation completed successfully"
  else
    echo "❌ Error: pod install failed"
    exit 1
  fi
else
  echo "✅ CocoaPods already in sync"
fi

# Output success for Xcode
echo "SUCCESS" > "${SCRIPT_OUTPUT_FILE_0}"'''
    
    # Escape the script for inclusion in the project file
    escaped_script = new_script.replace('"', '\\"').replace('\n', '\\n')
    
    # Find and replace the existing CocoaPods check script
    # Look for the pattern that includes the problematic script
    old_pattern = r'shellScript = "diff.*?echo \\"SUCCESS\\" > \\".*?SCRIPT_OUTPUT_FILE_0.*?\\";'
    new_shell_script = f'shellScript = "{escaped_script}";'
    
    # Perform the replacement
    new_content = re.sub(old_pattern, new_shell_script, content, flags=re.DOTALL)
    
    # Check if replacement was successful
    if 'Auto-install CocoaPods if needed' in new_content:
        print("✅ Successfully found and replaced CocoaPods script")
    else:
        print("⚠️  Pattern not found. Trying alternative approach...")
        
        # Alternative: look for the specific error message
        alt_pattern = r'echo "error: The sandbox is not in sync.*?echo "SUCCESS" > "\${SCRIPT_OUTPUT_FILE_0}"'
        alt_replacement = escaped_script
        
        new_content = re.sub(alt_pattern, alt_replacement, content, flags=re.DOTALL)
        
        if 'Auto-install CocoaPods if needed' in new_content:
            print("✅ Successfully replaced using alternative pattern")
        else:
            print("❌ Could not find the CocoaPods script to replace")
            print("The project file may have a different structure than expected")
            return 1
    
    # Also try to update the build phase name
    new_content = re.sub(
        r'name = "\[CP\] Check Pods Manifest\.lock";',
        'name = "[CP] Auto-Install Pods";',
        new_content
    )
    
    # Write the modified content back
    with open(project_file, 'w') as f:
        f.write(new_content)
    
    print("")
    print("🎉 Successfully integrated pod install into build process!")
    print("======================================================")
    print("")
    print("📋 What this does:")
    print("• Automatically checks if CocoaPods are in sync before building")
    print("• Runs 'pod install' automatically if pods are missing or out of sync")
    print("• Shows progress in Xcode build log")
    print("• Prevents the build errors you were experiencing")
    print("")
    print("📱 Next steps:")
    print("1. Open Resonare.xcworkspace in Xcode")
    print("2. Try Product → Archive (or any build)")
    print("3. Watch the build log - you'll see CocoaPods status messages")
    print("4. The build should now succeed without manual pod install")
    print("")
    print("🔍 To verify the change:")
    print(f"grep -A 5 'Auto-install CocoaPods' {project_file}")
    print("")
    print("🔄 To revert if needed:")
    print(f"cp {backup_file} {project_file}")
    
    return 0

if __name__ == "__main__":
    exit(main())