import { Injectable, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { SupabaseService } from '../supabase/supabase.service';
import {
  ONE_SHOT_EXPIRY_DAYS,
  REUSABLE_DEFAULT_EXPIRY_DAYS,
  addDays,
  assertValidityWindow,
  normalizeDisplayName,
  toReusableViewModel,
} from './invites.helpers';
import type {
  CreateReusableInvitePayload,
  InviteReferralViewModel,
  InviteShareChannel,
  InviteTargetRole,
  InviteStatus,
  QrInviteRow,
  QrInviteViewModel,
  ReusableInviteViewModel,
  UpdateReusableInvitePayload,
} from './invites.types';

const INVITE_TOKEN_BYTE_LENGTH = 24;
const BYTE_VALUE_COUNT = 256;
const HEX_RADIX = 16;

@Injectable({ providedIn: 'root' })
export class InvitesService {
  private readonly supabase = inject(SupabaseService);
  private readonly authService = inject(AuthService);

  async createInviteDraft(targetRole: InviteTargetRole): Promise<QrInviteViewModel> {
    const userId = this.requireUserId();
    const organizationId = await this.resolveOrganizationId(userId);

    const token = this.generateInviteToken();
    const tokenHash = await this.sha256(token);
    const inviteUrl = this.buildInviteUrl(token);
    const expiresAt = addDays(new Date(), ONE_SHOT_EXPIRY_DAYS).toISOString();

    const { data, error } = await this.supabase.client
      .from('qr_invites')
      .insert({
        organization_id: organizationId,
        created_by: userId,
        target_role: targetRole,
        invite_url: inviteUrl,
        qr_payload: inviteUrl,
        token_hash: tokenHash,
        status: 'active' satisfies InviteStatus,
        reusable: false,
        expires_at: expiresAt,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(this.mapInviteInsertError(error?.message));
    }

    return this.toViewModel(data as QrInviteRow);
  }

  async createReusableInvite(payload: CreateReusableInvitePayload): Promise<ReusableInviteViewModel> {
    const displayName = normalizeDisplayName(payload.displayName);
    if (!displayName) {
      throw new Error('Display name is required for reusable invites.');
    }

    assertValidityWindow(payload.validFrom, payload.expiresAt);

    const userId = this.requireUserId();
    const organizationId = await this.resolveOrganizationId(userId);

    const token = this.generateInviteToken();
    const tokenHash = await this.sha256(token);
    const inviteUrl = this.buildInviteUrl(token);

    const { data, error } = await this.supabase.client
      .from('qr_invites')
      .insert({
        organization_id: organizationId,
        created_by: userId,
        target_role: payload.targetRole,
        invite_url: inviteUrl,
        qr_payload: inviteUrl,
        token_hash: tokenHash,
        status: 'active' satisfies InviteStatus,
        reusable: true,
        display_name: displayName,
        valid_from: payload.validFrom,
        expires_at: payload.expiresAt,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(this.mapInviteInsertError(error?.message));
    }

    return toReusableViewModel(data as QrInviteRow);
  }

  async listReusableInvites(): Promise<ReusableInviteViewModel[]> {
    const userId = this.requireUserId();

    const { data, error } = await this.supabase.client
      .from('qr_invites')
      .select('*')
      .eq('created_by', userId)
      .eq('reusable', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((row) => toReusableViewModel(row as QrInviteRow));
  }

  async updateReusableInvite(
    inviteId: string,
    payload: UpdateReusableInvitePayload,
  ): Promise<ReusableInviteViewModel> {
    const displayName = normalizeDisplayName(payload.displayName);
    if (!displayName) {
      throw new Error('Display name is required for reusable invites.');
    }

    const existing = await this.getReusableRow(inviteId);
    assertValidityWindow(payload.validFrom, payload.expiresAt, existing.created_at);

    const roleChanged = existing.target_role !== payload.targetRole;
    const tokenFields = roleChanged ? await this.buildTokenFields() : null;

    const nextStatus: InviteStatus = payload.paused
      ? 'revoked'
      : new Date(payload.expiresAt).getTime() > Date.now()
        ? 'active'
        : existing.status;

    const { data, error } = await this.supabase.client
      .from('qr_invites')
      .update({
        display_name: displayName,
        target_role: payload.targetRole,
        valid_from: payload.validFrom,
        expires_at: payload.expiresAt,
        status: nextStatus,
        ...(tokenFields ?? {}),
      })
      .eq('id', inviteId)
      .eq('reusable', true)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Could not update reusable invite.');
    }

    return toReusableViewModel(data as QrInviteRow);
  }

  async setReusablePaused(inviteId: string, paused: boolean): Promise<ReusableInviteViewModel> {
    const existing = await this.getReusableRow(inviteId);

    if (new Date(existing.expires_at).getTime() <= Date.now()) {
      throw new Error('Cannot pause or resume an expired invite. Extend validity first.');
    }

    const nextStatus: InviteStatus = paused ? 'revoked' : 'active';

    const { data, error } = await this.supabase.client
      .from('qr_invites')
      .update({ status: nextStatus })
      .eq('id', inviteId)
      .eq('reusable', true)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Could not update invite pause state.');
    }

    return toReusableViewModel(data as QrInviteRow);
  }

  async regenerateInvite(
    inviteId: string,
    targetRole: InviteTargetRole,
  ): Promise<QrInviteViewModel> {
    const existing = await this.getInviteRow(inviteId);

    if (existing.reusable) {
      const tokenFields = await this.buildTokenFields();
      const { data, error } = await this.supabase.client
        .from('qr_invites')
        .update({
          target_role: targetRole,
          status: 'active' satisfies InviteStatus,
          ...tokenFields,
        })
        .eq('id', inviteId)
        .eq('reusable', true)
        .select('*')
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? 'Could not regenerate reusable invite.');
      }

      return this.toViewModel(data as QrInviteRow);
    }

    await this.revokeInvite(inviteId);
    return this.createInviteDraft(targetRole);
  }

  async revokeInvite(inviteId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('qr_invites')
      .update({ status: 'revoked' satisfies InviteStatus })
      .eq('id', inviteId)
      .neq('status', 'accepted');

    if (error) {
      throw new Error(error.message);
    }
  }

  async expireInvite(inviteId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('qr_invites')
      .update({ status: 'expired' satisfies InviteStatus })
      .eq('id', inviteId)
      .eq('status', 'active');

    if (error) {
      throw new Error(error.message);
    }
  }

  async loadAcceptedReferrals(): Promise<InviteReferralViewModel[]> {
    const userId = this.requireUserId();

    const [oneShotResult, reusableResult] = await Promise.all([
      this.supabase.client
        .from('qr_invites')
        .select('id, accepted_at, accepted_user_id, target_role, profiles:accepted_user_id(full_name)')
        .eq('created_by', userId)
        .eq('status', 'accepted')
        .not('accepted_user_id', 'is', null)
        .not('accepted_at', 'is', null),
      this.supabase.client
        .from('invite_signups')
        .select(
          'joined_at, invite_id, user_id, qr_invites!inner(id, target_role, created_by), profiles:user_id(full_name)',
        )
        .eq('qr_invites.created_by', userId),
    ]);

    if (oneShotResult.error) {
      throw new Error(oneShotResult.error.message);
    }
    if (reusableResult.error) {
      throw new Error(reusableResult.error.message);
    }

    const referrals: InviteReferralViewModel[] = [];

    for (const row of oneShotResult.data ?? []) {
      const joinedAt = row.accepted_at as string | null;
      const acceptedUserId = row.accepted_user_id as string | null;
      if (!joinedAt || !acceptedUserId) {
        continue;
      }

      referrals.push({
        inviteId: row.id as string,
        userId: acceptedUserId,
        fullName: this.readProfileName(row.profiles),
        joinedAt,
        targetRole: row.target_role as InviteTargetRole,
        source: 'one-shot',
      });
    }

    for (const row of reusableResult.data ?? []) {
      const joinedAt = row.joined_at as string;
      const userIdRow = row.user_id as string;
      const inviteRaw = row.qr_invites;
      const invite = (Array.isArray(inviteRaw) ? inviteRaw[0] : inviteRaw) as {
        id: string;
        target_role: InviteTargetRole;
      };

      referrals.push({
        inviteId: invite.id,
        userId: userIdRow,
        fullName: this.readProfileName(row.profiles),
        joinedAt,
        targetRole: invite.target_role,
        source: 'reusable',
      });
    }

    referrals.sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());
    return referrals;
  }

  async logShareEvent(inviteId: string, channel: InviteShareChannel): Promise<void> {
    const actorUserId = this.requireUserId();

    const { error } = await this.supabase.client.from('invite_share_events').insert({
      invite_id: inviteId,
      actor_user_id: actorUserId,
      channel,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  defaultReusableExpiry(): string {
    return addDays(new Date(), REUSABLE_DEFAULT_EXPIRY_DAYS).toISOString();
  }

  private async getInviteRow(inviteId: string): Promise<QrInviteRow> {
    const { data, error } = await this.supabase.client
      .from('qr_invites')
      .select('*')
      .eq('id', inviteId)
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Invite not found.');
    }

    return data as QrInviteRow;
  }

  private async getReusableRow(inviteId: string): Promise<QrInviteRow> {
    const row = await this.getInviteRow(inviteId);
    if (!row.reusable) {
      throw new Error('Invite is not reusable.');
    }
    return row;
  }

  private async buildTokenFields(): Promise<{
    invite_url: string;
    qr_payload: string;
    token_hash: string;
  }> {
    const token = this.generateInviteToken();
    const tokenHash = await this.sha256(token);
    const inviteUrl = this.buildInviteUrl(token);

    return {
      invite_url: inviteUrl,
      qr_payload: inviteUrl,
      token_hash: tokenHash,
    };
  }

  private readProfileName(
    profile: { full_name: string | null } | { full_name: string | null }[] | null,
  ): string {
    if (Array.isArray(profile)) {
      return profile[0]?.full_name ?? '';
    }
    return profile?.full_name ?? '';
  }

  private async resolveOrganizationId(userId: string): Promise<string> {
    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (error || !data?.organization_id) {
      throw new Error(error?.message ?? 'Could not resolve organization context.');
    }

    return data.organization_id as string;
  }

  private requireUserId(): string {
    const userId = this.authService.user()?.id;
    if (!userId) {
      throw new Error('No authenticated session found.');
    }
    return userId;
  }

  private buildInviteUrl(token: string): string {
    if (typeof window === 'undefined') {
      return `/auth/register?invite=${encodeURIComponent(token)}`;
    }

    return `${window.location.origin}/auth/register?invite=${encodeURIComponent(token)}`;
  }

  private generateInviteToken(): string {
    const bytes = new Uint8Array(INVITE_TOKEN_BYTE_LENGTH);
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      crypto.getRandomValues(bytes);
    } else {
      for (let index = 0; index < bytes.length; index += 1) {
        bytes[index] = Math.floor(Math.random() * BYTE_VALUE_COUNT);
      }
    }

    return Array.from(bytes, (value) => value.toString(HEX_RADIX).padStart(2, '0')).join('');
  }

  private async sha256(value: string): Promise<string> {
    if (typeof crypto === 'undefined' || typeof crypto.subtle === 'undefined') {
      throw new Error(
        'Secure hashing is unavailable in this environment (Web Crypto requires a secure context).',
      );
    }

    const encoder = new TextEncoder();
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
    const digestBytes = new Uint8Array(digest);
    return Array.from(digestBytes, (byte) => byte.toString(HEX_RADIX).padStart(2, '0')).join('');
  }

  private toViewModel(row: QrInviteRow): QrInviteViewModel {
    return {
      inviteId: row.id,
      organizationId: row.organization_id,
      createdBy: row.created_by,
      targetRole: row.target_role,
      inviteUrl: row.invite_url,
      qrPayload: row.qr_payload,
      tokenHash: row.token_hash,
      status: row.status,
      expiresAt: row.expires_at,
      acceptedAt: row.accepted_at,
      acceptedUserId: row.accepted_user_id,
      reusable: row.reusable,
      validFrom: row.valid_from,
      displayName: row.display_name,
      createdAt: row.created_at,
    };
  }

  private mapInviteInsertError(message?: string): string {
    if (!message) {
      return 'Could not create invite draft.';
    }

    const lower = message.toLowerCase();
    if (lower.includes('row-level security') || lower.includes('violates row-level security')) {
      return 'You do not have permission to create invites in this organization.';
    }

    return message;
  }
}
