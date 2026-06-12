export type InviteTargetRole = 'clerk' | 'worker';

export type InviteStatus = 'active' | 'expired' | 'revoked' | 'accepted';

export type InvitePanelMode = 'loading' | 'ready' | 'error';

export type InviteShareChannel = 'copy-link' | 'email' | 'whatsapp';

export type InviteOpenContext = 'settings' | 'command';

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
}



