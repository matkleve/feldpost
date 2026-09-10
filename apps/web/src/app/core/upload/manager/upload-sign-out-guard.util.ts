/**
 * Cancels active uploads before Supabase clears the session on sign-out,
 * so RLS-protected residue cleanup still has a valid JWT.
 *
 * @see docs/audits/upload-flow-review-2026-09-10/02-new-issues.md NF-03
 */

import type { SupabaseClient } from '@supabase/supabase-js';

type SignOutGuardDeps = {
  supabaseClient: SupabaseClient;
  hasRunning: () => boolean;
  cancelAllActive: () => Promise<void>;
};

export function installUploadSignOutGuard(deps: SignOutGuardDeps): void {
  const authClient = deps.supabaseClient.auth;
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
