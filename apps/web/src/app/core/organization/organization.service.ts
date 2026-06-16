import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import type {
  OrgApiKey,
  OrgAuditEntry,
  OrgBranding,
  OrgExportJob,
  OrgInvoice,
  OrganizationProfile,
  OrgSubscription,
  UpdateOrganizationProfileInput,
} from './organization.types';

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private readonly supabase = inject(SupabaseService);

  async loadProfile(): Promise<{ data: OrganizationProfile | null; error: Error | null }> {
    const { data, error } = await this.supabase.client.from('organizations').select('*').single();

    if (error || !data) {
      return { data: null, error: new Error(error?.message ?? 'Could not load organization.') };
    }

    return { data: this.toProfile(data), error: null };
  }

  async updateProfile(
    input: UpdateOrganizationProfileInput,
  ): Promise<{ data: OrganizationProfile | null; error: Error | null }> {
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch['name'] = input.name;
    if (input.logoUrl !== undefined) patch['logo_url'] = input.logoUrl;
    if (input.addressLine1 !== undefined) patch['address_line1'] = input.addressLine1;
    if (input.addressLine2 !== undefined) patch['address_line2'] = input.addressLine2;
    if (input.city !== undefined) patch['city'] = input.city;
    if (input.postalCode !== undefined) patch['postal_code'] = input.postalCode;
    if (input.country !== undefined) patch['country'] = input.country;
    if (input.phone !== undefined) patch['phone'] = input.phone;
    if (input.email !== undefined) patch['email'] = input.email;
    if (input.website !== undefined) patch['website'] = input.website;
    if (input.description !== undefined) patch['description'] = input.description;
    if (input.industry !== undefined) patch['industry'] = input.industry;

    const { data, error } = await this.supabase.client
      .from('organizations')
      .update(patch)
      .select('*')
      .single();

    if (error || !data) {
      return { data: null, error: new Error(error?.message ?? 'Could not update organization.') };
    }

    return { data: this.toProfile(data), error: null };
  }

  async uploadOrganizationLogo(file: File): Promise<{ data: string | null; error: Error | null }> {
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);
    if (!allowed.has(file.type)) {
      return { data: null, error: new Error('Unsupported logo file type.') };
    }
    if (file.size > 2 * 1024 * 1024) {
      return { data: null, error: new Error('Logo must be 2 MB or smaller.') };
    }

    const profile = await this.loadProfile();
    if (!profile.data) {
      return { data: null, error: profile.error ?? new Error('Organization missing.') };
    }

    const orgId = profile.data.id;
    const ext = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/svg+xml' ? 'svg' : file.type.split('/')[1] ?? 'png';
    const path = `${orgId}/logo.${ext}`;

    const { error: uploadError } = await this.supabase.client.storage
      .from('org-branding')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      return { data: null, error: new Error(uploadError.message) };
    }

    const { data: publicData } = this.supabase.client.storage.from('org-branding').getPublicUrl(path);
    const cacheBustedUrl = `${publicData.publicUrl}?v=${Date.now()}`;
    const update = await this.updateProfile({ logoUrl: cacheBustedUrl });
    if (update.error) {
      return { data: null, error: update.error };
    }

    return { data: cacheBustedUrl, error: null };
  }

  async removeOrganizationLogo(): Promise<{ error: Error | null }> {
    const profile = await this.loadProfile();
    if (!profile.data) {
      return { error: profile.error ?? new Error('Organization missing.') };
    }

    const orgId = profile.data.id;
    await this.supabase.client.storage
      .from('org-branding')
      .remove(['png', 'jpg', 'jpeg', 'webp', 'svg'].map((ext) => `${orgId}/logo.${ext}`));

    const update = await this.updateProfile({ logoUrl: null });
    return { error: update.error };
  }

  async loadBranding(): Promise<{ data: OrgBranding | null; error: Error | null }> {
    const { data, error } = await this.supabase.client.from('org_branding').select('*').maybeSingle();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    if (!data) {
      return { data: null, error: null };
    }

    return {
      data: {
        organizationId: data.organization_id as string,
        primaryColor: (data.primary_color as string | null) ?? null,
        accentColor: (data.accent_color as string | null) ?? null,
        backgroundColor: (data.background_color as string | null) ?? null,
      },
      error: null,
    };
  }

  async saveBranding(branding: Omit<OrgBranding, 'organizationId'>): Promise<{ error: Error | null }> {
    const profile = await this.loadProfile();
    if (!profile.data) {
      return { error: profile.error ?? new Error('Organization missing.') };
    }

    const { error } = await this.supabase.client.from('org_branding').upsert({
      organization_id: profile.data.id,
      primary_color: branding.primaryColor,
      accent_color: branding.accentColor,
      background_color: branding.backgroundColor,
    });

    return { error: error ? new Error(error.message) : null };
  }

  async loadSubscription(): Promise<{ data: OrgSubscription | null; error: Error | null }> {
    const { data, error } = await this.supabase.client.from('org_subscriptions').select('*').maybeSingle();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    if (!data) {
      return { data: null, error: null };
    }

    return {
      data: {
        organizationId: data.organization_id as string,
        planName: data.plan_name as string,
        status: data.status as string,
        storageLimitMb: data.storage_limit_mb as number,
        memberLimit: data.member_limit as number,
      },
      error: null,
    };
  }

  async loadInvoices(): Promise<{ data: OrgInvoice[]; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('org_invoices')
      .select('*')
      .order('issued_at', { ascending: false });

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    return {
      data: (data ?? []).map((row) => ({
        id: row.id as string,
        amountCents: row.amount_cents as number,
        currency: row.currency as string,
        status: row.status as string,
        issuedAt: row.issued_at as string,
      })),
      error: null,
    };
  }

  async loadApiKeys(): Promise<{ data: OrgApiKey[]; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('org_api_keys')
      .select('*')
      .is('revoked_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    return {
      data: (data ?? []).map((row) => ({
        id: row.id as string,
        name: row.name as string,
        keyPrefix: row.key_prefix as string,
        permissions: (row.permissions as string[]) ?? [],
        expiresAt: (row.expires_at as string | null) ?? null,
        lastUsedAt: (row.last_used_at as string | null) ?? null,
        revokedAt: (row.revoked_at as string | null) ?? null,
        createdAt: row.created_at as string,
      })),
      error: null,
    };
  }

  async createApiKey(name: string): Promise<{ data: { key: string; apiKey: OrgApiKey } | null; error: Error | null }> {
    const profile = await this.loadProfile();
    if (!profile.data) {
      return { data: null, error: profile.error ?? new Error('Organization missing.') };
    }

    const rawKey = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    const keyPrefix = rawKey.slice(0, 8);
    const keyHash = await this.sha256(rawKey);

    const { data, error } = await this.supabase.client
      .from('org_api_keys')
      .insert({
        organization_id: profile.data.id,
        name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        permissions: [],
      })
      .select('*')
      .single();

    if (error || !data) {
      return { data: null, error: new Error(error?.message ?? 'Could not create API key.') };
    }

    return {
      data: {
        key: rawKey,
        apiKey: {
          id: data.id as string,
          name: data.name as string,
          keyPrefix: data.key_prefix as string,
          permissions: [],
          expiresAt: null,
          lastUsedAt: null,
          revokedAt: null,
          createdAt: data.created_at as string,
        },
      },
      error: null,
    };
  }

  async revokeApiKey(keyId: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client
      .from('org_api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', keyId);

    return { error: error ? new Error(error.message) : null };
  }

  async requestExport(format: 'json' | 'csv' = 'json'): Promise<{ data: OrgExportJob | null; error: Error | null }> {
    const profile = await this.loadProfile();
    if (!profile.data) {
      return { data: null, error: profile.error ?? new Error('Organization missing.') };
    }

    const { data, error } = await this.supabase.client
      .from('org_export_jobs')
      .insert({ organization_id: profile.data.id, format, status: 'pending' })
      .select('*')
      .single();

    if (error || !data) {
      return { data: null, error: new Error(error?.message ?? 'Could not start export.') };
    }

    return this.processExportJob(data.id as string);
  }

  async processExportJob(jobId: string): Promise<{ data: OrgExportJob | null; error: Error | null }> {
    const { data, error } = await this.supabase.client.rpc('process_org_export_job', {
      p_job_id: jobId,
    });

    if (error || !data) {
      return { data: null, error: new Error(error?.message ?? 'Could not process export.') };
    }

    return { data: this.toExportJob(data as Record<string, unknown>), error: null };
  }

  async loadExportJobs(): Promise<{ data: OrgExportJob[]; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('org_export_jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    return {
      data: (data ?? []).map((row) => this.toExportJob(row as Record<string, unknown>)),
      error: null,
    };
  }

  async loadAuditLog(limit = 100): Promise<{ data: OrgAuditEntry[]; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('org_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    return {
      data: (data ?? []).map((row) => ({
        id: row.id as string,
        userId: (row.user_id as string | null) ?? null,
        action: row.action as string,
        entityType: row.entity_type as string,
        entityId: (row.entity_id as string | null) ?? null,
        metadata: (row.metadata as Record<string, unknown>) ?? {},
        createdAt: row.created_at as string,
      })),
      error: null,
    };
  }

  private toExportJob(row: Record<string, unknown>): OrgExportJob {
    return {
      id: row['id'] as string,
      status: row['status'] as string,
      format: row['format'] as string,
      downloadUrl: (row['download_url'] as string | null) ?? null,
      payload: (row['payload'] as Record<string, unknown> | null) ?? null,
      createdAt: row['created_at'] as string,
      completedAt: (row['completed_at'] as string | null) ?? null,
      expiresAt: (row['expires_at'] as string | null) ?? null,
    };
  }

  private toProfile(row: Record<string, unknown>): OrganizationProfile {
    return {
      id: row['id'] as string,
      name: row['name'] as string,
      logoUrl: (row['logo_url'] as string | null) ?? null,
      addressLine1: (row['address_line1'] as string | null) ?? null,
      addressLine2: (row['address_line2'] as string | null) ?? null,
      city: (row['city'] as string | null) ?? null,
      postalCode: (row['postal_code'] as string | null) ?? null,
      country: (row['country'] as string | null) ?? null,
      phone: (row['phone'] as string | null) ?? null,
      email: (row['email'] as string | null) ?? null,
      website: (row['website'] as string | null) ?? null,
      description: (row['description'] as string | null) ?? null,
      industry: (row['industry'] as string | null) ?? null,
      createdAt: row['created_at'] as string,
    };
  }

  private async sha256(value: string): Promise<string> {
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }
}
