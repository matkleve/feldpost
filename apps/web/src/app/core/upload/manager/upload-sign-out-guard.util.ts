/**
 * Cancels active uploads before Supabase clears the session on sign-out,
 * so RLS-protected residue cleanup still has a valid JWT.
 *
 * @see docs/audits/upload-flow-review-2026-09-10/02-new-issues.md NF-03
 */

import type { SupabaseClient } from '@supabase/supabase-js';

type SignOutGuardDeps = {
  /** Lazy — avoids touching SupabaseService.client during UploadManagerService construction. */
  getSupabaseClient: () => SupabaseClient;
  hasRunning: () => boolean;
  cancelAllActive: () => Promise<void>;
};

export function installUploadSignOutGuard(deps: SignOutGuardDeps): void {
  let patched = false;

  const patchSignOutOnce = (): void => {
    if (patched) {
      return;
    }
    const authClient = deps.getSupabaseClient().auth;
    if (!authClient?.signOut) {
      return;
    }
    const originalSignOut = authClient.signOut.bind(authClient);
    authClient.signOut = async (options?) => {
      if (deps.hasRunning()) {
        await deps.cancelAllActive();
      }
      return originalSignOut(options);
    };
    patched = true;
  };

  // Schedule patching after construction — first sign-out or explicit warm-up.
  queueMicrotask(() => {
    try {
      patchSignOutOnce();
    } catch {
      // Supabase runtime config may not be ready in unit tests that never sign out.
    }
  });
}

/** @internal Test hook to patch immediately when Supabase is already initialized. */
export function installUploadSignOutGuardSync(deps: SignOutGuardDeps): void {
  const authClient = deps.getSupabaseClient().auth;
  if (!authClient?.signOut) {
    return;
  }
  const originalSignOut = authClient.signOut.bind(authClient);
  authClient.signOut = async (options?) => {
    if (deps.hasRunning()) {
      await deps.cancelAllActive();
    }
    return originalSignOut(options);
  };
}
