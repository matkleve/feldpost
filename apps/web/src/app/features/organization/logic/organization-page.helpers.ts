import type { OrganizationSectionConfig } from '../page/organization-page.config';

/** Permission keys checked once on organization page load. */
export const ORG_PAGE_PERMISSION_KEYS = [
  'org.settings.edit',
  'org.roles.manage',
  'org.billing.view',
  'org.api_keys.manage',
  'org.export',
] as const;

export type OrgPagePermissionKey = (typeof ORG_PAGE_PERMISSION_KEYS)[number];

export function filterOrganizationSections(
  sections: readonly OrganizationSectionConfig[],
  granted: ReadonlySet<string>,
): OrganizationSectionConfig[] {
  return sections.filter(
    (section) => !section.viewPermissionKey || granted.has(section.viewPermissionKey),
  );
}
