import type { MfaFactorViewModel } from '../../core/auth/auth.service';

export type AccountProfileCacheSnapshot = {
  fullName: string;
  roleNames: string[];
  organizationId: string | null;
  pendingEmail: string;
  mfaFactors: MfaFactorViewModel[];
  assuranceLevel: 'aal1' | 'aal2' | null;
};

let cachedSnapshot: AccountProfileCacheSnapshot | null = null;

export function getAccountProfileCache(): AccountProfileCacheSnapshot | null {
  return cachedSnapshot;
}

export function setAccountProfileCache(snapshot: AccountProfileCacheSnapshot): void {
  cachedSnapshot = snapshot;
}

export function clearAccountProfileCache(): void {
  cachedSnapshot = null;
}
