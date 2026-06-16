export type InviteTargetRole = 'clerk' | 'worker';

export type InviteStatus = 'active' | 'expired' | 'revoked' | 'accepted';

export type InvitePanelMode = 'loading' | 'ready' | 'error';

export type InviteShareChannel = 'copy-link' | 'email' | 'whatsapp';

export type InviteOpenContext = 'settings' | 'command';

export type InviteEditorMode = 'quickDraft' | 'editReusable';

export type ReusableInviteStatus = 'active' | 'scheduled' | 'paused' | 'expired';

export interface QrInviteRow {
  id: string;
  organization_id: string;
  created_by: string;
  target_role: InviteTargetRole;
  invite_url: string;
  qr_payload: string;
  token_hash: string;
  status: InviteStatus;
  expires_at: string;
  accepted_at: string | null;
  accepted_user_id: string | null;
  created_at: string;
  updated_at: string;
  reusable: boolean;
  valid_from: string | null;
  display_name: string | null;
}

export interface QrInviteViewModel {
  inviteId: string;
  organizationId: string;
  createdBy: string;
  targetRole: InviteTargetRole;
  inviteUrl: string;
  qrPayload: string;
  tokenHash: string;
  status: InviteStatus;
  expiresAt: string;
  acceptedAt: string | null;
  acceptedUserId: string | null;
  reusable: boolean;
  validFrom: string | null;
  displayName: string | null;
  createdAt: string;
}

export interface ReusableInviteViewModel extends QrInviteViewModel {
  reusable: true;
  displayName: string;
  derivedStatus: ReusableInviteStatus;
}

export interface CreateReusableInvitePayload {
  displayName: string;
  targetRole: InviteTargetRole;
  validFrom: string | null;
  expiresAt: string;
}

export interface UpdateReusableInvitePayload {
  displayName: string;
  targetRole: InviteTargetRole;
  validFrom: string | null;
  expiresAt: string;
  paused: boolean;
}

export interface ReusableInviteEditDraft {
  inviteId: string;
  displayName: string;
  targetRole: InviteTargetRole;
  validFrom: string | null;
  expiresAt: string;
  paused: boolean;
  inviteUrl: string;
  qrPayload: string;
  status: InviteStatus;
  derivedStatus: ReusableInviteStatus;
  previousTargetRole: InviteTargetRole;
}

export interface InviteReferralViewModel {
  inviteId: string;
  userId: string;
  fullName: string;
  joinedAt: string;
  targetRole: InviteTargetRole;
  source: 'one-shot' | 'reusable';
}

export interface ValidityPreset {
  id: string;
  labelKey: string;
  labelFallback: string;
  validFrom: string | null;
  expiresAt: string;
}
