import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import {
  invoiceStatusChipVariant,
  organizationStatusI18nKey,
  subscriptionStatusChipVariant,
} from '../../logic/organization-section.helpers';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { OrganizationService } from '../../../../core/organization/organization.service';
import type { OrgInvoice, OrgSubscription } from '../../../../core/organization/organization.types';
import { ChipComponent } from '../../../../shared/components/chip/chip.component';
import { HLM_BUTTON_IMPORTS } from '../../../../shared/ui/button';

@Component({
  selector: 'app-organization-billing-section',
  standalone: true,
  imports: [DatePipe, DecimalPipe, ChipComponent, ...HLM_BUTTON_IMPORTS],
  templateUrl: './organization-billing-section.component.html',
  styleUrl: './organization-billing-section.component.scss',
})
export class OrganizationBillingSectionComponent {
  private readonly i18nService = inject(I18nService);
  private readonly organizationService = inject(OrganizationService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly canViewInvoices = input(true);
  readonly statusChipVariant = subscriptionStatusChipVariant;
  readonly invoiceChipVariant = invoiceStatusChipVariant;
  readonly statusI18nKey = organizationStatusI18nKey;

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly subscription = signal<OrgSubscription | null>(null);
  readonly invoices = signal<OrgInvoice[]>([]);

  constructor() {
    effect(() => {
      this.canViewInvoices();
      void this.load();
    });
  }

  statusLabel(domain: 'invoice' | 'subscription', status: string): string {
    const key = organizationStatusI18nKey(domain, status);
    return this.t(key, status);
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    const sub = await this.organizationService.loadSubscription();
    const invoices = this.canViewInvoices()
      ? await this.organizationService.loadInvoices()
      : { data: [], error: null };
    this.loading.set(false);
    if (sub.error || invoices.error) {
      this.loadError.set(sub.error?.message ?? invoices.error?.message ?? null);
      return;
    }
    this.subscription.set(sub.data);
    this.invoices.set(invoices.data);
  }
}
