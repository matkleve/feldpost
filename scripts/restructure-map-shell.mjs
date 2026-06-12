#!/usr/bin/env node
/**
 * Move map-shell files into domain subfolders and rewrite imports.
 * Run from repository root:
 *   node scripts/restructure-map-shell.mjs --dry-run --batch=markers
 *   node scripts/restructure-map-shell.mjs --batch=markers
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAP_SHELL_ROOT = path.join(REPO_ROOT, 'apps/web/src/app/features/map/map-shell');
const WEB_SRC = path.join(REPO_ROOT, 'apps/web/src');
const CORE_MAP_ROOT = path.join(REPO_ROOT, 'apps/web/src/app/core/map');
const SUBFOLDERS = ['component', 'markers', 'radius', 'workspace', 'leaflet', 'context-menu', 'scss'];

const BATCHES = {
  leaflet: 'leaflet',
  'context-menu': 'context-menu',
  workspace: 'workspace',
  markers: 'markers',
  radius: 'radius',
  scss: 'scss',
  component: 'component',
};

/** @type {Map<string, string>} basename (no ext) -> path relative to MAP_SHELL_ROOT */
const mapShellFileByBasename = new Map();

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
      'Usage: node scripts/restructure-map-shell.mjs [--dry-run] --batch=leaflet|context-menu|workspace|markers|radius|scss|component',
    );
    process.exit(1);
  }
  return { dryRun, batch, subfolder: BATCHES[batch] };
}

function categorize(filename) {
  if (filename.startsWith('map-shell.component')) return 'component';
  if (filename === 'map-shell.state.ts') return 'component';
  if (filename === 'map-shell-helpers.ts') return 'component';
  if (filename === 'map-shell.component.spec.ts') return 'component';

  if (filename.startsWith('_map-shell-')) return 'scss';

  if (
    filename.startsWith('marker-') ||
    filename.startsWith('map-marker-') ||
    filename.startsWith('photo-marker-') ||
    filename.startsWith('viewport-marker-') ||
    filename.startsWith('zoom-target-marker') ||
    filename === 'detail-zoom-highlight.service.ts'
  ) {
    return 'markers';
  }

  if (filename.startsWith('radius-')) return 'radius';

  if (filename.startsWith('map-workspace-') || filename.startsWith('map-project-')) {
    return 'workspace';
  }

  if (
    filename === 'map-leaflet.service.ts' ||
    filename === 'map-basemap-layer.service.ts' ||
    filename === 'map-geolocation.service.ts' ||
    filename === 'map-deferred-startup.service.ts' ||
    filename === 'map-preferences.service.ts'
  ) {
    return 'leaflet';
  }

  if (filename === 'map-context-actions.service.ts' || filename === 'map-focus-payload.service.ts') {
    return 'context-menu';
  }

  return null;
}

function listRootFiles() {
  return fs
    .readdirSync(MAP_SHELL_ROOT, { withFileTypes: true })
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

function registerFile(relPath) {
  if (!relPath.endsWith('.ts') && !relPath.endsWith('.html') && !relPath.endsWith('.scss')) return;
  const base = basenameNoExt(relPath);
  if (mapShellFileByBasename.has(base)) {
    throw new Error(`Duplicate map-shell basename: ${base} (${relPath} vs ${mapShellFileByBasename.get(base)})`);
  }
  mapShellFileByBasename.set(base, relPath);
}

function rebuildMapFromDisk() {
  mapShellFileByBasename.clear();

  function walk(relDir) {
    const abs = path.join(MAP_SHELL_ROOT, relDir);
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (relDir === '' && !SUBFOLDERS.includes(entry.name)) continue;
        walk(rel);
      } else if (entry.name.endsWith('.ts')) {
        const base = basenameNoExt(entry.name);
        if (mapShellFileByBasename.has(base)) {
          throw new Error(`Duplicate map-shell basename: ${base}`);
        }
        mapShellFileByBasename.set(base, rel);
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
    const oldAbs = path.join(MAP_SHELL_ROOT, name);
    const newAbs = path.join(MAP_SHELL_ROOT, target);
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

function computeImportPath(fromFile, mapShellRelPath) {
  const toAbs = path.join(MAP_SHELL_ROOT, mapShellRelPath);
  let rel = path.relative(path.dirname(fromFile), toAbs).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return stripExt(rel);
}

function isCoreMapImport(importPath, fromFile) {
  const normalized = importPath.replace(/\\/g, '/');
  if (normalized.includes('/core/map/')) return true;
  if (!normalized.startsWith('.')) return false;
  const resolved = path.resolve(path.dirname(fromFile), normalized);
  return resolved.startsWith(CORE_MAP_ROOT + path.sep);
}

function resolveMapShellBasename(importPath, fromFile) {
  const normalized = importPath.replace(/\\/g, '/');

  if (isCoreMapImport(normalized, fromFile)) return null;

  const featureIdx = normalized.indexOf('features/map/map-shell/');
  if (featureIdx !== -1) {
    const tail = normalized.slice(featureIdx + 'features/map/map-shell/'.length);
    if (!tail || tail.includes('/..')) return null;
    return basenameNoExt(tail);
  }

  if (!normalized.startsWith('./') && !normalized.startsWith('../')) return null;

  const base = basenameNoExt(normalized);
  if (!mapShellFileByBasename.has(base)) return null;
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
      const base = resolveMapShellBasename(imp, file);
      if (!base || !mapShellFileByBasename.has(base)) return match;

      const newRel = mapShellFileByBasename.get(base);
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

function fixComponentScssUses(batchSubfolder, dryRun) {
  if (batchSubfolder !== 'scss' && batchSubfolder !== 'component') return;

  const componentScss = path.join(MAP_SHELL_ROOT, 'component', 'map-shell.component.scss');
  const rootScss = path.join(MAP_SHELL_ROOT, 'map-shell.component.scss');
  const scssPath = fs.existsSync(componentScss) ? componentScss : rootScss;
  if (!fs.existsSync(scssPath)) return;

  let content = fs.readFileSync(scssPath, 'utf8');
  const partials = [
    'map-shell-context-menu',
    'map-shell-style-switch',
    'map-shell-gps-placement',
    'map-shell-layout',
    'map-shell-upload',
  ];
  let changed = false;
  for (const partial of partials) {
    const fromRoot = `@use './${partial}'`;
    const fromComponent = `@use '../scss/${partial}'`;
    if (content.includes(fromRoot)) {
      content = content.replaceAll(fromRoot, fromComponent);
      changed = true;
    }
  }
  if (changed && !dryRun) {
    fs.writeFileSync(scssPath, content);
    console.log('Updated map-shell.component.scss @use paths for scss/ subfolder.');
  }
}

function main() {
  const { dryRun, batch, subfolder } = parseArgs();

  if (dryRun) {
    moveFiles(subfolder, true);
    rebuildMapFromDisk();
    for (const name of listRootFiles()) {
      const cat = categorize(name);
      if (cat === subfolder) {
        mapShellFileByBasename.set(basenameNoExt(name), `${subfolder}/${name}`);
      }
    }
    rewriteImports(true);
    return;
  }

  moveFiles(subfolder, false);
  rebuildMapFromDisk();
  console.log(`Map-shell file map: ${mapShellFileByBasename.size} entries.`);
  rewriteImports(false);
  fixComponentScssUses(subfolder, false);
  console.log('Fixing parent imports...');
  execSync('node scripts/fix-map-shell-parent-imports.mjs', { cwd: REPO_ROOT, stdio: 'inherit' });
  console.log('Validating imports...');
  execSync('node scripts/validate-map-shell-imports.mjs', { cwd: REPO_ROOT, stdio: 'inherit' });
  console.log('Done.');
}

main();
