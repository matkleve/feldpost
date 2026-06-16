import type { OrgBranding } from './organization.types';

/** Feldpost default theme colors for color-picker display when no org override is stored. Hex mirrors :root tokens in styles.scss. */
export const FELDPOST_BRAND_DEFAULTS = {
  primaryColor: '#c9a84c',
  accentColor: '#f2f2f2',
  backgroundColor: '#ffffff',
} as const satisfies Record<
  keyof Pick<OrgBranding, 'primaryColor' | 'accentColor' | 'backgroundColor'>,
  string
>;

const BRANDING_CSS_VARS = {
  primaryColor: '--primary',
  accentColor: '--accent',
  backgroundColor: '--background',
} as const satisfies Record<
  keyof Pick<OrgBranding, 'primaryColor' | 'accentColor' | 'backgroundColor'>,
  string
>;

/** Applies org branding overrides to document root CSS variables. */
export function applyOrgBrandingToDocument(
  branding: Pick<OrgBranding, 'primaryColor' | 'accentColor' | 'backgroundColor'> | null,
): void {
  const root = document.documentElement;
  for (const [field, cssVar] of Object.entries(BRANDING_CSS_VARS) as [
    keyof typeof BRANDING_CSS_VARS,
    string,
  ][]) {
    const value = branding?.[field];
    if (value) {
      root.style.setProperty(cssVar, value);
    } else {
      root.style.removeProperty(cssVar);
    }
  }
}

/** Removes org branding overrides and restores theme-defined CSS variables. */
export function clearOrgBrandingFromDocument(): void {
  applyOrgBrandingToDocument({
    primaryColor: null,
    accentColor: null,
    backgroundColor: null,
  });
}

/** Downloads a completed export job payload as a JSON file in the browser. */
export function downloadExportPayload(
  payload: Record<string, unknown>,
  format: string,
  jobId: string,
): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `organization-export-${jobId}.${format === 'csv' ? 'csv' : 'json'}`;
  anchor.click();
  URL.revokeObjectURL(url);
}
