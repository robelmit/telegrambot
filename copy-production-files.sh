#!/bin/bash

# Copy production files script
# Run this after npm run build

echo "📦 Copying config and assets to dist..."

# Create directories
mkdir -p dist/config
mkdir -p dist/assets
mkdir -p dist/assets/fonts

# Copy config files
echo "  → Copying config files..."
cp -r src/config/* dist/config/

# Copy src/assets (fonts and template images)
echo "  → Copying src/assets..."
cp -r src/assets/* dist/assets/

# Copy root assets (template images)
echo "  → Copying root assets..."
cp -r assets/* dist/assets/

# List what was copied
echo ""
echo "✅ Files copied successfully!"
echo ""
echo "Config files in dist/config:"
ls -la dist/config/
echo ""
echo "Assets in dist/assets:"
ls -la dist/assets/
echo ""
echo "Fonts in dist/assets/fonts:"
ls -la dist/assets/fonts/
