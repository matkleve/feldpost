/**
 * Starts Supabase dev log relay + Angular dev server (apps/web).
 * Use: npm start (from apps/web) — terminal shows local vs cloud when the app boots.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webDir = path.join(repoRoot, 'apps/web');
const logServerScript = path.join(repoRoot, 'scripts/supabase-dev-log-server.mjs');

const logServer = spawn(process.execPath, [logServerScript], {
  cwd: repoRoot,
  stdio: 'inherit',
});

const ngServe = spawn('npx', ['ng', 'serve'], {
  cwd: webDir,
  stdio: 'inherit',
  shell: true,
});

function shutdown(code = 0) {
  logServer.kill('SIGTERM');
  ngServe.kill('SIGTERM');
  process.exit(code);
}

ngServe.on('exit', (code) => shutdown(code ?? 0));
logServer.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    shutdown(code);
  }
});

process.on('SIGINT', () => shutdown(130));
process.on('SIGTERM', () => shutdown(143));
