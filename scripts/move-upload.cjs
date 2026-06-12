const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CORE_DIR = path.join(__dirname, '../src/app/core');
const UPLOAD_DIR = path.join(CORE_DIR, 'upload');
const APP_DIR = path.join(__dirname, '../src/app');

const filesToMove = fs.readdirSync(CORE_DIR)
  .filter(f => f.startsWith('upload') && f.endsWith('.ts') && f !== 'upload');

filesToMove.forEach(file => {
  const oldPath = path.join(CORE_DIR, file);
  const newPath = path.join(UPLOAD_DIR, file);
  fs.renameSync(oldPath, newPath);
});

// Update imports
function walkAndReplace(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'upload') walkAndReplace(fullPath);
    } else if (entry.isFile() && fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const inCoreDir = dir === CORE_DIR;
      
      for (const file of filesToMove) {
        const baseName = file.replace('.ts', '');
        
        if (inCoreDir) {
          content = content.replace(new RegExp(rom '\\./\';, 'g'), rom './upload/\';);
        } else {
          // deep path handling
          let relativeDepth = path.relative(dir, CORE_DIR).replace(/\\\\/g, '/');
          if (relativeDepth === '') relativeDepth = '.';
          content = content.replace(new RegExp(rom '\/\';, 'g'), rom '\/upload/\';);
        }
      }
      
      if (content !== fs.readFileSync(fullPath, 'utf8')) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

// Special pass for files inside core/upload
const uploadEntries = fs.readdirSync(UPLOAD_DIR);
for (const file of uploadEntries) {
  if (!file.endsWith('.ts')) continue;
  const fullPath = path.join(UPLOAD_DIR, file);
  let content = fs.readFileSync(fullPath, 'utf8');
  content = content.replace(/from '\.\/(?!upload-)/g, rom '../);
  fs.writeFileSync(fullPath, content);
}

walkAndReplace(APP_DIR);
console.log('Files moved and imports updated.');