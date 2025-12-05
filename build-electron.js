const fs = require('fs');
const path = require('path');

// Ensure dist-electron directory exists
const distDir = path.join(__dirname, 'dist-electron');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy electron files to dist-electron
const filesToCopy = [
  { src: 'electron/main.js', dest: 'dist-electron/main.js' },
  { src: 'electron/preload.js', dest: 'dist-electron/preload.js' }
];

filesToCopy.forEach(file => {
  const srcPath = path.join(__dirname, file.src);
  const destPath = path.join(__dirname, file.dest);
  
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${file.src} to ${file.dest}`);
  } else {
    console.error(`Source file not found: ${file.src}`);
  }
});

console.log('Electron files built successfully!');
