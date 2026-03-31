/**
 * UploadPanelJobFileActionsService — File-level actions and navigation.
 *
 * Provides:
 *  - Download uploaded files via Supabase Storage
 *  - Open file details modal (read-only inspection)
 *  - Navigation to media gallery / existing duplicate rows
 *  - Workspace pane selection and zoom actions
 *  - Priority toggling for uploaded items
 *
 * Ground rules:
 *  - Downloads use attachment semantics (force file save, never inline browser tab)
 *  - Zoom actions are filtered by canZoomToJob() (only items with coordinates)
 *  - Priority state persisted in prioritizedUploadedJobIds set
 */

import { Injectable, inject, type WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { ProjectsService } from '../../core/projects/projects.service';
import { ToastService } from '../../core/toast.service';
import { UploadService } from '../../core/upload/upload.service';
import type { UploadJob } from '../../core/upload/upload-manager.service';
import { WorkspacePaneObserverAdapter } from '../../core/workspace-pane-observer.adapter';
import { WorkspaceSelectionService } from '../../core/workspace-selection.service';
import { I18nService } from '../../core/i18n/i18n.service';
import type { UploadLocationMapPickRequest } from './upload-panel.types';

export interface UploadPanelJobFileActionsRegisterOptions {
  locationMapPickRequested: (e: UploadLocationMapPickRequest) => void;
  prioritizedUploadedJobIds: WritableSignal<Set<string>>;
}

@Injectable()
export class UploadPanelJobFileActionsService {
  private readonly uploadService = inject(UploadService);
  private readonly workspaceSelectionService = inject(WorkspaceSelectionService);
  private readonly workspacePaneObserver = inject(WorkspacePaneObserverAdapter);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly projectsService = inject(ProjectsService);
  private readonly i18nService = inject(I18nService);

  private readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);

  private options: UploadPanelJobFileActionsRegisterOptions | null = null;

  register(options: UploadPanelJobFileActionsRegisterOptions): void {
    this.options = options;
  }

  private get ctx(): UploadPanelJobFileActionsRegisterOptions {
    if (!this.options) {
      throw new Error('UploadPanelJobFileActionsService not registered.');
    }
    return this.options;
  }

  async downloadUploadedJob(job: UploadJob): Promise<void> {
    if (!job.storagePath) {
      this.toastService.show({
        message: 'Download nicht verfuegbar.',
        type: 'warning',
        dedupe: true,
      });
      return;
    }

    const result = await this.uploadService.downloadFile(job.storagePath);
    if (!result.ok) {
      this.toastService.show({
        message: typeof result.error === 'string' ? result.error : 'Download fehlgeschlagen.',
        type: 'error',
        dedupe: true,
      });
      return;
    }

    if (typeof document === 'undefined') {
      return;
    }

    const blobUrl = URL.createObjectURL(result.blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = job.file.name;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  }

  async openUploadedJobInMedia(job: UploadJob): Promise<void> {
    if (!job.imageId) {
      return;
    }

    this.workspaceSelectionService.setSingle(job.imageId);
    this.workspacePaneObserver.setDetailImageId(job.imageId);
    this.workspacePaneObserver.setOpen(true);

    await this.router.navigate(['/media']);
  }

  async openExistingDuplicateInMedia(job: UploadJob): Promise<void> {
    if (!job.existingImageId) {
      return;
    }

    this.workspaceSelectionService.setSingle(job.existingImageId);
    this.workspacePaneObserver.setDetailImageId(job.existingImageId);
    this.workspacePaneObserver.setOpen(true);

    await this.router.navigate(['/media']);
  }

  async openUploadedJobProject(job: UploadJob): Promise<void> {
    if (!job.projectId) {
      this.toastService.show({
        message: this.t('upload.item.menu.project.unavailable', 'No project assigned.'),
        type: 'warning',
        dedupe: true,
      });
      return;
    }

    await this.router.navigate(['/projects', job.projectId]);
  }

  async removeUploadedJobFromProject(job: UploadJob): Promise<boolean> {
    if (!job.imageId || !job.projectId) {
      this.toastService.show({
        message: this.t('upload.item.menu.project.unavailable', 'No project assigned.'),
        type: 'warning',
        dedupe: true,
      });
      return false;
    }

    const ok = await this.projectsService.removeMediaFromProject(job.imageId, job.projectId);
    if (!ok) {
      this.toastService.show({
        message: this.t('upload.item.menu.project.remove.failed', 'Could not remove from project.'),
        type: 'error',
        dedupe: true,
      });
      return false;
    }

    this.toastService.show({
      message: this.t('upload.item.menu.project.remove.success', 'Removed from project.'),
      type: 'success',
      dedupe: true,
    });
    return true;
  }

  requestLocationPickOnMap(job: UploadJob): void {
    if (!job.imageId) {
      return;
    }

    this.ctx.locationMapPickRequested({ imageId: job.imageId, fileName: job.file.name });
    this.toastService.show({
      message: this.t('upload.location.mapPick.hint', 'Click on the map to set the location.'),
      type: 'info',
      dedupe: true,
    });
  }

  toggleJobPriority(job: UploadJob): void {
    if (!job.imageId) {
      return;
    }

    const next = new Set(this.ctx.prioritizedUploadedJobIds());
    const had = next.has(job.id);
    if (had) {
      next.delete(job.id);
    } else {
      next.add(job.id);
    }
    this.ctx.prioritizedUploadedJobIds.set(next);

    this.toastService.show({
      message: had
        ? this.t('upload.item.menu.priority.removedToast', 'Priority removed.')
        : this.t('upload.item.menu.priority.addedToast', 'Upload prioritized.'),
      type: 'success',
      dedupe: true,
    });
  }
}
