#!/usr/bin/env node
/**
 * Move features/upload files into domain subfolders and rewrite imports.
 * Run from repository root:
 *   node scripts/restructure-upload-feature.mjs --dry-run --batch=panel
 *   node scripts/restructure-upload-feature.mjs --batch=panel
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UPLOAD_FEATURE_ROOT = path.join(REPO_ROOT, 'apps/web/src/app/features/upload');
const WEB_SRC = path.join(REPO_ROOT, 'apps/web/src');
const CORE_UPLOAD_ROOT = path.join(REPO_ROOT, 'apps/web/src/app/core/upload');
const SUBFOLDERS = ['upload-panel', 'upload-resolver-tray', 'upload-shell'];

const ROOT_KEEP = new Set([
  'README.md',
  'upload-phase.helpers.ts',
  'upload-phase.helpers.spec.ts',
  'upload-dev-flags.ts',
]);

const BATCHES = {
  panel: 'upload-panel',
  tray: 'upload-resolver-tray',
  shell: 'upload-shell',
};

/** @type {Map<string, string>} basename -> path relative to UPLOAD_FEATURE_ROOT */
const uploadFileByBasename = new Map();

function parseArgs() {
  const args = process.argv.slice(2);
  let dryRun = false;
  let batch = null;
  for (const arg of args) {
    if (arg === '--dry-run') dryRun = true;
    else if (arg.startsWith('--batch=')) batch = arg.slice('--batch='.length);
  }
  if (!batch || !BATCHES[batch]) {
    console.error('Usage: node scripts/restructure-upload-feature.mjs [--dry-run] --batch=panel|tray|shell');
    process.exit(1);
  }
  return { dryRun, batch, subfolder: BATCHES[batch] };
}

function categorize(filename) {
  if (ROOT_KEEP.has(filename)) return '';
  if (filename.startsWith('upload-shell')) return 'upload-shell';
  if (filename.startsWith('upload-panel')) return 'upload-panel';
  if (filename.startsWith('upload-resolver-tray')) return 'upload-resolver-tray';
  return null;
}

function listRootFiles() {
  return fs.readdirSync(UPLOAD_FEATURE_ROOT, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name);
}

function listTsFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      out.push(...listTsFiles(full));
    } else if (entry.name.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

function stripExt(p) {
  return p.replace(/\.(ts|html|scss)$/, '');
}

function basenameNoExt(p) {
  return path.basename(stripExt(p));
}

function registerUploadFile(relPath) {
  if (!relPath.endsWith('.ts')) return;
  const base = basenameNoExt(relPath);
  if (uploadFileByBasename.has(base)) {
    throw new Error(`Duplicate upload feature basename: ${base} (${relPath} vs ${uploadFileByBasename.get(base)})`);
  }
  uploadFileByBasename.set(base, relPath);
}

function rebuildMapFromDisk() {
  uploadFileByBasename.clear();

  function walk(relDir) {
    const abs = path.join(UPLOAD_FEATURE_ROOT, relDir);
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (relDir === '' && !SUBFOLDERS.includes(entry.name)) continue;
        walk(rel);
      } else if (entry.name.endsWith('.ts')) {
        registerUploadFile(rel);
      }
    }
  }

  walk('');
}

function moveFiles(batchSubfolder, dryRun) {
  const moves = [];
  for (const name of listRootFiles()) {
    const sub = categorize(name);
    if (sub !== batchSubfolder) continue;
    const target = `${sub}/${name}`;
    const oldAbs = path.join(UPLOAD_FEATURE_ROOT, name);
    const newAbs = path.join(UPLOAD_FEATURE_ROOT, target);
    if (!fs.existsSync(oldAbs)) continue;
    moves.push({ oldAbs, newAbs, name, target });
  }

  if (dryRun) {
    console.log(`Dry run — would move ${moves.length} files into ${batchSubfolder}/:`);
    for (const { name, target } of moves) {
      console.log(`  ${name} -> ${target}`);
    }
    return;
  }

  for (const { oldAbs, newAbs } of moves) {
    fs.mkdirSync(path.dirname(newAbs), { recursive: true });
    execSync(`git mv "${oldAbs}" "${newAbs}"`, { cwd: REPO_ROOT, stdio: 'inherit' });
  }
  console.log(`Moved ${moves.length} files into ${batchSubfolder}/.`);
}

function computeImportPath(fromFile, uploadRelPath) {
  const toAbs = path.join(UPLOAD_FEATURE_ROOT, uploadRelPath);
  let rel = path.relative(path.dirname(fromFile), toAbs).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return stripExt(rel);
}

function isCoreUploadImport(importPath, fromFile) {
  const normalized = importPath.replace(/\\/g, '/');
  if (normalized.includes('/core/upload/')) return true;
  if (!normalized.startsWith('.')) return false;
  const resolved = path.resolve(path.dirname(fromFile), normalized);
  return resolved.startsWith(CORE_UPLOAD_ROOT + path.sep);
}

function resolveUploadFeatureBasename(importPath, fromFile) {
  const normalized = importPath.replace(/\\/g, '/');

  if (isCoreUploadImport(normalized, fromFile)) return null;

  const featureIdx = normalized.indexOf('features/upload/');
  if (featureIdx !== -1) {
    const tail = normalized.slice(featureIdx + 'features/upload/'.length);
    if (!tail || tail.includes('/..')) return null;
    return basenameNoExt(tail);
  }

  if (!normalized.startsWith('./') && !normalized.startsWith('../')) return null;

  const base = basenameNoExt(normalized);
  if (!uploadFileByBasename.has(base)) return null;
  return base;
}

function rewriteImports(dryRun) {
  const importRe =
    /(from\s+['"])([^'"]+)(['"])|((?:import|export)\s*\(\s*['"])([^'"]+)(['"]\s*\))/g;
  const files = listTsFiles(WEB_SRC);
  let changedFiles = 0;

  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    content = content.replace(importRe, (match, q1, p1, q1e, q2, p2, q2e) => {
      const imp = p1 ?? p2;
      const base = resolveUploadFeatureBasename(imp, file);
      if (!base || !uploadFileByBasename.has(base)) return match;

      const newUploadRel = uploadFileByBasename.get(base);
      const newImp = computeImportPath(file, newUploadRel);
      if (newImp === imp) return match;

      changed = true;
      if (p1 != null) return `${q1}${newImp}${q1e}`;
      return `${q2}${newImp}${q2e}`;
    });

    if (changed) {
      changedFiles++;
      if (!dryRun) fs.writeFileSync(file, content);
    }
  }

  console.log(`${dryRun ? 'Would update' : 'Updated'} imports in ${changedFiles} files.`);
}

function main() {
  const { dryRun, batch, subfolder } = parseArgs();

  if (dryRun) {
    moveFiles(subfolder, true);
    rebuildMapFromDisk();
    for (const name of listRootFiles()) {
      const cat = categorize(name);
      if (cat === subfolder && name.endsWith('.ts')) {
        const base = basenameNoExt(name);
        uploadFileByBasename.set(base, `${subfolder}/${name}`);
      }
    }
    rewriteImports(true);
    return;
  }

  moveFiles(subfolder, false);
  rebuildMapFromDisk();
  console.log(`Upload feature file map: ${uploadFileByBasename.size} entries.`);
  rewriteImports(false);
  console.log('Fixing parent imports...');
  execSync('node scripts/fix-upload-feature-parent-imports.mjs', { cwd: REPO_ROOT, stdio: 'inherit' });
  console.log('Validating imports...');
  execSync('node scripts/validate-upload-feature-imports.mjs', { cwd: REPO_ROOT, stdio: 'inherit' });
  console.log('Done.');
}

main();
