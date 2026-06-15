export type OrganizationSectionId =
  | 'profile'
  | 'roles'
  | 'branding'
  | 'billing'
  | 'integrations'
  | 'export'
  | 'audit';

export interface OrganizationSectionConfig {
  id: OrganizationSectionId;
  icon: string;
  labelKey: string;
  labelFallback: string;
}

export const ORGANIZATION_SECTIONS: readonly OrganizationSectionConfig[] = [
  { id: 'profile', icon: 'business', labelKey: 'organization.section.profile', labelFallback: 'Profile' },
  { id: 'roles', icon: 'admin_panel_settings', labelKey: 'organization.section.roles', labelFallback: 'Roles & Permissions' },
  { id: 'branding', icon: 'palette', labelKey: 'organization.section.branding', labelFallback: 'Branding' },
  { id: 'billing', icon: 'payments', labelKey: 'organization.section.billing', labelFallback: 'Billing' },
  { id: 'integrations', icon: 'api', labelKey: 'organization.section.integrations', labelFallback: 'API Keys' },
  { id: 'export', icon: 'download', labelKey: 'organization.section.export', labelFallback: 'Data Export' },
  { id: 'audit', icon: 'history', labelKey: 'organization.section.audit', labelFallback: 'Audit Log' },
];

export function resolveOrganizationSectionFromUrl(url: string): OrganizationSectionId {
  const match = url.match(/^\/organization\/([^/?#]+)/);
  const segment = match?.[1] ?? 'profile';
  const known = ORGANIZATION_SECTIONS.find((section) => section.id === segment);
  return known?.id ?? 'profile';
}
