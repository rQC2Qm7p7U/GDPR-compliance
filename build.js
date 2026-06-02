const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Building GDPR/CCPA Consent Auditor Extension...');

const distDir = path.join(__dirname, 'dist');
const zipName = 'gdpr-ccpa-consent-auditor.zip';
const zipPath = path.join(__dirname, zipName);

// 1. Clean up old build outputs
if (fs.existsSync(distDir)) {
  try {
    fs.rmSync(distDir, { recursive: true, force: true });
    console.log('Cleaned old dist/ directory.');
  } catch (err) {
    console.warn('Warning: Could not remove old dist/ directory:', err.message);
  }
}

if (fs.existsSync(zipPath)) {
  try {
    fs.unlinkSync(zipPath);
    console.log('Cleaned old zip archive.');
  } catch (err) {
    console.warn('Warning: Could not remove old zip:', err.message);
  }
}

// 2. Create fresh dist/ folder structure
try {
  fs.mkdirSync(distDir, { recursive: true });
  fs.mkdirSync(path.join(distDir, 'popup'), { recursive: true });
  fs.mkdirSync(path.join(distDir, 'icons'), { recursive: true });
  console.log('Created fresh dist/ structure.');
} catch (err) {
  console.error('❌ Failed to create dist directory:', err.message);
  process.exit(1);
}

// 3. Files to copy
const filesToCopy = [
  'manifest.json',
  'background.js',
  'bg-geo.js',
  'bg-trackers.js',
  'bg-state.js',
  'bg-cookie-audit.js',
  'bg-policy-scanner.js',
  'content.js',
  'content-constants.js',
  'content-dom-utils.js',
  'content-policy-scanner.js',
  'content-form-scanner.js',
  'content-cmp-scanner.js',
  'storage-helper.js',
  'main-world-injector.js',
  'rules-updater.js',
  'trackers.json',
  'popup/popup.html',
  'popup/popup.css',
  'popup/popup.js',
  'popup/checklist-data.js',
  'popup/report-generator.js',
  'icons/icon16.png',
  'icons/icon32.png',
  'icons/icon48.png',
  'icons/icon128.png'
];

// 4. Copy files to dist/
console.log('Copying assets to dist/...');
try {
  filesToCopy.forEach(file => {
    const src = path.join(__dirname, file);
    const dest = path.join(distDir, file);
    fs.copyFileSync(src, dest);
  });
  console.log('Assets successfully copied.');
} catch (err) {
  console.error('❌ Copy failed:', err.message);
  process.exit(1);
}

// 5. Package dist/ contents into zip for release/submission
try {
  console.log('Packaging dist/ contents into zip archive...');
  if (process.platform === 'win32') {
    // Windows PowerShell compression command (compressing folder contents directly)
    execSync(`powershell -Command "Compress-Archive -Path '${distDir}\\*' -DestinationPath '${zipName}' -Force"`);
  } else {
    // macOS / Linux standard zip command (zip contents inside dist/)
    execSync(`cd dist && zip -r "../${zipName}" ./*`);
  }
  console.log(`🎉 Success! Extension packaged into: ${zipName}`);
} catch (error) {
  console.warn('⚠️ Warning: Zip packaging failed, but dist/ folder is ready. Error:', error.message);
}

console.log('\n🌟 Build Complete! You can now load the "dist/" folder into Chrome as an unpacked extension.');
