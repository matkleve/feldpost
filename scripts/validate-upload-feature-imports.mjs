#!/usr/bin/env node
/**
 * Resolve every relative import under apps/web/src; exit 1 on broken paths.
 * Run from repository root: node scripts/validate-upload-feature-imports.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB_SRC = path.join(REPO_ROOT, 'apps/web/src');
const UPLOAD_FEATURE_ROOT = path.join(WEB_SRC, 'app/features/upload');
const EXTERNAL_CONSUMERS = [
  path.join(WEB_SRC, 'app/layout/authenticated-app-layout.component.ts'),
  path.join(WEB_SRC, 'app/features/map/map-shell/map-shell.component.ts'),
  path.join(WEB_SRC, 'app/features/map/map-shell/map-shell.component.spec.ts'),
  path.join(WEB_SRC, 'app/features/media/media.component.ts'),
  path.join(WEB_SRC, 'app/features/media/media-content.component.ts'),
];

function listTsFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      if (entry.name === 'archive') continue;
      out.push(...listTsFiles(full));
    } else if (entry.name.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

function resolveImport(fromFile, specifier) {
  if (!specifier.startsWith('.')) return true;
  const abs = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [abs, `${abs}.ts`, path.join(abs, 'index.ts')];
  return candidates.some((c) => fs.existsSync(c));
}

const importRe = /(?:from\s+['"])([^'"]+)(?:['"])|(?:import\s*\(\s*['"])([^'"]+)(?:['"]\s*\))/g;

function shouldValidate(file) {
  if (file.startsWith(UPLOAD_FEATURE_ROOT + path.sep)) return true;
  return EXTERNAL_CONSUMERS.includes(file);
}

function main() {
  const broken = [];

  for (const file of listTsFiles(WEB_SRC)) {
    if (!shouldValidate(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    let match;
    importRe.lastIndex = 0;
    while ((match = importRe.exec(content)) !== null) {
      const imp = match[1] ?? match[2];
      if (!imp.startsWith('.')) continue;
      if (!resolveImport(file, imp)) {
        broken.push({ file: path.relative(REPO_ROOT, file), import: imp });
      }
    }
  }

  if (broken.length === 0) {
    console.log('All relative imports resolve.');
    return;
  }

  console.error(`Broken imports (${broken.length}):`);
  for (const { file, import: imp } of broken) {
    console.error(`  ${file}: ${imp}`);
  }
  process.exit(1);
}

main();
