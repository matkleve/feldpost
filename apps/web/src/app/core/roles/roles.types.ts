export interface OrgPermission {
  id: string;
  key: string;
  description: string;
  category: string;
}

export interface OrgRole {
  id: string;
  organizationId: string;
  name: string;
  displayName: string;
  level: number;
  isSystem: boolean;
  isDefault: boolean;
  color: string | null;
  memberCount?: number;
}

export interface RolePermissionAssignment {
  roleId: string;
  permissionId: string;
  permissionKey: string;
}

export interface CreateOrgRoleInput {
  name: string;
  displayName: string;
  level: number;
  color?: string | null;
}

export interface UpdateOrgRoleInput {
  displayName?: string;
  level?: number;
  color?: string | null;
  isDefault?: boolean;
}
