import type {
  QrInviteRow,
  ReusableInviteStatus,
  ReusableInviteViewModel,
  ValidityPreset,
} from './invites.types';

export const ONE_SHOT_EXPIRY_DAYS = 7;
export const REUSABLE_DEFAULT_EXPIRY_DAYS = 30;
export const MAX_VALIDITY_DAYS = 365;
export const DISPLAY_NAME_MAX_LENGTH = 80;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const VIENNA_TZ = 'Europe/Vienna';

export function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * MS_PER_DAY);
}

export function assertValidityWindow(
  validFrom: string | null,
  expiresAt: string,
  createdAt?: string | null,
  now: Date = new Date(),
): void {
  const effectiveStart = validFrom
    ? new Date(validFrom)
    : createdAt
      ? new Date(createdAt)
      : now;
  const end = new Date(expiresAt);

  if (Number.isNaN(effectiveStart.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Invalid validity window.');
  }

  if (end.getTime() <= effectiveStart.getTime()) {
    throw new Error('Expiry must be after the effective start.');
  }

  const spanDays = (end.getTime() - effectiveStart.getTime()) / MS_PER_DAY;
  if (spanDays > MAX_VALIDITY_DAYS) {
    throw new Error(`Validity window cannot exceed ${MAX_VALIDITY_DAYS} days.`);
  }
}

export function deriveReusableStatus(
  row: Pick<QrInviteRow, 'status' | 'valid_from' | 'expires_at'>,
  now: Date = new Date(),
): ReusableInviteStatus {
  const expiresAt = new Date(row.expires_at);
  if (expiresAt.getTime() <= now.getTime()) {
    return 'expired';
  }

  if (row.status === 'revoked') {
    return 'paused';
  }

  if (row.valid_from) {
    const validFrom = new Date(row.valid_from);
    if (validFrom.getTime() > now.getTime()) {
      return 'scheduled';
    }
  }

  return 'active';
}

export function partitionReusables<T extends Pick<QrInviteRow, 'expires_at'>>(
  rows: T[],
  now: Date = new Date(),
): { active: T[]; expired: T[] } {
  const active: T[] = [];
  const expired: T[] = [];

  for (const row of rows) {
    if (new Date(row.expires_at).getTime() > now.getTime()) {
      active.push(row);
    } else {
      expired.push(row);
    }
  }

  return { active, expired };
}

function viennaMonthBoundary(year: number, month: number): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VIENNA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(Date.UTC(year, month, 1, 12)));

  const y = Number(parts.find((p) => p.type === 'year')?.value ?? year);
  const m = Number(parts.find((p) => p.type === 'month')?.value ?? month + 1) - 1;
  const d = Number(parts.find((p) => p.type === 'day')?.value ?? 1);
  return new Date(Date.UTC(y, m, d, 0, 0, 0));
}

function viennaNowParts(now: Date): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VIENNA_TZ,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);

  return {
    year: Number(parts.find((p) => p.type === 'year')?.value ?? now.getUTCFullYear()),
    month: Number(parts.find((p) => p.type === 'month')?.value ?? now.getUTCMonth() + 1) - 1,
  };
}

export function buildValidityPresets(now: Date = new Date()): ValidityPreset[] {
  const { year, month } = viennaNowParts(now);
  const thisMonthStart = viennaMonthBoundary(year, month);
  const nextMonthStart = viennaMonthBoundary(year, month + 1);
  const monthAfterNext = viennaMonthBoundary(year, month + 2);

  const in30 = addDays(now, REUSABLE_DEFAULT_EXPIRY_DAYS);
  const in7 = addDays(now, 7);
  const in90 = addDays(now, 90);
  const in365 = addDays(now, MAX_VALIDITY_DAYS);

  return [
    {
      id: 'now-30d',
      labelKey: 'colleagues.invites.validity.preset.now30',
      labelFallback: 'Effective now, 30 days',
      validFrom: null,
      expiresAt: in30.toISOString(),
    },
    {
      id: '7d',
      labelKey: 'colleagues.invites.validity.preset.7d',
      labelFallback: '7 days',
      validFrom: null,
      expiresAt: in7.toISOString(),
    },
    {
      id: '30d',
      labelKey: 'colleagues.invites.validity.preset.30d',
      labelFallback: '30 days',
      validFrom: null,
      expiresAt: in30.toISOString(),
    },
    {
      id: '90d',
      labelKey: 'colleagues.invites.validity.preset.90d',
      labelFallback: '90 days',
      validFrom: null,
      expiresAt: in90.toISOString(),
    },
    {
      id: 'this-month',
      labelKey: 'colleagues.invites.validity.preset.thisMonth',
      labelFallback: 'This month',
      validFrom: thisMonthStart.toISOString(),
      expiresAt: nextMonthStart.toISOString(),
    },
    {
      id: 'next-month',
      labelKey: 'colleagues.invites.validity.preset.nextMonth',
      labelFallback: 'Next month',
      validFrom: nextMonthStart.toISOString(),
      expiresAt: monthAfterNext.toISOString(),
    },
    {
      id: '1y',
      labelKey: 'colleagues.invites.validity.preset.1y',
      labelFallback: '1 year',
      validFrom: null,
      expiresAt: in365.toISOString(),
    },
  ];
}

export function normalizeDisplayName(value: string): string {
  return value.trim().slice(0, DISPLAY_NAME_MAX_LENGTH);
}

export function toReusableViewModel(row: QrInviteRow, now: Date = new Date()): ReusableInviteViewModel {
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
    reusable: true,
    validFrom: row.valid_from,
    displayName: row.display_name ?? '',
    createdAt: row.created_at,
    derivedStatus: deriveReusableStatus(row, now),
  };
}
