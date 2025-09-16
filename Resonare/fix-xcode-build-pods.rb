#!/usr/bin/env ruby

# Fix Xcode Build CocoaPods Integration
# This script modifies the Xcode project to automatically run pod install during builds

require 'xcodeproj'

# Path to the Xcode project
project_path = File.join(__dir__, 'ios', 'Resonare.xcodeproj')

begin
  # Open the Xcode project
  project = Xcodeproj::Project.open(project_path)
  
  # Find the main target
  target = project.targets.find { |t| t.name == 'Resonare' }
  
  if target.nil?
    puts "❌ Error: Could not find Resonare target"
    exit 1
  end
  
  puts "🔧 Modifying Xcode project to auto-run pod install..."
  
  # Find the existing CocoaPods check phase
  pods_check_phase = target.build_phases.find do |phase|
    phase.is_a?(Xcodeproj::Project::Object::PBXShellScriptBuildPhase) &&
    phase.shell_script.include?("The sandbox is not in sync with the Podfile.lock")
  end
  
  if pods_check_phase
    puts "✅ Found existing CocoaPods check phase"
    
    # Replace the script with one that auto-installs pods
    new_script = <<~SCRIPT
      # Auto-install CocoaPods if needed
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
        pod install --verbose
        
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
      echo "SUCCESS" > "${SCRIPT_OUTPUT_FILE_0}"
    SCRIPT
    
    pods_check_phase.shell_script = new_script
    pods_check_phase.name = "[CP] Auto-Install Pods"
    
    puts "✅ Modified existing CocoaPods phase to auto-install"
  else
    # Create a new build phase if one doesn't exist
    puts "⚠️  No existing CocoaPods check phase found. Creating new one..."
    
    new_phase = target.new_shell_script_build_phase("[CP] Auto-Install Pods")
    new_phase.shell_script = <<~SCRIPT
      # Auto-install CocoaPods if needed
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
        pod install --verbose
        
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
      echo "SUCCESS" > "${SCRIPT_OUTPUT_FILE_0}"
    SCRIPT
    
    # Move the phase to be first (before other build phases)
    target.build_phases.move(new_phase, 0)
    
    puts "✅ Created new auto-install CocoaPods phase"
  end
  
  # Save the project
  project.save
  
  puts "🎉 Successfully modified Xcode project!"
  puts ""
  puts "📋 Next steps:"
  puts "1. Open Resonare.xcworkspace in Xcode"
  puts "2. Try building/archiving - pods will be installed automatically"
  puts "3. The build phase will show progress in Xcode's build log"
  puts ""
  puts "✅ Your Phase 5.1 build errors should now be resolved!"
  
rescue => e
  puts "❌ Error modifying Xcode project: #{e.message}"
  puts "Please ensure you have the xcodeproj gem installed:"
  puts "   gem install xcodeproj"
  exit 1
end