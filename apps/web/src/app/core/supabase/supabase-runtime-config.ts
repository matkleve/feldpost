import { environment } from '../../../environments/environment';

export type SupabaseTarget = 'local' | 'cloud';

export interface SupabaseEndpoint {
  url: string;
  anonKey: string;
}

export interface ResolvedSupabaseConfig extends SupabaseEndpoint {
  target: SupabaseTarget;
}

let resolvedConfig: ResolvedSupabaseConfig | null = null;

/** Returns config set by {@link resolveSupabaseRuntimeConfig} during APP_INITIALIZER. */
export function getResolvedSupabaseConfig(): ResolvedSupabaseConfig {
  if (!resolvedConfig) {
    throw new Error('Supabase runtime config is not initialized yet.');
  }
  return resolvedConfig;
}

/** Dev-only: true when the app booted against local Supabase. */
export function isLocalSupabaseTarget(): boolean {
  return resolvedConfig?.target === 'local';
}

type DevSupabaseEnv = {
  cloud?: SupabaseEndpoint;
  local?: SupabaseEndpoint;
  url?: string;
  anonKey?: string;
};

function getSupabaseEnv(): DevSupabaseEnv {
  return environment.supabase as DevSupabaseEnv;
}

function getCloudEndpoint(): SupabaseEndpoint {
  const supabase = getSupabaseEnv();
  if (supabase.cloud) {
    return supabase.cloud;
  }
  if (supabase.url && supabase.anonKey) {
    return { url: supabase.url, anonKey: supabase.anonKey };
  }
  throw new Error('Supabase cloud endpoint is not configured.');
}

function getLocalEndpoint(): SupabaseEndpoint | null {
  return getSupabaseEnv().local ?? null;
}

/** Dev relay port — must match scripts/supabase-dev-log-server.mjs */
const DEV_LOG_RELAY_PORT = 47291;

function reportSupabaseTargetToDevTerminal(config: ResolvedSupabaseConfig): void {
  if (environment.production) {
    return;
  }

  let message: string;
  if (config.target === 'local') {
    message = `Supabase: local (${config.url})`;
  } else {
    const hasLocal = getLocalEndpoint() !== null;
    message = hasLocal
      ? `Supabase: cloud (${config.url}) — local not reachable; run \`supabase start\` to use local`
      : `Supabase: cloud (${config.url})`;
  }

  console.info(`[feldpost] ${message}`);

  void fetch(`http://127.0.0.1:${DEV_LOG_RELAY_PORT}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, target: config.target, url: config.url }),
  }).catch(() => {
    // Relay only runs with `npm start` (start-web-dev.mjs); plain `ng serve` uses browser console only.
  });
}

async function isLocalSupabaseReachable(apiUrl: string): Promise<boolean> {
  const healthUrl = `${apiUrl.replace(/\/$/, '')}/auth/v1/health`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);
  try {
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Picks Supabase endpoint before Auth initializes.
 * Production always uses cloud. Development probes local health, then falls back to cloud.
 */
export async function resolveSupabaseRuntimeConfig(): Promise<ResolvedSupabaseConfig> {
  const cloud = getCloudEndpoint();

  if (environment.production) {
    resolvedConfig = { ...cloud, target: 'cloud' };
    return resolvedConfig;
  }

  const local = getLocalEndpoint();
  if (local && (await isLocalSupabaseReachable(local.url))) {
    resolvedConfig = { ...local, target: 'local' };
    reportSupabaseTargetToDevTerminal(resolvedConfig);
    return resolvedConfig;
  }

  resolvedConfig = { ...cloud, target: 'cloud' };
  reportSupabaseTargetToDevTerminal(resolvedConfig);
  return resolvedConfig;
}
