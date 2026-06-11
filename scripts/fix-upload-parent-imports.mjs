#!/usr/bin/env node
/**
 * After upload subfolder move: deepen broken relative imports that leave core/upload.
 * Run from repository root: node scripts/fix-upload-parent-imports.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UPLOAD_ROOT = path.join(REPO_ROOT, 'apps/web/src/app/core/upload');
const CORE_ROOT = path.join(REPO_ROOT, 'apps/web/src/app/core');

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

function uploadDepth(file) {
  const rel = path.relative(UPLOAD_ROOT, file);
  return rel.split(path.sep).length - 1;
}

function deepenSpecifier(specifier, extraLevels) {
  const tail = specifier.replace(/^(\.\.\/)+/, '').replace(/^\.\//, '');
  return `${'../'.repeat(extraLevels)}${tail}`;
}

function fixFile(file) {
  const depth = uploadDepth(file);
  if (depth === 0) return false;

  const importRe = /(from\s+['"])([^'"]+)(['"])/g;
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  content = content.replace(importRe, (match, q1, imp, q3) => {
    if (!imp.startsWith('.')) return match;
    if (resolveImport(file, imp)) return match;

    for (let extra = 1; extra <= depth + 1; extra++) {
      const candidate = deepenSpecifier(imp, extra);
      const resolved = resolveImport(file, candidate);
      if (!resolved) continue;
      if (!resolved.startsWith(CORE_ROOT + path.sep)) continue;
      changed = true;
      return `${q1}${stripExt(candidate)}${q3}`;
    }

    return match;
  });

  if (changed) fs.writeFileSync(file, content);
  return changed;
}

function main() {
  const files = listTsFiles(UPLOAD_ROOT);
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
    console.log(`Pass ${pass}: fixed ${round} files.`);
  } while (pass < 5 && round > 0);

  console.log(`Done. Fixed parent imports in ${total} file passes.`);
}

main();
