#!/bin/bash

# Define the output zip file name
OUTPUT_FILE="../UltimateTab-Backup.zip"

echo "🧹 Cleaning up old build artifacts to keep the ZIP small..."
# Optional: remove old build directories if you want to ensure minimal size, 
# but simply excluding them in the zip command is safer.

echo "📦 Zipping project. Excluding heavy folders (node_modules, .next, src-tauri/target)..."

# Navigate to the project root directory just in case
cd "$(dirname "$0")"

# Create the zip file explicitly ignoring massive dependencies and build folders
zip -r "$OUTPUT_FILE" . \
  -x "node_modules/*" \
  -x ".next/*" \
  -x "src-tauri/target/*" \
  -x ".git/*" \
  -x "*.zip"

echo "✅ Done! Your project backup is located at: $OUTPUT_FILE"
echo "You can safely send this ZIP file to your friend or keep it as a backup."
