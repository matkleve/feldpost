import type { OrgPermission, OrgRole } from './roles.types';

export function groupPermissionsByCategory(
  permissions: readonly OrgPermission[],
): Map<string, OrgPermission[]> {
  const grouped = new Map<string, OrgPermission[]>();
  for (const permission of permissions) {
    const list = grouped.get(permission.category) ?? [];
    list.push(permission);
    grouped.set(permission.category, list);
  }
  return grouped;
}

export function sortRolesByLevel(roles: readonly OrgRole[]): OrgRole[] {
  return [...roles].sort((a, b) => b.level - a.level);
}

export function canAssignRole(actorLevel: number, targetRoleLevel: number): boolean {
  return actorLevel >= targetRoleLevel;
}
