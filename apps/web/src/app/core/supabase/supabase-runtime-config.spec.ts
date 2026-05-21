import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getResolvedSupabaseConfig,
  resolveSupabaseRuntimeConfig,
} from './supabase-runtime-config';

vi.mock('../../../environments/environment', () => ({
  environment: {
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
  },
}));

describe('resolveSupabaseRuntimeConfig', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('uses local when health check succeeds', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);

    const resolved = await resolveSupabaseRuntimeConfig();

    expect(resolved.target).toBe('local');
    expect(resolved.url).toBe('http://127.0.0.1:54321');
    expect(getResolvedSupabaseConfig().anonKey).toBe('local-key');
    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:54321/auth/v1/health',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('falls back to cloud when local health check fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('connection refused'));

    const resolved = await resolveSupabaseRuntimeConfig();

    expect(resolved.target).toBe('cloud');
    expect(resolved.url).toBe('https://cloud.example.supabase.co');
  });

  it('uses cloud when preferLocalWhenAvailable is false', async () => {
    const env = (await import('../../../environments/environment')).environment as {
      supabase: { preferLocalWhenAvailable: boolean };
    };
    env.supabase.preferLocalWhenAvailable = false;
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);

    const resolved = await resolveSupabaseRuntimeConfig();

    expect(resolved.target).toBe('cloud');
  });
});
