#!/usr/bin/env node
/**
 * Creates a local dev user on `supabase start` (Docker).
 * Requires: local stack running, container `supabase_db_feldpost`.
 *
 * Usage: node scripts/create-local-dev-user.mjs
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const container = 'supabase_db_feldpost';
const email = process.env.FELDPOST_LOCAL_EMAIL ?? 'kleveta.matthias@gmail.com';
const password = process.env.FELDPOST_LOCAL_PASSWORD ?? 'FeldpostLocal1!';
const fullName = process.env.FELDPOST_LOCAL_NAME ?? 'Matthias (local dev)';

function run(cmd, args, input, options = {}) {
  const result = spawnSync(cmd, args, {
    input,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: options.cwd,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `${cmd} failed`);
  }
  return result.stdout;
}

function psql(sql) {
  return run('docker', ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres'], sql);
}

const status = run('supabase', ['status', '-o', 'env'], undefined, { cwd: repoRoot });
const serviceRole = status.match(/SERVICE_ROLE_KEY="([^"]+)"/)?.[1];
if (!serviceRole) {
  throw new Error('Local Supabase not running. Run: supabase start');
}

const escapedEmail = email.replace(/'/g, "''");

psql(`
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org_id uuid; v_role_id uuid;
BEGIN
  SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
  INSERT INTO public.profiles (id, organization_id, full_name, avatar_url)
  VALUES (NEW.id, v_org_id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  SELECT id INTO v_role_id FROM public.roles WHERE name = 'user';
  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id) VALUES (NEW.id, v_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
`);

const existing = psql(
  `SELECT id::text FROM auth.users WHERE lower(email) = lower('${escapedEmail}');`,
).trim();

if (existing) {
  console.log(`User already exists: ${email}`);
} else {
  const res = await fetch('http://127.0.0.1:54321/auth/v1/admin/users', {
    method: 'POST',
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.message ?? body.error ?? JSON.stringify(body));
  }
  console.log(`Created user: ${email}`);
}

psql(`
INSERT INTO public.user_roles (user_id, role_id)
SELECT u.id, r.id FROM auth.users u JOIN public.roles r ON r.name = 'admin'
WHERE lower(u.email) = lower('${escapedEmail}')
ON CONFLICT (user_id, role_id) DO NOTHING;
`);

const inviteMigration = readFileSync(
  join(repoRoot, 'supabase/migrations/20260317170000_invite_only_signup.sql'),
  'utf8',
);
psql(inviteMigration);

console.log('\nLocal login:');
console.log(`  Email:    ${email}`);
console.log(`  Password: ${password}`);
