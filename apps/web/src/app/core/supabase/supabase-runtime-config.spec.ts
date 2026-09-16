import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getResolvedSupabaseConfig,
  resolveSupabaseRuntimeConfig,
  setSupabaseEnvironmentOverrideForTests,
} from './supabase-runtime-config';
import type { DevSupabaseEnv } from './supabase-runtime-config';

// `vi.mock()` on a relative import is rejected outright by the Angular unit-test system, which
// made this whole suite unloadable there. The module exposes an explicit override instead.
// Built fresh per test: one case mutates `preferLocalWhenAvailable`, and a shared object would
// carry that into the next test — which is precisely what the old version did to the real
// environment singleton, for every file that ran after it in the same worker.
function makeTestEnvironment() {
  return {
    production: false,
    i18n: { enableLegacyDomFallback: true },
    supabase: {
      preferLocalWhenAvailable: true,
      cloud: {
        url: 'https://cloud.example.supabase.co',
        anonKey: 'cloud-key',
      },
      local: {
        url: 'http://127.0.0.1:54321',
        anonKey: 'local-key',
      },
    },
  } as unknown as NonNullable<Parameters<typeof setSupabaseEnvironmentOverrideForTests>[0]>;
}

let testEnvironment = makeTestEnvironment();

describe('resolveSupabaseRuntimeConfig', () => {
  beforeEach(() => {
    testEnvironment = makeTestEnvironment();
    setSupabaseEnvironmentOverrideForTests(testEnvironment);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    setSupabaseEnvironmentOverrideForTests(null);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('uses local when health check succeeds', async () => {
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/functions/v1/geocode')) {
        return { status: 200 } as Response;
      }
      return { ok: true } as Response;
    });

    const resolved = await resolveSupabaseRuntimeConfig();

    expect(resolved.target).toBe('local');
    expect(resolved.url).toBe('http://127.0.0.1:54321');
    expect(getResolvedSupabaseConfig().anonKey).toBe('local-key');
    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:54321/auth/v1/health',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('warns when local auth is up but geocode edge returns 503', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/functions/v1/geocode')) {
        return { status: 503 } as Response;
      }
      return { ok: true } as Response;
    });

    const resolved = await resolveSupabaseRuntimeConfig();

    expect(resolved.target).toBe('local');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Edge Functions'));
    warnSpy.mockRestore();
  });

  it('falls back to cloud when local health check fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('connection refused'));

    const resolved = await resolveSupabaseRuntimeConfig();

    expect(resolved.target).toBe('cloud');
    expect(resolved.url).toBe('https://cloud.example.supabase.co');
  });

  it('uses cloud when preferLocalWhenAvailable is false', async () => {
    // Same cast the module itself makes (getSupabaseEnv) — the environment shape differs per
    // build configuration, which is why every member of DevSupabaseEnv is optional. Mutate the
    // per-test override, never the real environment module.
    const supabaseEnv = testEnvironment.supabase as DevSupabaseEnv;
    supabaseEnv.preferLocalWhenAvailable = false;
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);

    const resolved = await resolveSupabaseRuntimeConfig();

    expect(resolved.target).toBe('cloud');
  });
});
