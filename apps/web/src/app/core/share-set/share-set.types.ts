/** Who may use the link; enforced inside `resolve_share_set` only. */
export type ShareLinkAudience = 'public' | 'organization' | 'named';

/** Share-mediated capability; v1 is view-only (listing via resolve). */
export type ShareLinkGrant = 'view';

/** Result of the share-audience dialog (creation path). */
export interface ShareAudienceDialogResult {
  audience: ShareLinkAudience;
  shareGrant: ShareLinkGrant;
  recipientUserIds: string[];
}

export interface ShareSetCreateOptions {
  expiresAt?: string;
  audience?: ShareLinkAudience;
  shareGrant?: ShareLinkGrant;
  recipientUserIds?: string[];
}

export interface ShareSetCreateResult {
  shareSetId: string;
  token: string;
  expiresAt: string;
}

export interface ShareSetItem {
  shareSetId: string;
  mediaId: string;
  itemOrder: number;
}
