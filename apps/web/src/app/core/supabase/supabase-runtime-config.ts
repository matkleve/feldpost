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

const DEV_TARGET_STORAGE_KEY = 'feldpost.supabase.target';

type DevSupabaseEnv = {
  preferLocalWhenAvailable?: boolean;
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

function prefersLocalWhenAvailable(): boolean {
  return getSupabaseEnv().preferLocalWhenAvailable === true;
}

function getDevTargetOverride(): SupabaseTarget | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  const value = localStorage.getItem(DEV_TARGET_STORAGE_KEY);
  if (value === 'local' || value === 'cloud') {
    return value;
  }
  return null;
}

/** Dev relay port — must match scripts/supabase-dev-log-server.mjs */
const DEV_LOG_RELAY_PORT = 47291;

function reportSupabaseTargetToDevTerminal(config: ResolvedSupabaseConfig): void {
  if (environment.production) {
    return;
  }

  let message: string;
  if (config.target === 'local') {
    message = `Supabase: local (${config.url}) — use a local account; cloud login: localStorage feldpost.supabase.target=cloud`;
  } else {
    const hasLocal = getLocalEndpoint() !== null;
    message = hasLocal
      ? `Supabase: cloud (${config.url}) — local not reachable; run \`supabase start\` or set preferLocalWhenAvailable`
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
  const baseUrl = apiUrl.replace(/\/$/, '');
  const healthUrl = `${baseUrl}/auth/v1/health`;
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

/** Kong returns 503 when the local Edge Runtime container is stopped. */
async function isLocalGeocodeEdgeReachable(
  apiUrl: string,
  anonKey: string,
): Promise<boolean> {
  const geocodeUrl = `${apiUrl.replace(/\/$/, '')}/functions/v1/geocode`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(geocodeUrl, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'forward', q: 'health', limit: 1 }),
      signal: controller.signal,
    });
    return response.status !== 503;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

function warnLocalEdgeFunctionsUnavailable(): void {
  console.warn(
    '[feldpost] Local Supabase is up but Edge Functions (geocode) are unavailable (503). ' +
      'Run: npm run supabase:ensure-edge — or: docker start supabase_edge_runtime_feldpost',
  );
}

/**
 * Picks Supabase endpoint before Auth initializes.
 * Production always uses cloud. Development defaults to cloud (hosted users); opt in to local.
 */
export async function resolveSupabaseRuntimeConfig(): Promise<ResolvedSupabaseConfig> {
  const cloud = getCloudEndpoint();

  if (environment.production) {
    resolvedConfig = { ...cloud, target: 'cloud' };
    return resolvedConfig;
  }

  const override = getDevTargetOverride();
  if (override === 'cloud') {
    resolvedConfig = { ...cloud, target: 'cloud' };
    reportSupabaseTargetToDevTerminal(resolvedConfig);
    return resolvedConfig;
  }

  const local = getLocalEndpoint();
  const useLocal =
    override === 'local' || (prefersLocalWhenAvailable() && local !== null);

  if (useLocal && local && (await isLocalSupabaseReachable(local.url))) {
    resolvedConfig = { ...local, target: 'local' };
    if (!(await isLocalGeocodeEdgeReachable(local.url, local.anonKey))) {
      warnLocalEdgeFunctionsUnavailable();
    }
    reportSupabaseTargetToDevTerminal(resolvedConfig);
    return resolvedConfig;
  }

  resolvedConfig = { ...cloud, target: 'cloud' };
  reportSupabaseTargetToDevTerminal(resolvedConfig);
  return resolvedConfig;
}
