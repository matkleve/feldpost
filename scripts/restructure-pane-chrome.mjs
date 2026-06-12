#!/usr/bin/env node
/**
 * Consolidate pane layout primitives under shared/pane-chrome/.
 * Run from repository root:
 *   node scripts/restructure-pane-chrome.mjs --dry-run --batch=footer
 *   node scripts/restructure-pane-chrome.mjs --batch=footer
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PANE_CHROME_ROOT = path.join(REPO_ROOT, 'apps/web/src/app/shared/pane-chrome');
const LEGACY_FOOTER = path.join(REPO_ROOT, 'apps/web/src/app/shared/pane-footer');
const LEGACY_TOOLBAR = path.join(REPO_ROOT, 'apps/web/src/app/shared/pane-toolbar');
const LEGACY_HEADER = path.join(
  REPO_ROOT,
  'apps/web/src/app/shared/workspace-pane/chrome',
);
const WEB_SRC = path.join(REPO_ROOT, 'apps/web/src');
const SUBFOLDERS = ['footer', 'toolbar', 'header'];

const BATCHES = {
  footer: 'footer',
  toolbar: 'toolbar',
  header: 'header',
};

/** @type {Map<string, string>} basename -> path relative to PANE_CHROME_ROOT */
const paneChromeFileByBasename = new Map();

function parseArgs() {
  const args = process.argv.slice(2);
  let dryRun = false;
  let batch = null;
  for (const arg of args) {
    if (arg === '--dry-run') dryRun = true;
    else if (arg.startsWith('--batch=')) batch = arg.slice('--batch='.length);
  }
  if (!batch || !BATCHES[batch]) {
    console.error(
      'Usage: node scripts/restructure-pane-chrome.mjs [--dry-run] --batch=footer|toolbar|header',
    );
    process.exit(1);
  }
  return { dryRun, batch, subfolder: BATCHES[batch] };
}

function sourceDir(batch) {
  if (batch === 'footer') return LEGACY_FOOTER;
  if (batch === 'toolbar') return LEGACY_TOOLBAR;
  return LEGACY_HEADER;
}

function listRootFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name);
}

function listTsFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
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

function rebuildMapFromDisk() {
  paneChromeFileByBasename.clear();

  function walk(relDir) {
    const abs = path.join(PANE_CHROME_ROOT, relDir);
    if (!fs.existsSync(abs)) return;
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (relDir === '' && !SUBFOLDERS.includes(entry.name)) continue;
        walk(rel);
      } else if (entry.name.endsWith('.ts')) {
        const base = basenameNoExt(entry.name);
        if (paneChromeFileByBasename.has(base)) {
          throw new Error(`Duplicate pane-chrome basename: ${base}`);
        }
        paneChromeFileByBasename.set(base, rel);
      }
    }
  }

  walk('');
}

function moveBatch(batchSubfolder, dryRun) {
  const src = sourceDir(batchSubfolder);
  const moves = [];
  for (const name of listRootFiles(src)) {
    if (name === 'README.md') continue;
    const target = `${batchSubfolder}/${name}`;
    const oldAbs = path.join(src, name);
    const newAbs = path.join(PANE_CHROME_ROOT, target);
    moves.push({ oldAbs, newAbs, name, target });
  }

  if (dryRun) {
    console.log(`Dry run — would move ${moves.length} files into pane-chrome/${batchSubfolder}/:`);
    for (const { name, target } of moves) {
      console.log(`  ${name} -> ${target}`);
    }
    return;
  }

  fs.mkdirSync(path.join(PANE_CHROME_ROOT, batchSubfolder), { recursive: true });
  for (const { oldAbs, newAbs } of moves) {
    execSync(`git mv "${oldAbs}" "${newAbs}"`, { cwd: REPO_ROOT, stdio: 'inherit' });
  }
  console.log(`Moved ${moves.length} files into pane-chrome/${batchSubfolder}/.`);

  const readme = path.join(src, 'README.md');
  if (fs.existsSync(readme)) {
    fs.unlinkSync(readme);
    console.log(`Removed legacy README at ${path.relative(REPO_ROOT, readme)}`);
  }
}

function computeImportPath(fromFile, relPath) {
  const toAbs = path.join(PANE_CHROME_ROOT, relPath);
  let rel = path.relative(path.dirname(fromFile), toAbs).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return stripExt(rel);
}

function resolvePaneChromeBasename(importPath) {
  const normalized = importPath.replace(/\\/g, '/');

  for (const legacy of [
    'shared/pane-footer/',
    'shared/pane-toolbar/',
    'shared/workspace-pane/chrome/',
    'shared/pane-chrome/',
  ]) {
    const idx = normalized.indexOf(legacy);
    if (idx !== -1) {
      const tail = normalized.slice(idx + legacy.length);
      if (!tail || tail.includes('/..')) return null;
      return basenameNoExt(tail);
    }
  }

  if (!normalized.startsWith('./') && !normalized.startsWith('../')) return null;
  const base = basenameNoExt(normalized);
  if (!paneChromeFileByBasename.has(base)) return null;
  return base;
}

function rewriteTsImports(dryRun) {
  const importRe =
    /(from\s+['"])([^'"]+)(['"])|((?:import|export)\s*\(\s*['"])([^'"]+)(['"]\s*\))/g;
  const files = listTsFiles(WEB_SRC);
  let changedFiles = 0;

  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    content = content.replace(importRe, (match, q1, p1, q1e, q2, p2, q2e) => {
      const imp = p1 ?? p2;
      const base = resolvePaneChromeBasename(imp);
      if (!base || !paneChromeFileByBasename.has(base)) return match;

      const newRel = paneChromeFileByBasename.get(base);
      const newImp = computeImportPath(file, newRel);
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

  console.log(`${dryRun ? 'Would update' : 'Updated'} TS imports in ${changedFiles} files.`);
}

function main() {
  const { dryRun, batch, subfolder } = parseArgs();

  if (dryRun) {
    moveBatch(subfolder, true);
    return;
  }

  if (!fs.existsSync(PANE_CHROME_ROOT)) {
    fs.mkdirSync(PANE_CHROME_ROOT, { recursive: true });
  }

  moveBatch(subfolder, false);
  rebuildMapFromDisk();
  console.log(`Pane-chrome file map: ${paneChromeFileByBasename.size} entries.`);
  rewriteTsImports(false);
  console.log('Fixing parent imports...');
  execSync('node scripts/fix-pane-chrome-parent-imports.mjs', { cwd: REPO_ROOT, stdio: 'inherit' });
  console.log('Validating imports...');
  execSync('node scripts/validate-pane-chrome-imports.mjs', { cwd: REPO_ROOT, stdio: 'inherit' });
  console.log('Done.');
}

main();
