import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { OrganizationService } from '../../../../core/organization/organization.service';
import type { OrgInvoice, OrgSubscription } from '../../../../core/organization/organization.types';

@Component({
  selector: 'app-organization-billing-section',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  templateUrl: './organization-billing-section.component.html',
  styleUrl: './organization-billing-section.component.scss',
})
export class OrganizationBillingSectionComponent {
  private readonly i18nService = inject(I18nService);
  private readonly organizationService = inject(OrganizationService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly subscription = signal<OrgSubscription | null>(null);
  readonly invoices = signal<OrgInvoice[]>([]);

  constructor() {
    effect(() => {
      void this.load();
    });
  }

  private async load(): Promise<void> {
    const [sub, invoices] = await Promise.all([
      this.organizationService.loadSubscription(),
      this.organizationService.loadInvoices(),
    ]);
    this.subscription.set(sub.data);
    this.invoices.set(invoices.data);
  }
}
