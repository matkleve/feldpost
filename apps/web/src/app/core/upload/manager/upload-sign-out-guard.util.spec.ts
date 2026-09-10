import { describe, expect, it, vi } from 'vitest';
import { installUploadSignOutGuardSync } from './upload-sign-out-guard.util';

describe('installUploadSignOutGuard', () => {
  it('cancels active uploads before auth.signOut clears the session', async () => {
    const cancelAllActive = vi.fn().mockResolvedValue(undefined);
    const originalSignOut = vi.fn().mockResolvedValue({ error: null });
    const auth = { signOut: originalSignOut };
    const supabaseClient = { auth } as never;

    installUploadSignOutGuardSync({
      getSupabaseClient: () => supabaseClient,
      hasRunning: () => true,
      cancelAllActive,
    });

    await auth.signOut();

    expect(cancelAllActive).toHaveBeenCalledBefore(originalSignOut);
    expect(originalSignOut).toHaveBeenCalledOnce();
  });
});
