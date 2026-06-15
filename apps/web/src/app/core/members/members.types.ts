export interface OrgMember {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  email: string | null;
  roleId: string;
  roleName: string;
  roleDisplayName: string;
  roleLevel: number;
  roleColor: string | null;
  createdAt: string;
  suspendedAt: string | null;
  isOnline?: boolean;
}
