#!/usr/bin/env python3

"""
Fix CocoaPods Build Integration - Targeted Approach
This script modifies the specific CocoaPods check script in the Xcode project
"""

import os
import shutil

def main():
    print("🔧 Fixing CocoaPods build integration (targeted approach)...")
    print("========================================================")
    
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
    
    # Find the exact problematic line
    old_script_line = 'shellScript = "diff \\"${PODS_PODFILE_DIR_PATH}/Podfile.lock\\" \\"${PODS_ROOT}/Manifest.lock\\" > /dev/null\\nif [ $? != 0 ] ; then\\n    # print error to STDERR\\n    echo \\"error: The sandbox is not in sync with the Podfile.lock. Run \'pod install\' or update your CocoaPods installation.\\" >&2\\n    exit 1\\nfi\\n# This output is used by Xcode \'outputs\' to avoid re-running this script phase.\\necho \\"SUCCESS\\" > \\"${SCRIPT_OUTPUT_FILE_0}\\"\\n";'
    
    # Create the new script line
    new_script_line = 'shellScript = "# Auto-install CocoaPods if needed\\nset -e\\n\\necho \\"🔍 Checking CocoaPods synchronization...\\"\\n\\nPODS_ROOT=\\"${PODS_ROOT}\\"\\nPODFILE_DIR=\\"${PODS_PODFILE_DIR_PATH}\\"\\nPODFILE_LOCK=\\"${PODFILE_DIR}/Podfile.lock\\"\\nMANIFEST_LOCK=\\"${PODS_ROOT}/Manifest.lock\\"\\n\\n# Check if pods need to be installed\\nif [ ! -d \\"${PODS_ROOT}\\" ] || [ ! -f \\"${MANIFEST_LOCK}\\" ] || ! diff \\"${PODFILE_LOCK}\\" \\"${MANIFEST_LOCK}\\" > /dev/null 2>&1; then\\n  echo \\"⚠️  CocoaPods out of sync. Running pod install...\\"\\n  \\n  cd \\"${PODFILE_DIR}\\"\\n  \\n  # Check if pod command exists\\n  if ! command -v pod &> /dev/null; then\\n    echo \\"❌ Error: pod command not found. Please install CocoaPods:\\"\\n    echo \\"   sudo gem install cocoapods\\"\\n    exit 1\\n  fi\\n  \\n  # Run pod install\\n  pod install\\n  \\n  if [ $? -eq 0 ]; then\\n    echo \\"✅ CocoaPods installation completed successfully\\"\\n  else\\n    echo \\"❌ Error: pod install failed\\"\\n    exit 1\\n  fi\\nelse\\n  echo \\"✅ CocoaPods already in sync\\"\\nfi\\n\\n# Output success for Xcode\\necho \\"SUCCESS\\" > \\"${SCRIPT_OUTPUT_FILE_0}\\"\\n";'
    
    # Check if the old script exists
    if old_script_line in content:
        print("✅ Found the exact CocoaPods check script")
        
        # Replace it
        new_content = content.replace(old_script_line, new_script_line)
        
        # Verify the replacement
        if 'Auto-install CocoaPods if needed' in new_content:
            print("✅ Successfully replaced the script")
        else:
            print("❌ Replacement failed")
            return 1
            
    else:
        print("⚠️  Exact script not found. Trying partial match...")
        
        # Try to find a partial match
        if 'The sandbox is not in sync with the Podfile.lock' in content:
            print("✅ Found partial match")
            
            # Use a more flexible replacement approach
            lines = content.split('\n')
            new_lines = []
            in_shell_script = False
            script_start_line = -1
            
            for i, line in enumerate(lines):
                if 'shellScript = "diff' in line and 'Podfile.lock' in line:
                    # Found the start of our target script
                    in_shell_script = True
                    script_start_line = i
                    # Replace this entire line with our new script
                    new_lines.append('\t\t\tshellScript = "# Auto-install CocoaPods if needed\\nset -e\\n\\necho \\"🔍 Checking CocoaPods synchronization...\\"\\n\\nPODS_ROOT=\\"${PODS_ROOT}\\"\\nPODFILE_DIR=\\"${PODS_PODFILE_DIR_PATH}\\"\\nPODFILE_LOCK=\\"${PODFILE_DIR}/Podfile.lock\\"\\nMANIFEST_LOCK=\\"${PODS_ROOT}/Manifest.lock\\"\\n\\n# Check if pods need to be installed\\nif [ ! -d \\"${PODS_ROOT}\\" ] || [ ! -f \\"${MANIFEST_LOCK}\\" ] || ! diff \\"${PODFILE_LOCK}\\" \\"${MANIFEST_LOCK}\\" > /dev/null 2>&1; then\\n  echo \\"⚠️  CocoaPods out of sync. Running pod install...\\"\\n  \\n  cd \\"${PODFILE_DIR}\\"\\n  \\n  # Check if pod command exists\\n  if ! command -v pod &> /dev/null; then\\n    echo \\"❌ Error: pod command not found. Please install CocoaPods:\\"\\n    echo \\"   sudo gem install cocoapods\\"\\n    exit 1\\n  fi\\n  \\n  # Run pod install\\n  pod install\\n  \\n  if [ $? -eq 0 ]; then\\n    echo \\"✅ CocoaPods installation completed successfully\\"\\n  else\\n    echo \\"❌ Error: pod install failed\\"\\n    exit 1\\n  fi\\nelse\\n  echo \\"✅ CocoaPods already in sync\\"\\nfi\\n\\n# Output success for Xcode\\necho \\"SUCCESS\\" > \\"${SCRIPT_OUTPUT_FILE_0}\\"\\n";')
                    in_shell_script = False
                elif in_shell_script:
                    # Skip lines that are part of the old script
                    continue
                else:
                    new_lines.append(line)
            
            new_content = '\n'.join(new_lines)
            
        else:
            print("❌ Could not find the CocoaPods script to replace")
            return 1
    
    # Also update the build phase name
    new_content = new_content.replace(
        'name = "[CP] Check Pods Manifest.lock";',
        'name = "[CP] Auto-Install Pods";'
    )
    
    # Write the modified content back
    with open(project_file, 'w') as f:
        f.write(new_content)
    
    # Verify the change was made
    with open(project_file, 'r') as f:
        verify_content = f.read()
    
    if 'Auto-install CocoaPods if needed' in verify_content:
        print("")
        print("🎉 Successfully integrated pod install into build process!")
        print("======================================================")
        print("")
        print("📋 What this does:")
        print("• Automatically checks if CocoaPods are in sync before building")
        print("• Runs 'pod install' automatically if pods are missing or out of sync")
        print("• Shows progress in Xcode build log with emoji indicators")
        print("• Prevents the Phase 5.1 build errors you were experiencing")
        print("")
        print("📱 Next steps:")
        print("1. Open Resonare.xcworkspace in Xcode")
        print("2. Try Product → Archive (or any build)")
        print("3. Watch the build log - you'll see CocoaPods status messages:")
        print("   🔍 Checking CocoaPods synchronization...")
        print("   ⚠️  CocoaPods out of sync. Running pod install...")
        print("   ✅ CocoaPods installation completed successfully")
        print("4. The build should now succeed without manual intervention!")
        print("")
        print("🔍 To verify the change worked:")
        print(f"grep -A 3 'Auto-install CocoaPods' {project_file}")
        print("")
        print("🔄 To revert if needed:")
        print(f"cp {backup_file} {project_file}")
        return 0
    else:
        print("❌ Verification failed - the change was not applied correctly")
        print(f"Restoring from backup: {backup_file}")
        shutil.copy2(backup_file, project_file)
        return 1

if __name__ == "__main__":
    exit(main())