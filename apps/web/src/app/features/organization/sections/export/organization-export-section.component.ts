import { DatePipe, UpperCasePipe } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import { downloadExportPayload } from '../../../../core/organization/organization.helpers';
import {
  exportJobStatusChipVariant,
  organizationStatusI18nKey,
} from '../../logic/organization-section.helpers';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { OrganizationService } from '../../../../core/organization/organization.service';
import type { OrgExportJob } from '../../../../core/organization/organization.types';
import { ToastService } from '../../../../core/toast/toast.service';
import { ChipComponent } from '../../../../shared/components/chip/chip.component';
import { HLM_BUTTON_IMPORTS } from '../../../../shared/ui/button';

@Component({
  selector: 'app-organization-export-section',
  standalone: true,
  imports: [DatePipe, UpperCasePipe, ChipComponent, ...HLM_BUTTON_IMPORTS],
  templateUrl: './organization-export-section.component.html',
  styleUrl: './organization-export-section.component.scss',
})
export class OrganizationExportSectionComponent {
  private readonly i18nService = inject(I18nService);
  private readonly organizationService = inject(OrganizationService);
  private readonly toastService = inject(ToastService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly canEdit = input(true);
  readonly statusChipVariant = exportJobStatusChipVariant;

  readonly jobs = signal<OrgExportJob[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly requesting = signal(false);

  constructor() {
    effect(() => {
      void this.load();
    });
  }

  statusLabel(status: string): string {
    return this.t(organizationStatusI18nKey('export', status), status);
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    const result = await this.organizationService.loadExportJobs();
    this.loading.set(false);
    if (result.error) {
      this.loadError.set(result.error.message);
      return;
    }
    this.jobs.set(result.data);
  }

  async onRequestExport(): Promise<void> {
    if (!this.canEdit()) return;
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
