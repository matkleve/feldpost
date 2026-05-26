#!/usr/bin/env node
/**
 * Seeds local dev QR invite codes into qr_invites (postgres superuser via docker).
 *
 * Requires: supabase start, migration 20260527130000_qr_invites_reusable_and_valid_from,
 *           and at least one auth.users row (run scripts/create-local-dev-user.mjs first).
 *
 * Usage: node scripts/seed-dev-invites.mjs
 *
 * Codes (case-sensitive at signup):
 *   KlevetaKamin           — reusable, no end date (dev)
 *   KlevetaKamin-Mai-2026  — valid May 2026 (Europe/Vienna calendar month)
 *   KlevetaKamin-Juni-2026 — valid June 2026
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const container = 'supabase_db_feldpost';

const INVITES = [
  {
    label: 'KlevetaKamin (reusable dev)',
    code: 'KlevetaKamin',
    reusable: true,
    validFrom: null,
    expiresAt: '2099-12-31T23:59:59+00:00',
  },
  {
    label: 'KlevetaKamin Mai 2026',
    code: 'KlevetaKamin-Mai-2026',
    reusable: true,
    validFrom: '2026-05-01T00:00:00+02:00',
    expiresAt: '2026-06-01T00:00:00+02:00',
  },
  {
    label: 'KlevetaKamin Juni 2026',
    code: 'KlevetaKamin-Juni-2026',
    reusable: true,
    validFrom: '2026-06-01T00:00:00+02:00',
    expiresAt: '2026-07-01T00:00:00+02:00',
  },
];

function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function run(cmd, args, input) {
  const result = spawnSync(cmd, args, {
    input,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: repoRoot,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `${cmd} failed`);
  }
  return result.stdout;
}

function psql(sql) {
  return run('docker', [
    'exec',
    '-i',
    container,
    'psql',
    '-U',
    'postgres',
    '-d',
    'postgres',
    '-t',
    '-A',
    '-v',
    'ON_ERROR_STOP=1',
  ], sql);
}

function sqlLiteral(value) {
  if (value === null) return 'null';
  return `'${String(value).replace(/'/g, "''")}'`;
}

const status = run('supabase', ['status', '-o', 'env'], undefined);
if (!status.includes('SERVICE_ROLE_KEY')) {
  throw new Error('Local Supabase not running. Run: supabase start');
}

const creatorRow = psql(
  `SELECT u.id::text,
          coalesce(p.organization_id, o.id)::text
   FROM auth.users u
   LEFT JOIN public.profiles p ON p.id = u.id
   CROSS JOIN LATERAL (
     SELECT id FROM public.organizations ORDER BY created_at LIMIT 1
   ) o
   ORDER BY u.created_at
   LIMIT 1;`,
).trim();

if (!creatorRow || !creatorRow.includes('|')) {
  console.info('[seed-dev-invites] No user found — running create-local-dev-user.mjs …');
  const bootstrap = spawnSync(process.execPath, [join(repoRoot, 'scripts/create-local-dev-user.mjs')], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  if (bootstrap.status !== 0) {
    throw new Error('create-local-dev-user.mjs failed');
  }
}

const creatorRowAfter = psql(
  `SELECT u.id::text,
          coalesce(p.organization_id, o.id)::text
   FROM auth.users u
   LEFT JOIN public.profiles p ON p.id = u.id
   CROSS JOIN LATERAL (
     SELECT id FROM public.organizations ORDER BY created_at LIMIT 1
   ) o
   ORDER BY u.created_at
   LIMIT 1;`,
).trim();

if (!creatorRowAfter || !creatorRowAfter.includes('|')) {
  throw new Error('No auth.users row after bootstrap.');
}

const [createdBy, organizationId] = creatorRowAfter.split('|').map((s) => s.trim());

if (!createdBy || !organizationId) {
  throw new Error('Could not resolve created_by / organization_id for invites.');
}

for (const invite of INVITES) {
  const tokenHash = sha256(invite.code);
  const inviteUrl = `http://localhost:4200/auth/register?invite=${encodeURIComponent(invite.code)}`;

  psql(`
INSERT INTO public.qr_invites (
  organization_id,
  created_by,
  target_role,
  invite_url,
  qr_payload,
  token_hash,
  status,
  reusable,
  valid_from,
  expires_at
)
VALUES (
  ${sqlLiteral(organizationId)}::uuid,
  ${sqlLiteral(createdBy)}::uuid,
  'worker',
  ${sqlLiteral(inviteUrl)},
  ${sqlLiteral(inviteUrl)},
  ${sqlLiteral(tokenHash)},
  'active',
  ${invite.reusable},
  ${invite.validFrom ? `${sqlLiteral(invite.validFrom)}::timestamptz` : 'null'},
  ${sqlLiteral(invite.expiresAt)}::timestamptz
)
ON CONFLICT (token_hash) DO UPDATE SET
  status = 'active',
  reusable = excluded.reusable,
  valid_from = excluded.valid_from,
  expires_at = excluded.expires_at,
  accepted_at = null,
  accepted_user_id = null,
  invite_url = excluded.invite_url,
  qr_payload = excluded.qr_payload,
  updated_at = now();
`);

  console.log(`✓ ${invite.label}`);
  console.log(`    Code: ${invite.code}`);
  console.log(`    Hash: ${tokenHash}`);
}

console.log('\nUse the exact code (case-sensitive) on /auth/register → Create account.');
