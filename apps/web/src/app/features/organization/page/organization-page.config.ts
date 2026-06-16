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
  subtitleKey: string;
  subtitleFallback: string;
  /** When set, section is hidden unless the user has this permission. */
  viewPermissionKey?: string;
  /** When set, write actions require this permission (read may still be allowed). */
  editPermissionKey?: string;
}

export const ORGANIZATION_SECTIONS: readonly OrganizationSectionConfig[] = [
  {
    id: 'profile',
    icon: 'business',
    labelKey: 'organization.section.profile',
    labelFallback: 'Profile',
    subtitleKey: 'organization.section.profile.subtitle',
    subtitleFallback: 'Company identity and contact details',
    editPermissionKey: 'org.settings.edit',
  },
  {
    id: 'roles',
    icon: 'admin_panel_settings',
    labelKey: 'organization.section.roles',
    labelFallback: 'Roles & Permissions',
    subtitleKey: 'organization.section.roles.subtitle',
    subtitleFallback: 'Hierarchy and capability matrix',
    editPermissionKey: 'org.roles.manage',
  },
  {
    id: 'branding',
    icon: 'palette',
    labelKey: 'organization.section.branding',
    labelFallback: 'Branding',
    subtitleKey: 'organization.section.branding.subtitle',
    subtitleFallback: 'Theme colors for your workspace',
    editPermissionKey: 'org.settings.edit',
  },
  {
    id: 'billing',
    icon: 'payments',
    labelKey: 'organization.section.billing',
    labelFallback: 'Billing',
    subtitleKey: 'organization.section.billing.subtitle',
    subtitleFallback: 'Plan limits and invoices',
  },
  {
    id: 'integrations',
    icon: 'api',
    labelKey: 'organization.section.integrations',
    labelFallback: 'API Keys',
    subtitleKey: 'organization.section.integrations.subtitle',
    subtitleFallback: 'Integration credentials',
    editPermissionKey: 'org.api_keys.manage',
  },
  {
    id: 'export',
    icon: 'download',
    labelKey: 'organization.section.export',
    labelFallback: 'Data Export',
    subtitleKey: 'organization.section.export.subtitle',
    subtitleFallback: 'Download organization data',
    viewPermissionKey: 'org.export',
    editPermissionKey: 'org.export',
  },
  {
    id: 'audit',
    icon: 'history',
    labelKey: 'organization.section.audit',
    labelFallback: 'Audit Log',
    subtitleKey: 'organization.section.audit.subtitle',
    subtitleFallback: 'Recent admin actions',
    viewPermissionKey: 'org.settings.edit',
  },
];

export function resolveOrganizationSectionFromUrl(url: string): OrganizationSectionId {
  const match = url.match(/^\/organization\/([^/?#]+)/);
  const segment = match?.[1] ?? 'profile';
  const known = ORGANIZATION_SECTIONS.find((section) => section.id === segment);
  return known?.id ?? 'profile';
}

export function resolveOrganizationSectionConfig(
  sectionId: OrganizationSectionId,
): OrganizationSectionConfig {
  return ORGANIZATION_SECTIONS.find((section) => section.id === sectionId) ?? ORGANIZATION_SECTIONS[0];
}
