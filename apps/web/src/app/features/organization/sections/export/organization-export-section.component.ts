import { DatePipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { downloadExportPayload } from '../../../../core/organization/organization.helpers';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { OrganizationService } from '../../../../core/organization/organization.service';
import type { OrgExportJob } from '../../../../core/organization/organization.types';
import { ToastService } from '../../../../core/toast/toast.service';
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
  private readonly toastService = inject(ToastService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly jobs = signal<OrgExportJob[]>([]);
  readonly requesting = signal(false);

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
    this.requesting.set(true);
    const result = await this.organizationService.requestExport('json');
    this.requesting.set(false);
    if (result.error) {
      this.toastService.show({ message: result.error.message, type: 'error' });
      return;
    }
    await this.load();
    this.toastService.show({
      message: this.t('organization.export.ready', 'Export is ready to download.'),
      type: 'success',
    });
  }

  onDownload(job: OrgExportJob): void {
    if (!job.payload) return;
    downloadExportPayload(job.payload, job.format, job.id);
  }
}
