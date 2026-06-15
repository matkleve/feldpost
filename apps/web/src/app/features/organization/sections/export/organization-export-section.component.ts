import { DatePipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { OrganizationService } from '../../../../core/organization/organization.service';
import type { OrgExportJob } from '../../../../core/organization/organization.types';
import { HLM_BUTTON_IMPORTS } from '../../../../shared/ui/button';

@Component({
  selector: 'app-organization-export-section',
  standalone: true,
  imports: [DatePipe, ...HLM_BUTTON_IMPORTS],
  templateUrl: './organization-export-section.component.html',
  styleUrl: './organization-export-section.component.scss',
})
export class OrganizationExportSectionComponent {
  private readonly i18nService = inject(I18nService);
  private readonly organizationService = inject(OrganizationService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly jobs = signal<OrgExportJob[]>([]);

  constructor() {
    effect(() => {
      void this.load();
    });
  }

  private async load(): Promise<void> {
    const result = await this.organizationService.loadExportJobs();
    this.jobs.set(result.data);
  }

  async onRequestExport(): Promise<void> {
    await this.organizationService.requestExport('json');
    await this.load();
  }
}
