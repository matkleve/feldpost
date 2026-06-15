import { Injectable, inject } from '@angular/core';
import { UserProfileService } from '../user-profile/user-profile.service';
import { SupabaseService } from '../supabase/supabase.service';
import type {
  CreateOrgRoleInput,
  OrgPermission,
  OrgRole,
  UpdateOrgRoleInput,
} from './roles.types';

interface OrgRoleRow {
  id: string;
  organization_id: string;
  name: string;
  display_name: string;
  level: number;
  is_system: boolean;
  is_default: boolean;
  color: string | null;
}

interface OrgPermissionRow {
  id: string;
  key: string;
  description: string;
  category: string;
}

@Injectable({ providedIn: 'root' })
export class RoleService {
  private readonly supabase = inject(SupabaseService);
  private readonly userProfileService = inject(UserProfileService);

  async loadRoles(): Promise<{ data: OrgRole[]; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('org_roles')
      .select('*')
      .order('level', { ascending: false });

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    return { data: (data as OrgRoleRow[]).map((row) => this.toRole(row)), error: null };
  }

  async loadPermissions(): Promise<{ data: OrgPermission[]; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('org_permissions')
      .select('*')
      .order('category')
      .order('key');

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    return {
      data: (data as OrgPermissionRow[]).map((row) => ({
        id: row.id,
        key: row.key,
        description: row.description,
        category: row.category,
      })),
      error: null,
    };
  }

  async loadRolePermissionIds(roleId: string): Promise<{ data: string[]; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('org_role_permissions')
      .select('permission_id')
      .eq('role_id', roleId);

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    return {
      data: (data ?? []).map((row) => row.permission_id as string),
      error: null,
    };
  }

  async updateRolePermissions(
    roleId: string,
    permissionIds: readonly string[],
  ): Promise<{ error: Error | null }> {
    const { error: deleteError } = await this.supabase.client
      .from('org_role_permissions')
      .delete()
      .eq('role_id', roleId);

    if (deleteError) {
      return { error: new Error(deleteError.message) };
    }

    if (permissionIds.length === 0) {
      return { error: null };
    }

    const { error: insertError } = await this.supabase.client.from('org_role_permissions').insert(
      permissionIds.map((permissionId) => ({
        role_id: roleId,
        permission_id: permissionId,
      })),
    );

    if (insertError) {
      return { error: new Error(insertError.message) };
    }

    return { error: null };
  }

  async createRole(input: CreateOrgRoleInput): Promise<{ data: OrgRole | null; error: Error | null }> {
    const profile = await this.userProfileService.getOwnProfile();
    const organizationId = profile.data?.organizationId;
    if (!organizationId) {
      return { data: null, error: new Error('Organization context missing.') };
    }

    const { data, error } = await this.supabase.client
      .from('org_roles')
      .insert({
        organization_id: organizationId,
        name: input.name,
        display_name: input.displayName,
        level: input.level,
        color: input.color ?? null,
        is_system: false,
        is_default: false,
      })
      .select('*')
      .single();

    if (error || !data) {
      return { data: null, error: new Error(error?.message ?? 'Could not create role.') };
    }

    return { data: this.toRole(data as OrgRoleRow), error: null };
  }

  async updateRole(
    roleId: string,
    input: UpdateOrgRoleInput,
  ): Promise<{ data: OrgRole | null; error: Error | null }> {
    const patch: Record<string, unknown> = {};
    if (input.displayName !== undefined) patch['display_name'] = input.displayName;
    if (input.level !== undefined) patch['level'] = input.level;
    if (input.color !== undefined) patch['color'] = input.color;
    if (input.isDefault !== undefined) patch['is_default'] = input.isDefault;

    const { data, error } = await this.supabase.client
      .from('org_roles')
      .update(patch)
      .eq('id', roleId)
      .eq('is_system', false)
      .select('*')
      .single();

    if (error || !data) {
      return { data: null, error: new Error(error?.message ?? 'Could not update role.') };
    }

    return { data: this.toRole(data as OrgRoleRow), error: null };
  }

  async deleteRole(roleId: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client
      .from('org_roles')
      .delete()
      .eq('id', roleId)
      .eq('is_system', false);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  }

  async getOwnRoleLevel(): Promise<number> {
    const { data, error } = await this.supabase.client.rpc('user_role_level');
    if (error || data === null || data === undefined) {
      return 0;
    }
    return Number(data);
  }

  async canManageUser(targetUserId: string): Promise<boolean> {
    const { data, error } = await this.supabase.client.rpc('can_manage_user', {
      p_target_user_id: targetUserId,
    });
    return !error && data === true;
  }

  private toRole(row: OrgRoleRow): OrgRole {
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      displayName: row.display_name,
      level: row.level,
      isSystem: row.is_system,
      isDefault: row.is_default,
      color: row.color,
    };
  }
}
