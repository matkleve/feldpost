#!/usr/bin/env node
/**
 * After features/upload subfolder move: deepen broken relative imports to core/, map/, shared/.
 * Run from repository root: node scripts/fix-upload-feature-parent-imports.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UPLOAD_FEATURE_ROOT = path.join(REPO_ROOT, 'apps/web/src/app/features/upload');
const APP_ROOT = path.join(REPO_ROOT, 'apps/web/src/app');

function listTsFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listTsFiles(full));
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

function stripExt(p) {
  return p.replace(/\.ts$/, '');
}

function resolveImport(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null;
  const abs = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [abs, `${abs}.ts`, path.join(abs, 'index.ts')];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function uploadFeatureDepth(file) {
  const rel = path.relative(UPLOAD_FEATURE_ROOT, file);
  if (rel.startsWith('..')) return 0;
  const parts = rel.split(path.sep);
  if (parts.length <= 1) return 0;
  return parts.length - 1;
}

function deepenSpecifier(specifier, extraLevels) {
  const tail = specifier.replace(/^(\.\.\/)+/, '').replace(/^\.\//, '');
  return `${'../'.repeat(extraLevels)}${tail}`;
}

function isOutsideUploadFeature(resolved) {
  return !resolved.startsWith(UPLOAD_FEATURE_ROOT + path.sep);
}

function fixFile(file) {
  const depth = uploadFeatureDepth(file);
  if (depth === 0) return false;

  const importRe = /(from\s+['"])([^'"]+)(['"])/g;
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  content = content.replace(importRe, (match, q1, imp, q3) => {
    if (!imp.startsWith('.')) return match;
    if (resolveImport(file, imp)) return match;

    for (let extra = 1; extra <= depth + 2; extra++) {
      const candidate = deepenSpecifier(imp, extra);
      const resolved = resolveImport(file, candidate);
      if (!resolved) continue;
      if (!isOutsideUploadFeature(resolved)) continue;
      changed = true;
      return `${q1}${stripExt(candidate)}${q3}`;
    }

    return match;
  });

  if (changed) fs.writeFileSync(file, content);
  return changed;
}

function resolveScssImport(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null;
  const abs = path.resolve(path.dirname(fromFile), specifier);
  const base = path.basename(abs);
  const dir = path.dirname(abs);
  const candidates = [
    abs,
    `${abs}.scss`,
    `${abs}.css`,
    path.join(dir, `_${base}.scss`),
    path.join(dir, `_${base}`),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function fixScssFile(file) {
  const depth = uploadFeatureDepth(file);
  if (depth === 0) return false;

  const useRe = /(@use\s+['"])([^'"]+)(['"])/g;
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  content = content.replace(useRe, (match, q1, imp, q3) => {
    if (!imp.startsWith('.')) return match;
    if (resolveScssImport(file, imp)) return match;

    const tail = imp.replace(/^(\.\.\/)+/, '').replace(/^\.\//, '');
    const prefixCount = (imp.match(/^\.\.(\/|$)/) ? (imp.match(/\.\.\//g) || []).length : 0);
    for (let extra = 1; extra <= depth + 3; extra++) {
      const candidate =
        prefixCount > 0
          ? `${'../'.repeat(prefixCount + extra)}${tail}`
          : deepenSpecifier(imp, extra);
      if (!resolveScssImport(file, candidate)) continue;
      changed = true;
      return `${q1}${candidate}${q3}`;
    }
    return match;
  });

  if (changed) fs.writeFileSync(file, content);
  return changed;
}

function listScssFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listScssFiles(full));
    else if (entry.name.endsWith('.scss')) out.push(full);
  }
  return out;
}

function main() {
  const files = listTsFiles(UPLOAD_FEATURE_ROOT);
  let total = 0;
  let pass = 0;
  let round = 0;
  do {
    pass++;
    round = 0;
    for (const file of files) {
      if (fixFile(file)) round++;
    }
    total += round;
    console.log(`TS pass ${pass}: fixed ${round} files.`);
  } while (pass < 5 && round > 0);

  let scssFixed = 0;
  for (const file of listScssFiles(UPLOAD_FEATURE_ROOT)) {
    if (fixScssFile(file)) scssFixed++;
  }
  if (scssFixed > 0) console.log(`SCSS: fixed ${scssFixed} files.`);

  console.log(`Done. Fixed parent imports in ${total} TS file passes.`);
}

main();
