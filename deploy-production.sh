#!/bin/bash

# Production deployment script
# This script copies all necessary files to dist folder recursively

echo "🚀 Production Deployment - Copying all files to dist..."
echo ""

# Create all necessary directories
echo "📁 Creating directory structure..."
mkdir -p dist/config
mkdir -p dist/assets
mkdir -p dist/assets/fonts
mkdir -p assets
mkdir -p assets/fonts

# Copy config files recursively
echo "📋 Copying config files..."
if [ -d "src/config" ]; then
    cp -rv src/config/* dist/config/ 2>/dev/null || true
    echo "  ✓ Config files copied"
else
    echo "  ⚠ src/config not found"
fi

# Copy src/assets recursively (fonts and templates)
echo "🎨 Copying src/assets..."
if [ -d "src/assets" ]; then
    cp -rv src/assets/* dist/assets/ 2>/dev/null || true
    echo "  ✓ src/assets copied"
else
    echo "  ⚠ src/assets not found"
fi

# Copy root assets recursively (templates)
echo "🖼️  Copying root assets to dist/assets..."
if [ -d "assets" ]; then
    # Copy all files and subdirectories from assets to dist/assets
    find assets -type f -exec sh -c 'mkdir -p "dist/$(dirname "{}")" && cp -v "{}" "dist/{}"' \;
    echo "  ✓ Root assets copied to dist/assets"
fi

# Also copy to root assets folder (for runtime access)
echo "📦 Copying templates to root assets folder..."
if [ -d "dist/assets" ]; then
    # Copy template images
    cp -v dist/assets/*.png assets/ 2>/dev/null || true
    cp -v dist/assets/*.jpg assets/ 2>/dev/null || true
    cp -v dist/assets/*.JPG assets/ 2>/dev/null || true
    
    # Copy fonts
    if [ -d "dist/assets/fonts" ]; then
        cp -rv dist/assets/fonts/* assets/fonts/ 2>/dev/null || true
    fi
    echo "  ✓ Templates copied to root assets"
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Show what was copied
echo ""
echo "Config files in dist/config:"
ls -lh dist/config/ 2>/dev/null | tail -n +2 || echo "  (empty)"

echo ""
echo "Assets in dist/assets:"
ls -lh dist/assets/ 2>/dev/null | grep -E '\.(png|jpg|JPG)$' || echo "  (no images)"

echo ""
echo "Fonts in dist/assets/fonts:"
ls -lh dist/assets/fonts/ 2>/dev/null | tail -n +2 || echo "  (empty)"

echo ""
echo "Root assets folder:"
ls -lh assets/ 2>/dev/null | grep -E '\.(png|jpg|JPG)$' || echo "  (no images)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 Next steps:"
echo "   pm2 restart telegram-bot"
echo ""
