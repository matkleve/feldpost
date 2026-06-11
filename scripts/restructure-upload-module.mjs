#!/usr/bin/env node
/**
 * One-shot: move core/upload files into domain subfolders and rewrite imports.
 * Run from repository root: node scripts/restructure-upload-module.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UPLOAD_ROOT = path.join(REPO_ROOT, 'apps/web/src/app/core/upload');
const WEB_SRC = path.join(REPO_ROOT, 'apps/web/src');

const ROOT_FILES = new Set([
  'upload.service.ts',
  'upload.service.spec.ts',
  'upload.types.ts',
  'upload.helpers.ts',
  'upload-manager.service.ts',
  'upload-manager.service.spec.ts',
  'upload-manager.types.ts',
]);

function categorize(filename) {
  if (ROOT_FILES.has(filename)) return '';
  if (filename.startsWith('upload-manager-')) return 'manager';
  if (filename.startsWith('upload-location-')) return 'location';
  if (
    filename.startsWith('upload-address-') ||
    filename.startsWith('upload-tray-resolution')
  ) {
    return 'address-resolution';
  }
  if (filename.startsWith('upload-new-')) return 'pipelines/new';
  if (filename.startsWith('upload-attach-')) return 'pipelines/attach';
  if (filename.startsWith('upload-replace-')) return 'pipelines/replace';
  return 'support';
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
  return p.replace(/\.ts$/, '');
}

function basenameNoExt(p) {
  return path.basename(stripExt(p));
}

/** @type {Map<string, string>} basename -> path relative to UPLOAD_ROOT (with .ts) */
const uploadFileByBasename = new Map();

function registerUploadFile(relPath) {
  const base = basenameNoExt(relPath);
  if (uploadFileByBasename.has(base)) {
    throw new Error(`Duplicate upload basename: ${base}`);
  }
  uploadFileByBasename.set(base, relPath);
}

function buildTargetMap() {
  for (const name of fs.readdirSync(UPLOAD_ROOT)) {
    if (!name.endsWith('.ts')) continue;
    const sub = categorize(name);
    registerUploadFile(sub ? `${sub}/${name}` : name);
  }
  const adaptersDir = path.join(UPLOAD_ROOT, 'adapters');
  if (fs.existsSync(adaptersDir)) {
    for (const name of fs.readdirSync(adaptersDir)) {
      if (!name.endsWith('.ts')) continue;
      registerUploadFile(`adapters/${name}`);
    }
  }
}

function moveFiles() {
  for (const name of fs.readdirSync(UPLOAD_ROOT)) {
    if (!name.endsWith('.ts')) continue;
    const target = uploadFileByBasename.get(basenameNoExt(name));
    if (target === name) continue;
    const oldAbs = path.join(UPLOAD_ROOT, name);
    const newAbs = path.join(UPLOAD_ROOT, target);
    fs.mkdirSync(path.dirname(newAbs), { recursive: true });
    execSync(`git mv "${oldAbs}" "${newAbs}"`, { cwd: REPO_ROOT, stdio: 'inherit' });
  }
}

function computeImportPath(fromFile, uploadRelPath) {
  const toAbs = path.join(UPLOAD_ROOT, uploadRelPath);
  let rel = path.relative(path.dirname(fromFile), toAbs).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return stripExt(rel);
}

function resolveUploadBasename(importPath) {
  const normalized = importPath.replace(/\\/g, '/');
  const uploadIdx = normalized.lastIndexOf('/upload/');
  if (uploadIdx !== -1) {
    const tail = normalized.slice(uploadIdx + '/upload/'.length);
    if (!tail || tail.includes('/..')) return null;
    return basenameNoExt(tail);
  }
  if (normalized.startsWith('./') || normalized.startsWith('../')) {
    return basenameNoExt(normalized);
  }
  if (normalized.startsWith('upload-') || normalized.startsWith('content-hash')) {
    return basenameNoExt(normalized);
  }
  return null;
}

function rewriteImports() {
  const importRe =
    /(from\s+['"])([^'"]+)(['"])|((?:import|export)\s*\(\s*['"])([^'"]+)(['"]\s*\))/g;
  const files = listTsFiles(WEB_SRC);
  let changedFiles = 0;

  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    content = content.replace(importRe, (match, q1, p1, q1e, q2, p2, q2e) => {
      const imp = p1 ?? p2;
      const base = resolveUploadBasename(imp);
      if (!base || !uploadFileByBasename.has(base)) return match;

      const newUploadRel = uploadFileByBasename.get(base);
      const newImp = computeImportPath(file, newUploadRel);
      if (newImp === imp) return match;

      changed = true;
      if (p1 != null) return `${q1}${newImp}${q1e}`;
      return `${q2}${newImp}${q2e}`;
    });

    if (changed) {
      fs.writeFileSync(file, content);
      changedFiles++;
    }
  }

  console.log(`Updated imports in ${changedFiles} files.`);
}

function main() {
  buildTargetMap();
  console.log(`Target layout: ${uploadFileByBasename.size} upload module files.`);
  moveFiles();
  rewriteImports();
  console.log('Rewriting core/* parent imports...');
  execSync('node scripts/fix-upload-parent-imports.mjs', { cwd: REPO_ROOT, stdio: 'inherit' });
  console.log('Done.');
}

main();
