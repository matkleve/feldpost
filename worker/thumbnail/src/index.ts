import http from 'node:http';
import { loadConfig } from './config.js';
import { createDbClient } from './db.js';
import { logGenerationError, registerProcessErrorHandlers } from './errors.js';
import { generateThumbnail } from './generate.js';

registerProcessErrorHandlers();

const config = loadConfig();
const dbClient = createDbClient(config);

type GenerateBody = {
  mediaId?: string;
  storagePath?: string;
  mimeType?: string;
  organizationId?: string;
  userId?: string;
};

function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function parseGenerateBody(body: unknown): GenerateBody & {
  mediaId: string;
  storagePath: string;
  mimeType: string;
  organizationId: string;
  userId: string;
} {
  const record = (body ?? {}) as GenerateBody;
  const mediaId = record.mediaId?.trim();
  const storagePath = record.storagePath?.trim();
  const mimeType = record.mimeType?.trim() ?? '';
  const organizationId = record.organizationId?.trim();
  const userId = record.userId?.trim();

  if (!mediaId) throw new Error('mediaId is required');
  if (!storagePath) throw new Error('storagePath is required');
  if (!organizationId) throw new Error('organizationId is required');
  if (!userId) throw new Error('userId is required');

  return { mediaId, storagePath, mimeType, organizationId, userId };
}

const server = http.createServer(async (req, res) => {
  const url = req.url?.split('?')[0] ?? '';

  if (req.method === 'GET' && url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }

  if (req.method === 'POST' && url === '/generate') {
    try {
      const body = await readJsonBody(req);
      const input = parseGenerateBody(body);

      void generateThumbnail(dbClient, config, input)
        .then((result) => {
          if ('error' in result) {
            logGenerationError(input.mediaId, new Error(result.error));
          }
        })
        .catch((err) => logGenerationError(input.mediaId, err));

      res.writeHead(202, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ accepted: true, mediaId: input.mediaId }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: message }));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(config.port, () => {
  console.info(`[thumbnail-worker] listening on :${config.port}`);
});
