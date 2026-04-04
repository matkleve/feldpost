import { Injectable, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { SupabaseService } from '../supabase/supabase.service';

export interface UserProfileSnapshot {
  fullName: string;
  organizationId: string | null;
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class UserProfileService {
  private readonly supabase = inject(SupabaseService);
  private readonly authService = inject(AuthService);

  async getOwnProfile(): Promise<{ data: UserProfileSnapshot | null; error: Error | null }> {
    const userId = this.authService.user()?.id;
    if (!userId) {
      return { data: null, error: new Error('No authenticated session found.') };
    }

    const { data: profile, error: profileError } = await this.supabase.client
      .from('profiles')
      .select('full_name, organization_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return { data: null, error: new Error(profileError?.message ?? 'Could not load profile.') };
    }

    const { data: roleRows, error: rolesError } = await this.supabase.client
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', userId);

    if (rolesError) {
      return { data: null, error: new Error(rolesError.message) };
    }

    const roles = (roleRows ?? [])
      .map((row) => {
        const rolePayload = row.roles as { name?: string } | Array<{ name?: string }> | null;
        if (!rolePayload) return null;
        if (Array.isArray(rolePayload)) {
          return rolePayload[0]?.name ?? null;
        }
        return rolePayload.name ?? null;
      })
      .filter((value): value is string => typeof value === 'string' && value.length > 0);

    return {
      data: {
        fullName: profile.full_name ?? '',
        organizationId: profile.organization_id ?? null,
        roles,
      },
      error: null,
    };
  }

  async updateDisplayName(fullName: string): Promise<{ error: Error | null }> {
    const userId = this.authService.user()?.id;
    if (!userId) {
      return { error: new Error('No authenticated session found.') };
    }

    const { error } = await this.supabase.client
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', userId);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  }
}
