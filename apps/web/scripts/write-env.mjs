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

const fileContent = `export const environment = {
    production: true,
    supabase: {
        url: '${supabaseUrl}',
        anonKey: '${supabaseAnonKey}',
    },
};
`;

await writeFile(envFilePath, fileContent, 'utf8');
console.log('[write-env] wrote production environment.ts from process environment');
