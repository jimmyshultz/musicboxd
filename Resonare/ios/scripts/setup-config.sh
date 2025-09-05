#!/bin/bash

# This script sets up react-native-config for iOS builds
# It copies the .env file from the project root to a location where Xcode can access it

PROJECT_ROOT="$PROJECT_DIR/.."
ENV_FILE="$PROJECT_ROOT/.env"

if [ -f "$ENV_FILE" ]; then
    echo "Found .env file, copying to iOS build..."
    cp "$ENV_FILE" "$SRCROOT/../.env"
else
    echo "Warning: .env file not found at $ENV_FILE"
fi