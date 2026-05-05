import { Injectable, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { SupabaseService } from '../supabase/supabase.service';
import type {
  InviteShareChannel,
  InviteTargetRole,
  InviteStatus,
  QrInviteRow,
  QrInviteViewModel,
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
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(this.mapInviteInsertError(error?.message));
    }

    return this.toViewModel(data as QrInviteRow);
  }

  async regenerateInvite(
    inviteId: string,
    targetRole: InviteTargetRole,
  ): Promise<QrInviteViewModel> {
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
