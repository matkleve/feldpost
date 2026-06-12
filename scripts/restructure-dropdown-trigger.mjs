#!/usr/bin/env node
/**
 * Move shared/dropdown-trigger files into domain subfolders and rewrite imports.
 * Run from repository root:
 *   node scripts/restructure-dropdown-trigger.mjs --dry-run --batch=shell
 *   node scripts/restructure-dropdown-trigger.mjs --batch=shell
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DROPDOWN_ROOT = path.join(REPO_ROOT, 'apps/web/src/app/shared/dropdown-trigger');
const WEB_SRC = path.join(REPO_ROOT, 'apps/web/src');
const SUBFOLDERS = ['geometry', 'scss', 'helpers', 'shell', 'standard', 'filter', 'grouping', 'sort', 'toolbar'];

const ROOT_KEEP = new Set(['README.md']);

const BATCHES = {
  geometry: 'geometry',
  scss: 'scss',
  helpers: 'helpers',
  shell: 'shell',
  standard: 'standard',
  filter: 'filter',
  grouping: 'grouping',
  sort: 'sort',
  toolbar: 'toolbar',
};

/** @type {Map<string, string>} basename -> path relative to DROPDOWN_ROOT */
const dropdownFileByBasename = new Map();

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
      'Usage: node scripts/restructure-dropdown-trigger.mjs [--dry-run] --batch=geometry|scss|helpers|shell|standard|filter|grouping|sort|toolbar',
    );
    process.exit(1);
  }
  return { dryRun, batch, subfolder: BATCHES[batch] };
}

function categorize(filename) {
  if (ROOT_KEEP.has(filename)) return '';

  if (
    filename.startsWith('dropdown-anchor-placement') ||
    filename.startsWith('dropdown-viewport-clamp')
  ) {
    return 'geometry';
  }

  if (filename.startsWith('_dropdown-panel-flex-chain') || filename.startsWith('_toolbar-')) {
    return 'scss';
  }

  if (filename.startsWith('dropdown-search-filter.helpers')) {
    return 'helpers';
  }

  if (
    filename.startsWith('dropdown-shell') ||
    filename === 'dropdown-search-action-anchor.directive.ts'
  ) {
    return 'shell';
  }

  if (filename.startsWith('standard-dropdown')) {
    return 'standard';
  }

  if (
    filename.startsWith('filter-dropdown') ||
    filename === 'filter-dropdown.types.ts' ||
    filename === 'filter-dropdown-operator-labels.ts' ||
    filename === 'filter-dropdown-picker-geometry.ts'
  ) {
    return 'filter';
  }

  if (filename.startsWith('grouping-dropdown')) {
    return 'grouping';
  }

  if (filename.startsWith('sort-dropdown')) {
    return 'sort';
  }

  if (filename.startsWith('toolbar-dropdown-stack') || filename.startsWith('toolbar-menu-panel-layout')) {
    return 'toolbar';
  }

  return null;
}

function listRootFiles() {
  return fs
    .readdirSync(DROPDOWN_ROOT, { withFileTypes: true })
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

function rebuildMapFromDisk() {
  dropdownFileByBasename.clear();

  function walk(relDir) {
    const abs = path.join(DROPDOWN_ROOT, relDir);
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (relDir === '' && !SUBFOLDERS.includes(entry.name)) continue;
        walk(rel);
      } else if (entry.name.endsWith('.ts')) {
        const base = basenameNoExt(entry.name);
        if (dropdownFileByBasename.has(base)) {
          throw new Error(`Duplicate dropdown-trigger basename: ${base}`);
        }
        dropdownFileByBasename.set(base, rel);
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
    const oldAbs = path.join(DROPDOWN_ROOT, name);
    const newAbs = path.join(DROPDOWN_ROOT, target);
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

function computeImportPath(fromFile, dropdownRelPath) {
  const toAbs = path.join(DROPDOWN_ROOT, dropdownRelPath);
  let rel = path.relative(path.dirname(fromFile), toAbs).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return stripExt(rel);
}

function resolveDropdownBasename(importPath, fromFile) {
  const normalized = importPath.replace(/\\/g, '/');

  const featureIdx = normalized.indexOf('shared/dropdown-trigger/');
  if (featureIdx !== -1) {
    const tail = normalized.slice(featureIdx + 'shared/dropdown-trigger/'.length);
    if (!tail || tail.includes('/..')) return null;
    return basenameNoExt(tail);
  }

  if (!normalized.startsWith('./') && !normalized.startsWith('../')) return null;

  const base = basenameNoExt(normalized);
  if (!dropdownFileByBasename.has(base)) return null;
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
      const base = resolveDropdownBasename(imp, file);
      if (!base || !dropdownFileByBasename.has(base)) return match;

      const newRel = dropdownFileByBasename.get(base);
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

const SCSS_PARTIAL_REWRITES = [
  ['shared/dropdown-trigger/dropdown-panel-flex-chain', 'shared/dropdown-trigger/scss/dropdown-panel-flex-chain'],
  ['shared/dropdown-trigger/toolbar-menu-trigger', 'shared/dropdown-trigger/scss/toolbar-menu-trigger'],
  ['shared/dropdown-trigger/toolbar-breakpoints', 'shared/dropdown-trigger/scss/toolbar-breakpoints'],
  ['shared/dropdown-trigger/toolbar-dropdown-list-scroll', 'shared/dropdown-trigger/scss/toolbar-dropdown-list-scroll'],
  ['dropdown-trigger/dropdown-panel-flex-chain', 'dropdown-trigger/scss/dropdown-panel-flex-chain'],
  ['dropdown-trigger/toolbar-menu-trigger', 'dropdown-trigger/scss/toolbar-menu-trigger'],
  ['dropdown-trigger/toolbar-breakpoints', 'dropdown-trigger/scss/toolbar-breakpoints'],
  ['dropdown-trigger/toolbar-dropdown-list-scroll', 'dropdown-trigger/scss/toolbar-dropdown-list-scroll'],
];

function rewriteScssUses(dryRun) {
  const scssFiles = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'archive') continue;
        walk(full);
      } else if (entry.name.endsWith('.scss')) {
        scssFiles.push(full);
      }
    }
  }
  walk(WEB_SRC);

  let changedFiles = 0;
  for (const file of scssFiles) {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    for (const [from, to] of SCSS_PARTIAL_REWRITES) {
      if (content.includes(from)) {
        content = content.replaceAll(from, to);
        changed = true;
      }
    }

    content = content.replace(
      /@use\s+['"](\.\.?\/[^'"]*dropdown-trigger)\/dropdown-panel-flex-chain['"]/g,
      (match, prefix) => {
        if (match.includes('/scss/')) return match;
        changed = true;
        return `@use '${prefix}/scss/dropdown-panel-flex-chain'`;
      },
    );
    content = content.replace(
      /@use\s+['"](\.\.?\/[^'"]*dropdown-trigger)\/toolbar-dropdown-list-scroll['"]/g,
      (match, prefix) => {
        if (match.includes('/scss/')) return match;
        changed = true;
        return `@use '${prefix}/scss/toolbar-dropdown-list-scroll'`;
      },
    );

    if (changed) {
      changedFiles++;
      if (!dryRun) fs.writeFileSync(file, content);
    }
  }

  console.log(`${dryRun ? 'Would update' : 'Updated'} SCSS @use in ${changedFiles} files.`);
}

function main() {
  const { dryRun, batch, subfolder } = parseArgs();

  if (dryRun) {
    moveFiles(subfolder, true);
    rebuildMapFromDisk();
    for (const name of listRootFiles()) {
      const cat = categorize(name);
      if (cat === subfolder) {
        dropdownFileByBasename.set(basenameNoExt(name), `${subfolder}/${name}`);
      }
    }
    rewriteTsImports(true);
    rewriteScssUses(true);
    return;
  }

  moveFiles(subfolder, false);
  rebuildMapFromDisk();
  console.log(`Dropdown-trigger file map: ${dropdownFileByBasename.size} entries.`);
  rewriteTsImports(false);
  rewriteScssUses(false);
  console.log('Fixing parent imports...');
  execSync('node scripts/fix-dropdown-trigger-parent-imports.mjs', { cwd: REPO_ROOT, stdio: 'inherit' });
  console.log('Validating imports...');
  execSync('node scripts/validate-dropdown-trigger-imports.mjs', { cwd: REPO_ROOT, stdio: 'inherit' });
  console.log('Done.');
}

main();
