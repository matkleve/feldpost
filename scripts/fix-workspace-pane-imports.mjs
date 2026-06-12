import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const base = join(root, 'apps/web/src/app/shared/workspace-pane');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.ts')) out.push(p);
  }
  return out;
}

function depthFromWorkspacePane(file) {
  const rel = file.slice(base.length + 1).replace(/\\/g, '/');
  const parts = rel.split('/');
  return parts.length - 1; // directory depth (0 = file in workspace-pane root)
}

for (const file of walk(base)) {
  const depth = depthFromWorkspacePane(file);
  const ups = '../'.repeat(depth + 2); // +2: workspace-pane→shared, shared→app (same as old ../../ from ws root file was depth 0 → ../../ )
  // Old convention at workspace-pane/X/Y/file: was ../../core when path had workspace-pane depth 1 (one folder between pane and file)?
  // Actually from OLD flat layout file at workspace-pane/foo.ts had ../../core (2 ups).
  // Our depth counter: parts.length - 1 for foo/bar.ts is 1 (folder foo). For workspace-pane/foo.ts parts=['foo.ts'] length 1 → depth 0.
  // workspace-pane/shell/foo.ts parts shell, foo.ts → depth 1. Need 3 ups total to app: ../../../core
  // Formula: upsToApp = 2 + depth where depth = number of folders under workspace-pane (excluding file).
  const upsToApp = '../'.repeat(2 + depth);
  let s = readFileSync(file, 'utf8');
  const next = s
    .replace(/from '\.\.\/\.\.\/core\//g, `from '${upsToApp}core/`)
    .replace(/from "\.\.\/\.\.\/core\//g, `from "${upsToApp}core/`)
    .replace(/from '\.\.\/\.\.\/shared\//g, `from '${upsToApp}shared/`)
    .replace(/from "\.\.\/\.\.\/shared\//g, `from "${upsToApp}shared/`);
  if (next !== s) writeFileSync(file, next);
}
