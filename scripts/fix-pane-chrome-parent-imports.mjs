#!/usr/bin/env node
/**
 * Deepen broken relative imports after pane-chrome subfolder move.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PANE_CHROME_ROOT = path.join(REPO_ROOT, 'apps/web/src/app/shared/pane-chrome');

function listTsFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
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

function paneChromeDepth(file) {
  const rel = path.relative(PANE_CHROME_ROOT, file);
  if (rel.startsWith('..')) return 0;
  const parts = rel.split(path.sep);
  if (parts.length <= 1) return 0;
  return parts.length - 1;
}

function deepenSpecifier(specifier, extraLevels) {
  const tail = specifier.replace(/^(\.\.\/)+/, '').replace(/^\.\//, '');
  return `${'../'.repeat(extraLevels)}${tail}`;
}

function isOutsidePaneChrome(resolved) {
  return !resolved.startsWith(PANE_CHROME_ROOT + path.sep);
}

function fixTsFile(file) {
  const depth = paneChromeDepth(file);
  if (depth === 0) return false;

  const importRe =
    /(from\s+['"])([^'"]+)(['"])|(import\s*\(\s*['"])([^'"]+)(['"]\s*\))/g;
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  content = content.replace(importRe, (match, q1, p1, q1e, q2, p2, q2e) => {
    const imp = p1 ?? p2;
    const qStart = q1 ?? q2;
    const qEnd = q1 != null ? q1e : q2e;
    if (!imp?.startsWith('.')) return match;
    if (resolveImport(file, imp)) return match;

    for (let extra = 1; extra <= depth + 3; extra++) {
      const candidate = deepenSpecifier(imp, extra);
      const resolved = resolveImport(file, candidate);
      if (!resolved) continue;
      if (!isOutsidePaneChrome(resolved)) continue;
      changed = true;
      return `${qStart}${stripExt(candidate)}${qEnd}`;
    }

    return match;
  });

  if (changed) fs.writeFileSync(file, content);
  return changed;
}

function main() {
  const files = listTsFiles(PANE_CHROME_ROOT);
  let pass = 0;
  let round = 0;
  let total = 0;
  do {
    pass++;
    round = 0;
    for (const file of files) {
      if (fixTsFile(file)) round++;
    }
    total += round;
    console.log(`TS pass ${pass}: fixed ${round} files.`);
  } while (pass < 5 && round > 0);

  console.log(`Done. Fixed parent imports in ${total} TS file passes.`);
}

main();
