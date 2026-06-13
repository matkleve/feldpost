import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envFilePath = path.resolve(__dirname, '../src/environments/environment.ts');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing required build environment variables: SUPABASE_URL and SUPABASE_ANON_KEY.',
  );
}

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envFilePath = path.resolve(__dirname, '../src/environments/environment.ts');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing required build environment variables: SUPABASE_URL and SUPABASE_ANON_KEY.',
  );
}

function resolveAppUrl() {
  const explicit = process.env.APP_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }

  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProduction) {
    return `https://${vercelProduction.replace(/\/$/, '')}`;
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/\/$/, '')}`;
  }

  return 'https://feldpost.pages.dev';
}

const appUrl = resolveAppUrl();

const fileContent = `export const environment = {
    production: true,
    appUrl: '${appUrl}',
    i18n: {
        enableLegacyDomFallback: false,
    },
    supabase: {
        url: '${supabaseUrl}',
        anonKey: '${supabaseAnonKey}',
    },
};
`;

await writeFile(envFilePath, fileContent, 'utf8');
console.log('[write-env] wrote production environment.ts from process environment');
