export interface OrganizationProfile {
  id: string;
  name: string;
  logoUrl: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  industry: string | null;
  createdAt: string;
}

export interface OrgBranding {
  organizationId: string;
  primaryColor: string | null;
  accentColor: string | null;
  backgroundColor: string | null;
}

export interface OrgSubscription {
  organizationId: string;
  planName: string;
  status: string;
  storageLimitMb: number;
  memberLimit: number;
}

export interface OrgInvoice {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  issuedAt: string;
}

export interface OrgApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface OrgExportJob {
  id: string;
  status: string;
  format: string;
  downloadUrl: string | null;
  createdAt: string;
  completedAt: string | null;
  expiresAt: string | null;
}

export interface OrgAuditEntry {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface UpdateOrganizationProfileInput {
  name?: string;
  logoUrl?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  description?: string | null;
  industry?: string | null;
}
