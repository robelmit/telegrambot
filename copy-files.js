const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  // Create destination directory
  fs.mkdirSync(dest, { recursive: true });
  
  // Read source directory
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('📦 Copying config and assets to dist...');

// Copy config files
console.log('  → Copying src/config to dist/config');
copyDir('src/config', 'dist/config');

// Copy src/assets
console.log('  → Copying src/assets to dist/assets');
copyDir('src/assets', 'dist/assets');

// Copy root assets (merge with dist/assets)
console.log('  → Copying assets to dist/assets');
if (fs.existsSync('assets')) {
  const entries = fs.readdirSync('assets', { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join('assets', entry.name);
    const destPath = path.join('dist/assets', entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Also ensure root assets folder has all template files for production
console.log('  → Ensuring root assets folder has all templates');
fs.mkdirSync('assets', { recursive: true });
fs.mkdirSync('assets/fonts', { recursive: true });

// Copy template images to root assets
const templateFiles = ['front1.png', 'back1.png', 'front3.png', 'back3.png', 'halefront.png', 'haleback.png', 'front_template.png', 'back_template.png'];
for (const file of templateFiles) {
  const srcPath = path.join('dist/assets', file);
  const destPath = path.join('assets', file);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
  }
}

// Copy fonts to root assets/fonts
if (fs.existsSync('dist/assets/fonts')) {
  copyDir('dist/assets/fonts', 'assets/fonts');
}

console.log('✅ Files copied successfully!');
console.log('');
console.log('Config files:', fs.readdirSync('dist/config').join(', '));
console.log('Assets:', fs.readdirSync('dist/assets').filter(f => !f.startsWith('.')).slice(0, 10).join(', '), '...');
