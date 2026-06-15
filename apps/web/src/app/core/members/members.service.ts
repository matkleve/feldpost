import { Injectable, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { SupabaseService } from '../supabase/supabase.service';
import type { OrgMember } from './members.types';

@Injectable({ providedIn: 'root' })
export class MemberService {
  private readonly supabase = inject(SupabaseService);
  private readonly authService = inject(AuthService);

  async loadMembers(): Promise<{ data: OrgMember[]; error: Error | null }> {
    const { data: profiles, error: profilesError } = await this.supabase.client
      .from('profiles')
      .select('id, full_name, avatar_url, created_at, suspended_at')
      .is('removed_at', null)
      .order('full_name');

    if (profilesError) {
      return { data: [], error: new Error(profilesError.message) };
    }

    const { data: roleRows, error: rolesError } = await this.supabase.client
      .from('user_roles')
      .select('user_id, org_roles(id, name, display_name, level, color)');

    if (rolesError) {
      return { data: [], error: new Error(rolesError.message) };
    }

    const roleByUser = new Map<string, Record<string, unknown>>();
    for (const row of roleRows ?? []) {
      const orgRole = row.org_roles as Record<string, unknown> | Array<Record<string, unknown>> | null;
      const resolved = Array.isArray(orgRole) ? orgRole[0] : orgRole;
      if (resolved) {
        roleByUser.set(row.user_id as string, resolved);
      }
    }

    const members: OrgMember[] = (profiles ?? []).map((profile) => {
      const role = roleByUser.get(profile.id as string);
      return {
        id: profile.id as string,
        fullName: (profile.full_name as string | null) ?? '',
        avatarUrl: (profile.avatar_url as string | null) ?? null,
        email: null,
        roleId: (role?.['id'] as string) ?? '',
        roleName: (role?.['name'] as string) ?? 'worker',
        roleDisplayName: (role?.['display_name'] as string) ?? 'Worker',
        roleLevel: (role?.['level'] as number) ?? 0,
        roleColor: (role?.['color'] as string | null) ?? null,
        createdAt: profile.created_at as string,
        suspendedAt: (profile.suspended_at as string | null) ?? null,
      };
    });

    return { data: members, error: null };
  }

  async assignRole(targetUserId: string, orgRoleId: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client.rpc('assign_org_member_role', {
      p_target_user_id: targetUserId,
      p_org_role_id: orgRoleId,
    });

    return { error: error ? new Error(error.message) : null };
  }

  async suspendMember(targetUserId: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client.rpc('suspend_org_member', {
      p_target_user_id: targetUserId,
    });

    return { error: error ? new Error(error.message) : null };
  }

  async unsuspendMember(targetUserId: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client.rpc('unsuspend_org_member', {
      p_target_user_id: targetUserId,
    });

    return { error: error ? new Error(error.message) : null };
  }

  async removeMember(targetUserId: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client.rpc('remove_org_member', {
      p_target_user_id: targetUserId,
    });

    return { error: error ? new Error(error.message) : null };
  }

  isSelf(memberId: string): boolean {
    return this.authService.user()?.id === memberId;
  }
}
