import { describe, expect, it } from 'vitest';
import {
  exportJobStatusChipVariant,
  invoiceStatusChipVariant,
  organizationStatusI18nKey,
  subscriptionStatusChipVariant,
} from './organization-section.helpers';

describe('organization-section.helpers', () => {
  it('builds status i18n keys from domain and status', () => {
    expect(organizationStatusI18nKey('export', 'Completed')).toBe('organization.status.export.completed');
    expect(organizationStatusI18nKey('invoice', 'past due')).toBe('organization.status.invoice.past_due');
  });

  it('maps export statuses to chip variants', () => {
    expect(exportJobStatusChipVariant('completed')).toBe('status-success');
    expect(exportJobStatusChipVariant('failed')).toBe('status-danger');
  });

  it('maps invoice and subscription statuses to chip variants', () => {
    expect(invoiceStatusChipVariant('paid')).toBe('status-success');
    expect(subscriptionStatusChipVariant('active')).toBe('status-success');
  });
});
