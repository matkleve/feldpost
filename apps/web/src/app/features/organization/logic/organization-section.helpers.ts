import type { ChipVariant } from '../../../shared/components/chip/chip.component';

/** i18n key for organization job/invoice/subscription status values. */
export function organizationStatusI18nKey(
  domain: 'export' | 'invoice' | 'subscription',
  status: string,
): string {
  const normalized = status.trim().toLowerCase().replace(/\s+/g, '_');
  return `organization.status.${domain}.${normalized}`;
}

export function exportJobStatusChipVariant(status: string): ChipVariant {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'status-success';
    case 'failed':
      return 'status-danger';
    case 'processing':
    case 'pending':
      return 'status-warning';
    default:
      return 'neutral';
  }
}

export function invoiceStatusChipVariant(status: string): ChipVariant {
  switch (status.toLowerCase()) {
    case 'paid':
      return 'status-success';
    case 'open':
    case 'draft':
      return 'status-warning';
    case 'void':
    case 'uncollectible':
      return 'status-danger';
    default:
      return 'neutral';
  }
}

export function subscriptionStatusChipVariant(status: string): ChipVariant {
  switch (status.toLowerCase()) {
    case 'active':
      return 'status-success';
    case 'trialing':
      return 'info';
    case 'past_due':
    case 'paused':
      return 'status-warning';
    case 'canceled':
    case 'cancelled':
      return 'status-danger';
    default:
      return 'neutral';
  }
}
