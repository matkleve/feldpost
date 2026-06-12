#!/usr/bin/env node
/**
 * add-progress-binding.cjs
 *
 * Add progress height CSS variable binding to upload-panel-item template
 * for fill-up animation (Phase 4 of upload panel rewrite).
 *
 * Execution: node scripts/add-progress-binding.cjs
 */

const fs = require('fs');
const path = require('path');

const TEMPLATE_PATH = path.join(
  __dirname,
  '../src/app/features/upload/upload-panel-item.component.html',
);

// Read file as UTF-16LE (Windows default)
let content;
try {
  content = fs.readFileSync(TEMPLATE_PATH, 'utf16le');
} catch (err) {
  console.error('❌ Could not read file:', err.message);
  process.exit(1);
}

console.log(`File read (length: ${content.length} chars), searching for thumbnail...`);

// Look for the exact pattern in the template:
// <img
//   class="upload-panel__thumbnail"
//   [src]="job().thumbnailUrl"
//   [alt]="''"
//   aria-hidden="true"
// />
const pattern =
  /<img\s+class="upload-panel__thumbnail"\s+\[src\]="job\(\)\.thumbnailUrl"\s+\[alt\]="''"\s+aria-hidden="true"\s*\/>/;

if (pattern.test(content)) {
  console.log('✓ Found thumbnail img element');

  // Add binding just before the closing />
  const updated = content.replace(
    /(<img\s+class="upload-panel__thumbnail"\s+\[src\]="job\(\)\.thumbnailUrl"\s+\[alt\]="''"\s+aria-hidden="true")\s*\/>/,
    '$1\n        [style.--progress-height]="(job().progress)%"\n      />',
  );

  try {
    fs.writeFileSync(TEMPLATE_PATH, updated, 'utf16le');
    console.log('✅ Added [style.--progress-height] binding to thumbnail img element');
    process.exit(0);
  } catch (err) {
    console.error('❌ Could not write file:', err.message);
    process.exit(1);
  }
} else {
  console.log('⚠️  Exact pattern not found. Trying flexible pattern...');

  // Flexible fallback: find [src]="job().thumbnailUrl" and add binding after it
  if (
    content.includes('[src]="job().thumbnailUrl"') &&
    content.includes('upload-panel__thumbnail')
  ) {
    const flexPattern = /(\[src\]="job\(\)\.thumbnailUrl")/;
    const updated = content.replace(
      flexPattern,
      '$1\n        [style.--progress-height]="(job().progress)%"',
    );

    fs.writeFileSync(TEMPLATE_PATH, updated, 'utf16le');
    console.log('✅ Added [style.--progress-height] binding using flexible pattern');
    process.exit(0);
  } else {
    console.log('❌ Could not find thumbnail element');
    process.exit(1);
  }
}
