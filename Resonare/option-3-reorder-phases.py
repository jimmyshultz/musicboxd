#!/usr/bin/env python3

"""
Option 3: Reorder build phases - Move CocoaPods check AFTER enhanced Production Environment
This is the cleanest approach that keeps both phases functional
"""

import os
import shutil
import re

def main():
    print("🔧 Option 3: Reordering build phases for optimal CocoaPods handling...")
    print("=====================================================================")
    
    project_file = "ios/Resonare.xcodeproj/project.pbxproj"
    
    if not os.path.exists(project_file):
        print(f"❌ Error: Could not find {project_file}")
        return 1
    
    # Create backup
    backup_file = project_file + ".option3.backup"
    shutil.copy2(project_file, backup_file)
    print(f"💾 Created backup: {backup_file}")
    
    # Read the project file
    with open(project_file, 'r') as f:
        content = f.read()
    
    print("🔄 Step 1: Enhancing Production Environment script with CocoaPods...")
    
    # Enhanced Production Environment script that handles CocoaPods
    enhanced_script = '''# Enhanced Set Production Environment Script
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

echo "🎉 Enhanced build phase completed successfully"'''
    
    # Escape the script for the project file
    escaped_script = enhanced_script.replace('"', '\\"').replace('\n', '\\n')
    
    # Find and replace the existing production environment script
    old_prod_pattern = r'shellScript = "# Set up environment file for React Native Config.*?fi\\n";'
    new_prod_script = f'shellScript = "{escaped_script}";'
    
    new_content = re.sub(old_prod_pattern, new_prod_script, content, flags=re.DOTALL)
    
    if 'Enhanced Set Production Environment Script' in new_content:
        print("✅ Successfully enhanced Production Environment script")
    else:
        print("⚠️  Could not find Production Environment script to enhance")
        return 1
    
    print("🔄 Step 2: Analyzing build phase order...")
    
    # Now we need to find the build phases and their order
    # Look for the target's buildPhases array
    target_pattern = r'(13B07F8C1A680F5B00A75B9A.*?buildPhases = \()(.*?)(\);)'
    target_match = re.search(target_pattern, new_content, re.DOTALL)
    
    if not target_match:
        print("❌ Could not find target buildPhases array")
        return 1
    
    build_phases_content = target_match.group(2)
    print("✅ Found buildPhases array")
    
    # Extract individual phase references
    phase_refs = re.findall(r'([A-F0-9]{24}) /\* (.+?) \*/', build_phases_content)
    
    print("📋 Current build phase order:")
    for i, (phase_id, phase_name) in enumerate(phase_refs, 1):
        print(f"  {i}. {phase_name} ({phase_id})")
    
    # Find the CocoaPods check phase and Production Environment phase
    cocoapods_phase = None
    prod_env_phase = None
    
    for phase_id, phase_name in phase_refs:
        if 'Check Pods Manifest.lock' in phase_name or 'Auto-Install Pods' in phase_name:
            cocoapods_phase = (phase_id, phase_name)
        elif 'Set Production Environment' in phase_name:
            prod_env_phase = (phase_id, phase_name)
    
    if not cocoapods_phase:
        print("❌ Could not find CocoaPods phase")
        return 1
        
    if not prod_env_phase:
        print("❌ Could not find Production Environment phase")
        return 1
    
    print(f"🔍 Found CocoaPods phase: {cocoapods_phase[1]}")
    print(f"🔍 Found Production Environment phase: {prod_env_phase[1]}")
    
    # Create new phase order with CocoaPods check AFTER Production Environment
    new_phase_refs = []
    for phase_id, phase_name in phase_refs:
        if phase_id == cocoapods_phase[0]:
            # Skip CocoaPods phase for now
            continue
        elif phase_id == prod_env_phase[0]:
            # Add Production Environment phase, then CocoaPods phase
            new_phase_refs.append((phase_id, phase_name))
            new_phase_refs.append(cocoapods_phase)
        else:
            new_phase_refs.append((phase_id, phase_name))
    
    # If CocoaPods phase wasn't added yet, add it at the end
    if cocoapods_phase not in new_phase_refs:
        new_phase_refs.append(cocoapods_phase)
    
    print("")
    print("🔄 Step 3: Reordering build phases...")
    print("📋 New build phase order:")
    for i, (phase_id, phase_name) in enumerate(new_phase_refs, 1):
        print(f"  {i}. {phase_name} ({phase_id})")
    
    # Reconstruct the buildPhases array
    new_build_phases = []
    for phase_id, phase_name in new_phase_refs:
        new_build_phases.append(f"\t\t\t\t{phase_id} /* {phase_name} */,")
    
    new_build_phases_content = '\n'.join(new_build_phases)
    
    # Replace the buildPhases array in the content
    new_content = re.sub(
        target_pattern,
        f"\\g<1>\n{new_build_phases_content}\n\t\t\t\\g<3>",
        new_content,
        flags=re.DOTALL
    )
    
    # Also revert the CocoaPods phase back to its original check (since we're handling installation in Production Environment)
    if 'Auto-install CocoaPods if needed' in new_content:
        print("🔄 Step 4: Reverting CocoaPods phase to original check behavior...")
        
        # Revert to original CocoaPods check script
        original_cocoapods_script = 'shellScript = "diff \\"${PODS_PODFILE_DIR_PATH}/Podfile.lock\\" \\"${PODS_ROOT}/Manifest.lock\\" > /dev/null\\nif [ $? != 0 ] ; then\\n    # print error to STDERR\\n    echo \\"error: The sandbox is not in sync with the Podfile.lock. Run \'pod install\' or update your CocoaPods installation.\\" >&2\\n    exit 1\\nfi\\n# This output is used by Xcode \'outputs\' to avoid re-running this script phase.\\necho \\"SUCCESS\\" > \\"${SCRIPT_OUTPUT_FILE_0}\\"\\n";'
        
        new_content = re.sub(
            r'shellScript = "# Auto-install CocoaPods if needed.*?SUCCESS\\" > \\".*?SCRIPT_OUTPUT_FILE_0.*?\\n";',
            original_cocoapods_script,
            new_content,
            flags=re.DOTALL
        )
        
        # Also revert the phase name
        new_content = new_content.replace(
            'name = "[CP] Auto-Install Pods";',
            'name = "[CP] Check Pods Manifest.lock";'
        )
        
        print("✅ Reverted CocoaPods phase to original check behavior")
    
    # Write the modified content back
    with open(project_file, 'w') as f:
        f.write(new_content)
    
    print("")
    print("🎉 Option 3 implementation completed!")
    print("===================================")
    print("")
    print("📋 What was changed:")
    print("• Production Environment script → Enhanced with CocoaPods installation")
    print("• Build phase order → CocoaPods check now runs AFTER Production Environment")
    print("• CocoaPods check → Reverted to original behavior (check only)")
    print("")
    print("🔄 How it works now:")
    print("1. Production Environment phase installs pods if needed")
    print("2. CocoaPods check phase verifies everything is in sync")
    print("3. If pods were installed correctly, check passes ✅")
    print("4. Build continues successfully!")
    print("")
    print("🔄 To revert:")
    print(f"cp {backup_file} {project_file}")
    
    return 0

if __name__ == "__main__":
    exit(main())