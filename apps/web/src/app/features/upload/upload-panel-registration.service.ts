import { Injectable, effect, inject, type Signal, type WritableSignal } from '@angular/core';
import type { UploadJob } from '../../core/upload/upload-manager.service';
import {
  UploadPanelBulkActionsService,
  type UploadPanelBulkActionsRegisterOptions,
} from './upload-panel-bulk-actions.service';
import {
  UploadPanelJobActionsService,
  type UploadPanelJobActionsRegisterOptions,
} from './upload-panel-job-actions.service';
import {
  UploadPanelViewModelService,
  type UploadPanelViewModelRegisterOptions,
} from './upload-panel-view-model.service';

export interface UploadPanelRegistrationOptions {
  uploadManagerJobs: Signal<ReadonlyArray<UploadJob>>;
  jobs: Signal<ReadonlyArray<UploadJob>>;
  selectedUploadJobIds: WritableSignal<Set<string>>;
  jobActions: UploadPanelJobActionsRegisterOptions;
  viewModel: UploadPanelViewModelRegisterOptions;
  bulkActions: UploadPanelBulkActionsRegisterOptions;
}

@Injectable()
export class UploadPanelRegistrationService {
  private readonly jobActions = inject(UploadPanelJobActionsService);
  private readonly bulkActions = inject(UploadPanelBulkActionsService);
  private readonly viewModel = inject(UploadPanelViewModelService);

  register(options: UploadPanelRegistrationOptions): void {
    effect(() => {
      const jobs = options.uploadManagerJobs();
      void jobs; // Track reactivity
    });

    effect(() => {
      const existingIds = new Set(options.jobs().map((job) => job.id));
      const selected = options.selectedUploadJobIds();
      if (selected.size === 0) {
        return;
      }

      const next = new Set<string>();
      for (const id of selected) {
        if (existingIds.has(id)) {
          next.add(id);
        }
      }

      if (next.size !== selected.size) {
        options.selectedUploadJobIds.set(next);
      }
    });

    this.jobActions.register(options.jobActions);
    this.viewModel.register(options.viewModel);
    this.bulkActions.register(options.bulkActions);
  }
}
