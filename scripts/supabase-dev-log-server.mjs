/**
 * Dev-only relay: browser posts chosen Supabase target → stdout of ng serve terminal.
 * Started by scripts/start-web-dev.mjs alongside `ng serve`.
 */
import http from 'node:http';

const PORT = 47291;
const HOST = '127.0.0.1';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const server = http.createServer((req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST' || req.url !== '/report') {
    res.writeHead(404);
    res.end();
    return;
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => {
    try {
      const payload = JSON.parse(body);
      const line =
        typeof payload.message === 'string'
          ? payload.message
          : `Supabase: ${payload.target} (${payload.url})`;
      process.stdout.write(`[feldpost] ${line}\n`);
      res.writeHead(204);
      res.end();
    } catch {
      res.writeHead(400);
      res.end();
    }
  });
});

server.listen(PORT, HOST, () => {
  process.stdout.write(
    `[feldpost] Supabase dev log relay on http://${HOST}:${PORT} (app choice → this terminal)\n`,
  );
});

function shutdown() {
  server.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
