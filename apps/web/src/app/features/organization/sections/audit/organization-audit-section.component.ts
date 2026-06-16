import { DatePipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { OrganizationService } from '../../../../core/organization/organization.service';
import type { OrgAuditEntry } from '../../../../core/organization/organization.types';
import { HLM_BUTTON_IMPORTS } from '../../../../shared/ui/button';

@Component({
  selector: 'app-organization-audit-section',
  standalone: true,
  imports: [DatePipe, ...HLM_BUTTON_IMPORTS],
  templateUrl: './organization-audit-section.component.html',
  styleUrl: './organization-audit-section.component.scss',
})
export class OrganizationAuditSectionComponent {
  private readonly i18nService = inject(I18nService);
  private readonly organizationService = inject(OrganizationService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly entries = signal<OrgAuditEntry[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  constructor() {
    effect(() => {
      void this.load();
    });
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    const result = await this.organizationService.loadAuditLog();
    this.loading.set(false);
    if (result.error) {
      this.loadError.set(result.error.message);
      return;
    }
    this.entries.set(result.data);
  }
}
