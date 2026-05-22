/**
 * Org-level search tuning — load, merge, admin save, reset.
 * @see docs/specs/ui/search-bar/search-tuning-settings.md
 */

import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { SupabaseService } from '../supabase/supabase.service';
import { UserProfileService } from '../user-profile/user-profile.service';
import { resolveOrgSearchConfig } from './resolve-org-search-config';
import { SEARCH_TUNING_SYSTEM_DEFAULTS } from './search-tuning.defaults';
import type { SearchTuningConfig, SearchTuningValuesJson } from './search-tuning.types';

export type OrgSearchTuningSaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'save_error';

@Injectable({ providedIn: 'root' })
export class OrgSearchTuningService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);
  private readonly profiles = inject(UserProfileService);

  private readonly _orgId = signal<string | null>(null);
  private readonly _orgSearchConfig = signal<SearchTuningConfig>(
    structuredClone(SEARCH_TUNING_SYSTEM_DEFAULTS),
  );
  private readonly _persistedValues = signal<SearchTuningValuesJson | null>(null);
  private readonly _isOrgAdmin = signal(false);

  readonly orgSearchConfig = this._orgSearchConfig.asReadonly();
  readonly persistedValues = this._persistedValues.asReadonly();
  readonly isOrgAdmin = this._isOrgAdmin.asReadonly();

  readonly canEdit = computed(() => this._isOrgAdmin());

  async bootstrapFromSession(): Promise<void> {
    const profile = await this.profiles.getOwnProfile();
    const orgId = profile.data?.organizationId ?? null;
    const roles = profile.data?.roles ?? [];
    this._isOrgAdmin.set(roles.includes('admin'));
    if (orgId) {
      await this.loadForOrganization(orgId);
    }
  }

  async loadForOrganization(orgId: string): Promise<SearchTuningConfig> {
    this._orgId.set(orgId);
    const { data, error } = await this.supabase.client
      .from('org_search_tuning_profiles')
      .select('organization_id, settings_version, values_json, updated_at, updated_by')
      .eq('organization_id', orgId)
      .maybeSingle();

    if (error) {
      console.warn('[OrgSearchTuningService] load failed', error.message);
      const fallback = resolveOrgSearchConfig(orgId, null, null);
      this._orgSearchConfig.set(fallback);
      this._persistedValues.set(null);
      return fallback;
    }

    const values = (data?.values_json as SearchTuningValuesJson | null) ?? null;
    const merged = resolveOrgSearchConfig(orgId, values, data?.settings_version ?? null);
    this._orgSearchConfig.set(merged);
    this._persistedValues.set(values);
    return merged;
  }

  /** Admin-only: upsert partial overrides (validated against allowed top-level keys). */
  async saveOrgProfile(partial: SearchTuningValuesJson): Promise<void> {
    this.assertAdminWrite();
    const orgId = this.requireOrgId();
    const userId = this.auth.user()?.id;
    if (!userId) throw new Error('Not authenticated');

    const nextValues = this.mergePartialOverrides(this._persistedValues(), partial);
    const { error } = await this.supabase.client.from('org_search_tuning_profiles').upsert({
      organization_id: orgId,
      settings_version: SEARCH_TUNING_SYSTEM_DEFAULTS.settingsVersion,
      values_json: nextValues,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    });

    if (error) throw new Error(error.message);
    this._persistedValues.set(nextValues);
    this._orgSearchConfig.set(resolveOrgSearchConfig(orgId, nextValues, SEARCH_TUNING_SYSTEM_DEFAULTS.settingsVersion));
  }

  /** Admin-only Revert B: delete org row; next read uses system defaults. */
  async resetToDefaults(): Promise<void> {
    this.assertAdminWrite();
    const orgId = this.requireOrgId();
    const { error } = await this.supabase.client
      .from('org_search_tuning_profiles')
      .delete()
      .eq('organization_id', orgId);
    if (error) throw new Error(error.message);
    this._persistedValues.set(null);
    this._orgSearchConfig.set(resolveOrgSearchConfig(orgId, null, null));
  }

  private assertAdminWrite(): void {
    if (!this._isOrgAdmin()) {
      throw new Error('Org search tuning writes require admin role');
    }
  }

  private requireOrgId(): string {
    const orgId = this._orgId();
    if (!orgId) throw new Error('Organization context not loaded');
    return orgId;
  }

  private mergePartialOverrides(
    current: SearchTuningValuesJson | null,
    partial: SearchTuningValuesJson,
  ): SearchTuningValuesJson {
    const base: SearchTuningValuesJson = current ? structuredClone(current) : {};
    for (const key of Object.keys(partial) as (keyof SearchTuningValuesJson)[]) {
      const patch = partial[key];
      if (!patch) continue;
      base[key] = { ...(base[key] ?? {}), ...patch } as never;
    }
    return base;
  }
}
