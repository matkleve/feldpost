import { Injectable, inject, type WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { ProjectsService } from '../../core/projects/projects.service';
import { ToastService } from '../../core/toast/toast.service';
import { UploadService } from '../../core/upload/upload.service';
import type { UploadJob } from '../../core/upload/upload-manager.service';
import { WorkspacePaneObserverAdapter } from '../../core/workspace-pane-observer.adapter';
import { WorkspaceSelectionService } from '../../core/workspace-selection/workspace-selection.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { MapProjectActionsService } from '../map/map-shell/map-project-actions.service';
import { MapProjectDialogService } from '../map/map-shell/map-project-dialog.service';
import { UploadPanelDialogSignals } from './upload-panel-dialog-signals.service';
import type { UploadLocationMapPickRequest } from './upload-panel.types';
import { getBoundProjectIds } from './upload-panel-project-bindings.util';

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
  private readonly supabase = inject(SupabaseService);
  private readonly i18nService = inject(I18nService);
  private readonly mapProjectActionsService = inject(MapProjectActionsService);
  private readonly mapProjectDialogService = inject(MapProjectDialogService);
  private readonly dialogSignals = inject(UploadPanelDialogSignals);

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
    const boundProjectIds = getBoundProjectIds(job);
    if (boundProjectIds.length === 0) {
      this.toastService.show({
        message: this.t('upload.item.menu.project.unavailable', 'No project assigned.'),
        type: 'warning',
        dedupe: true,
      });
      return;
    }

    if (boundProjectIds.length > 1) {
      const optionsResult = await this.mapProjectActionsService.loadProjectOptions(
        this.supabase.client,
      );
      if (!optionsResult.ok) {
        this.toastService.show({
          message: this.t('projects.dialog.error.loadFailed', 'Could not load projects.'),
          type: 'error',
          dedupe: true,
        });
        return;
      }

      const options = optionsResult.options.filter((option) => boundProjectIds.includes(option.id));
      if (options.length === 0) {
        await this.router.navigate(['/projects']);
        return;
      }

      const selected = await this.mapProjectDialogService.openProjectSelectionDialog(
        this.dialogSignals,
        options,
        this.t('upload.item.menu.project.open', 'Open project'),
        job.file.name,
      );
      if (selected) {
        await this.router.navigate(['/projects', selected.id]);
      }
      return;
    }

    await this.router.navigate(['/projects', boundProjectIds[0]]);
  }

  async removeUploadedJobFromProjects(job: UploadJob): Promise<boolean> {
    const boundProjectIds = getBoundProjectIds(job);
    if (!job.imageId || boundProjectIds.length === 0) {
      this.toastService.show({
        message: this.t('upload.item.menu.project.unavailable', 'No project assigned.'),
        type: 'warning',
        dedupe: true,
      });
      return false;
    }

    let allOk = true;
    for (const projectId of boundProjectIds) {
      const ok = await this.projectsService.removeMediaFromProject(job.imageId, projectId);
      if (!ok) {
        allOk = false;
      }
    }

    if (!allOk) {
      this.toastService.show({
        message: this.t('upload.item.menu.project.remove.failed', 'Could not remove from project.'),
        type: 'error',
        dedupe: true,
      });
      return false;
    }

    this.toastService.show({
      message:
        boundProjectIds.length > 1
          ? this.t('upload.item.menu.project.removeMany.success', 'Removed from projects.')
          : this.t('upload.item.menu.project.remove.success', 'Removed from project.'),
      type: 'success',
      dedupe: true,
    });
    return true;
  }

  async deleteUploadedMedia(job: UploadJob): Promise<boolean> {
    if (!job.imageId) {
      this.toastService.show({
        message: this.t('upload.item.menu.media.unavailable', 'Media is not persisted yet.'),
        type: 'warning',
        dedupe: true,
      });
      return false;
    }

    const { error } = await this.supabase.client
      .from('media_items')
      .delete()
      .or(`id.eq.${job.imageId},source_image_id.eq.${job.imageId}`);

    if (error) {
      this.toastService.show({
        message: this.t('upload.item.menu.media.delete.failed', 'Could not delete media.'),
        type: 'error',
        dedupe: true,
      });
      return false;
    }

    this.toastService.show({
      message: this.t('upload.item.menu.media.delete.success', 'Media deleted.'),
      type: 'success',
      dedupe: true,
    });
    return true;
  }

  async requestLocationPickOnMap(job: UploadJob): Promise<void> {
    // upload-panel.md § Media Item Menu Contract: location correction must work for uploaded documents too.
    const mediaId = await this.resolveMediaIdForJob(job);
    if (!mediaId) {
      return;
    }

    this.ctx.locationMapPickRequested({ mediaId, fileName: job.file.name });
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

  private async resolveMediaIdForJob(job: UploadJob): Promise<string | null> {
    if (job.imageId) {
      return job.imageId;
    }

    // Some rows (especially non-photo uploads) can be rehydrated without imageId on the job object.
    // Use storage_path as deterministic fallback to locate the persisted media_items row.
    if (!job.storagePath) {
      return null;
    }

    const { data, error } = await this.supabase.client
      .from('media_items')
      .select('id')
      .eq('storage_path', job.storagePath)
      .limit(1)
      .maybeSingle();

    if (error || !data?.id) {
      return null;
    }

    return data.id;
  }
}
