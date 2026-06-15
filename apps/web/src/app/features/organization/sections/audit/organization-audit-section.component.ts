import { DatePipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { OrganizationService } from '../../../../core/organization/organization.service';
import type { OrgAuditEntry } from '../../../../core/organization/organization.types';

@Component({
  selector: 'app-organization-audit-section',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './organization-audit-section.component.html',
  styleUrl: './organization-audit-section.component.scss',
})
export class OrganizationAuditSectionComponent {
  private readonly i18nService = inject(I18nService);
  private readonly organizationService = inject(OrganizationService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly entries = signal<OrgAuditEntry[]>([]);

  constructor() {
    effect(() => {
      void this.load();
    });
  }

  private async load(): Promise<void> {
    const result = await this.organizationService.loadAuditLog();
    this.entries.set(result.data);
  }
}
