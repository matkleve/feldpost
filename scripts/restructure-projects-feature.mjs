#!/usr/bin/env node
/**
 * Move features/projects files into domain subfolders and rewrite imports.
 * Run from repository root:
 *   node scripts/restructure-projects-feature.mjs --dry-run --batch=logic
 *   node scripts/restructure-projects-feature.mjs --batch=logic
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECTS_ROOT = path.join(REPO_ROOT, 'apps/web/src/app/features/projects');
const WEB_SRC = path.join(REPO_ROOT, 'apps/web/src');
const CORE_PROJECTS_ROOT = path.join(REPO_ROOT, 'apps/web/src/app/core/projects');
const SUBFOLDERS = ['page', 'views', 'chrome', 'cards', 'dialogs', 'logic'];

const ROOT_KEEP = new Set(['README.md']);

const BATCHES = {
  logic: 'logic',
  dialogs: 'dialogs',
  cards: 'cards',
  chrome: 'chrome',
  views: 'views',
  page: 'page',
};

/** @type {Map<string, string>} basename -> path relative to PROJECTS_ROOT */
const projectsFileByBasename = new Map();

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
      'Usage: node scripts/restructure-projects-feature.mjs [--dry-run] --batch=logic|dialogs|cards|chrome|views|page',
    );
    process.exit(1);
  }
  return { dryRun, batch, subfolder: BATCHES[batch] };
}

function categorize(filename) {
  if (ROOT_KEEP.has(filename)) return '';

  if (
    filename === 'projects-fields.logic.ts' ||
    filename === 'projects-filter.logic.ts' ||
    filename === 'projects-sort.logic.ts' ||
    filename === 'projects-grouping.logic.ts' ||
    filename === 'projects-formatters.logic.ts'
  ) {
    return 'logic';
  }

  if (filename.startsWith('projects-confirm-dialog')) return 'dialogs';

  if (
    filename.startsWith('project-card') ||
    filename.startsWith('project-color-picker') ||
    filename === 'project-location-picker.component.ts'
  ) {
    return 'cards';
  }

  if (filename.startsWith('projects-page-header') || filename.startsWith('projects-toolbar')) {
    return 'chrome';
  }

  if (filename.startsWith('projects-grid-view') || filename.startsWith('projects-table-view')) {
    return 'views';
  }

  if (filename.startsWith('projects-page')) return 'page';

  return null;
}

function listRootFiles() {
  return fs
    .readdirSync(PROJECTS_ROOT, { withFileTypes: true })
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
  projectsFileByBasename.clear();

  function walk(relDir) {
    const abs = path.join(PROJECTS_ROOT, relDir);
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (relDir === '' && !SUBFOLDERS.includes(entry.name)) continue;
        walk(rel);
      } else if (entry.name.endsWith('.ts')) {
        const base = basenameNoExt(entry.name);
        if (projectsFileByBasename.has(base)) {
          throw new Error(`Duplicate projects basename: ${base}`);
        }
        projectsFileByBasename.set(base, rel);
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
    const oldAbs = path.join(PROJECTS_ROOT, name);
    const newAbs = path.join(PROJECTS_ROOT, target);
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

function computeImportPath(fromFile, projectsRelPath) {
  const toAbs = path.join(PROJECTS_ROOT, projectsRelPath);
  let rel = path.relative(path.dirname(fromFile), toAbs).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return stripExt(rel);
}

function isCoreProjectsImport(importPath, fromFile) {
  const normalized = importPath.replace(/\\/g, '/');
  if (normalized.includes('/core/projects/')) return true;
  if (!normalized.startsWith('.')) return false;
  const resolved = path.resolve(path.dirname(fromFile), normalized);
  return resolved.startsWith(CORE_PROJECTS_ROOT + path.sep);
}

function resolveProjectsBasename(importPath, fromFile) {
  const normalized = importPath.replace(/\\/g, '/');

  if (isCoreProjectsImport(normalized, fromFile)) return null;

  const featureIdx = normalized.indexOf('features/projects/');
  if (featureIdx !== -1) {
    const tail = normalized.slice(featureIdx + 'features/projects/'.length);
    if (!tail || tail.includes('/..')) return null;
    return basenameNoExt(tail);
  }

  if (!normalized.startsWith('./') && !normalized.startsWith('../')) return null;

  const base = basenameNoExt(normalized);
  if (!projectsFileByBasename.has(base)) return null;
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
      const base = resolveProjectsBasename(imp, file);
      if (!base || !projectsFileByBasename.has(base)) return match;

      const newRel = projectsFileByBasename.get(base);
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

  console.log(`${dryRun ? 'Would update' : 'Updated'} imports in ${changedFiles} files.`);
}

function main() {
  const { dryRun, batch, subfolder } = parseArgs();

  if (dryRun) {
    moveFiles(subfolder, true);
    rebuildMapFromDisk();
    for (const name of listRootFiles()) {
      const cat = categorize(name);
      if (cat === subfolder) {
        projectsFileByBasename.set(basenameNoExt(name), `${subfolder}/${name}`);
      }
    }
    rewriteImports(true);
    return;
  }

  moveFiles(subfolder, false);
  rebuildMapFromDisk();
  console.log(`Projects file map: ${projectsFileByBasename.size} entries.`);
  rewriteImports(false);
  console.log('Fixing parent imports...');
  execSync('node scripts/fix-projects-feature-parent-imports.mjs', { cwd: REPO_ROOT, stdio: 'inherit' });
  console.log('Validating imports...');
  execSync('node scripts/validate-projects-feature-imports.mjs', { cwd: REPO_ROOT, stdio: 'inherit' });
  console.log('Done.');
}

main();
