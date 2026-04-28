import { Component, computed, inject, input, signal } from '@angular/core';
import type { WorkspaceImage } from '../../../core/workspace-view/workspace-view.types';
import { WorkspaceSelectionService } from '../../../core/workspace-selection/workspace-selection.service';
import { ShareSetService } from '../../../core/share-set/share-set.service';
import { MediaDownloadService } from '../../../core/media-download/media-download.service';
import { ToastService } from '../../../core/toast/toast.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { GeocodingService } from '../../../core/geocoding/geocoding.service';
import { MediaLocationUpdateService } from '../../../core/media-location-update/media-location-update.service';
import { WorkspaceViewService } from '../../../core/workspace-view/workspace-view.service';
import { ActionEngineService } from '../../../core/action/action-engine.service';
import { ACTION_CONTEXT_IDS } from '../../../core/action/action-context-ids';
import {
  UiButtonDirective,
  UiButtonPrimaryDirective,
  UiButtonSizeSmDirective,
  UiButtonIconOnlyDirective,
  UiButtonIconWithTextDirective,
  UiInputControlDirective,
} from '../../../shared/ui-primitives/ui-primitives.directive';
import { PaneFooterComponent } from '../../../shared/pane-footer/pane-footer.component';
import { WORKSPACE_EXPORT_ACTION_DEFINITIONS } from '../workspace-export-actions.registry';
import type { WorkspaceExportActionId } from '../workspace-export-actions.types';
import {
  ProjectSelectDialogComponent,
  type ProjectSelectOption,
} from '../../../shared/project-select-dialog/project-select-dialog.component';
import { TextInputDialogComponent } from '../../../shared/text-input-dialog/text-input-dialog.component';

const WORKSPACE_EXPORT_LABEL_FALLBACKS: Record<string, string> = {
  'workspace.export.action.selectAll': 'Select all',
  'workspace.export.action.selectNone': 'Select none',
  'workspace.export.action.share': 'Share',
  'workspace.export.action.copyLink': 'Copy link',
  'workspace.export.action.downloadZip': 'Export ZIP',
};

@Component({
  selector: 'app-workspace-pane-footer',
  standalone: true,
  imports: [
    UiButtonDirective,
    UiButtonPrimaryDirective,
    UiButtonSizeSmDirective,
    UiButtonIconOnlyDirective,
    UiButtonIconWithTextDirective,
    UiInputControlDirective,
    PaneFooterComponent,
    ProjectSelectDialogComponent,
    TextInputDialogComponent,
  ],
  templateUrl: './workspace-pane-footer.component.html',
  styleUrl: './workspace-pane-footer.component.scss',
})
export class WorkspacePaneFooterComponent {
  readonly scopeIds = input.required<string[]>();
  readonly images = input.required<WorkspaceImage[]>();

  protected readonly selectionService = inject(WorkspaceSelectionService);
  private readonly actionEngine = inject(ActionEngineService);
  private readonly i18nService = inject(I18nService);
  private readonly supabaseService = inject(SupabaseService);
  private readonly geocodingService = inject(GeocodingService);
  private readonly mediaLocationUpdateService = inject(MediaLocationUpdateService);
  private readonly workspaceViewService = inject(WorkspaceViewService);
  private readonly shareSetService = inject(ShareSetService);
  private readonly mediaDownloadService = inject(MediaDownloadService);
  private readonly toastService = inject(ToastService);

  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly pending = signal(false);
  readonly zipDialogOpen = signal(false);
  readonly zipTitle = signal('');
  readonly zipProgress = signal(0);
  readonly shareUrl = signal<string | null>(null);
  readonly projectDialogOpen = signal(false);
  readonly projectOptions = signal<ReadonlyArray<ProjectSelectOption>>([]);
  readonly projectDialogSelectedId = signal<string | null>(null);
  readonly addressDialogOpen = signal(false);
  readonly deleteDialogOpen = signal(false);

  readonly selectedImages = computed(() => {
    const selected = this.selectionService.selectedMediaIds();
    return this.images().filter((img) => selected.has(img.id));
  });

  readonly actions = computed(() =>
    this.actionEngine.resolveActions(
      WORKSPACE_EXPORT_ACTION_DEFINITIONS,
      {
        contextType: ACTION_CONTEXT_IDS.wsFooter,
        selectedCount: this.selectionService.selectedCount(),
        canNativeShare: typeof navigator !== 'undefined' && 'share' in navigator,
      },
      {
        translateLabel: (key) => this.t(key, WORKSPACE_EXPORT_LABEL_FALLBACKS[key] ?? key),
      },
    ),
  );

  onActionSelected(actionId: WorkspaceExportActionId): void {
    switch (actionId) {
      case 'select_all':
        this.selectionService.selectAllInScope(this.scopeIds());
        return;
      case 'select_none':
        this.selectionService.clearSelection();
        return;
      case 'share_link':
        void this.shareLink();
        return;
      case 'copy_link':
        void this.copyLink();
        return;
      case 'download_zip':
        this.openZipDialog();
        return;
    }
  }

  onProjectDialogSelected(projectId: string): void {
    this.projectDialogSelectedId.set(projectId);
  }

  closeProjectDialog(): void {
    if (this.pending()) {
      return;
    }

    this.projectDialogOpen.set(false);
    this.projectDialogSelectedId.set(null);
  }

  async confirmProjectDialog(projectId: string): Promise<void> {
    const selectedMediaItemIds = await this.resolveSelectedMediaItemIds();
    if (selectedMediaItemIds.length === 0) {
      this.toastService.show({
        message: this.t('workspace.export.error.noImagesSelected', 'No images selected.'),
        type: 'warning',
      });
      this.closeProjectDialog();
      return;
    }

    this.pending.set(true);
    try {
      const rows = selectedMediaItemIds.map((mediaItemId) => ({
        media_item_id: mediaItemId,
        project_id: projectId,
      }));
      const { error } = await this.supabaseService.client
        .from('media_projects')
        .upsert(rows, { onConflict: 'media_item_id,project_id', ignoreDuplicates: true });

      if (error) {
        this.toastService.show({
          message: error.message,
          type: 'error',
        });
        return;
      }

      this.toastService.show({
        message: this.t('workspace.export.success.projectAssigned', 'Assigned to project.'),
        type: 'success',
      });
      this.closeProjectDialog();
    } finally {
      this.pending.set(false);
    }
  }

  closeAddressDialog(): void {
    if (this.pending()) {
      return;
    }
    this.addressDialogOpen.set(false);
  }

  async confirmAddressDialog(addressQuery: string): Promise<void> {
    const addressText = addressQuery.trim();
    if (!addressText) {
      return;
    }

    const suggestion = await this.geocodingService.forward(addressText);
    if (!suggestion) {
      this.toastService.show({
        message: this.t('workspace.export.error.addressNotFound', 'Address could not be resolved.'),
        type: 'warning',
      });
      return;
    }

    const selectedMediaItemIds = await this.resolveSelectedMediaItemIds();
    if (selectedMediaItemIds.length === 0) {
      this.toastService.show({
        message: this.t('workspace.export.error.noImagesSelected', 'No images selected.'),
        type: 'warning',
      });
      this.closeAddressDialog();
      return;
    }

    this.pending.set(true);
    let updatedCount = 0;
    try {
      for (const mediaItemId of selectedMediaItemIds) {
        const result = await this.mediaLocationUpdateService.updateFromAddressSuggestion(
          mediaItemId,
          {
            lat: suggestion.lat,
            lng: suggestion.lng,
            addressLabel: suggestion.addressLabel,
            city: suggestion.city,
            district: suggestion.district,
            street: suggestion.street,
            streetNumber: suggestion.streetNumber,
            zip: suggestion.zip,
            country: suggestion.country,
          },
        );
        if (result.ok) {
          updatedCount += 1;
        }
      }

      if (updatedCount === 0) {
        this.toastService.show({
          message: this.t('workspace.export.error.addressUpdateFailed', 'Address update failed.'),
          type: 'error',
        });
        return;
      }

      const selectedImageIds = this.selectionService.selectedMediaIds();
      this.workspaceViewService.rawImages.update((images) =>
        images.map((image) =>
          selectedImageIds.has(image.id)
            ? {
                ...image,
                latitude: suggestion.lat,
                longitude: suggestion.lng,
                addressLabel: suggestion.addressLabel,
                city: suggestion.city,
                district: suggestion.district,
                street: suggestion.street,
                streetNumber: suggestion.streetNumber,
                zip: suggestion.zip,
                country: suggestion.country,
              }
            : image,
        ),
      );

      this.toastService.show({
        message: this.t('workspace.export.success.addressUpdated', 'Address updated.'),
        type: 'success',
      });
      this.closeAddressDialog();
    } finally {
      this.pending.set(false);
    }
  }

  closeDeleteDialog(): void {
    if (this.pending()) {
      return;
    }
    this.deleteDialogOpen.set(false);
  }

  async confirmDeleteDialog(): Promise<void> {
    const selectedMediaItemIds = await this.resolveSelectedMediaItemIds();
    if (selectedMediaItemIds.length === 0) {
      this.toastService.show({
        message: this.t('workspace.export.error.noImagesSelected', 'No images selected.'),
        type: 'warning',
      });
      this.closeDeleteDialog();
      return;
    }

    this.pending.set(true);
    try {
      const { error } = await this.supabaseService.client
        .from('media_items')
        .delete()
        .in('id', selectedMediaItemIds);

      if (error) {
        this.toastService.show({ message: error.message, type: 'error' });
        return;
      }

      const selectedIds = this.selectionService.selectedMediaIds();
      this.workspaceViewService.rawImages.update((images) =>
        images.filter((image) => !selectedIds.has(image.id)),
      );
      this.selectionService.clearSelection();
      this.toastService.show({
        message: this.t('workspace.export.success.deleted', 'Selected media deleted.'),
        type: 'success',
      });
      this.closeDeleteDialog();
    } finally {
      this.pending.set(false);
    }
  }

  async copyLink(): Promise<void> {
    await this.createShareLink(true);
  }

  async shareLink(): Promise<void> {
    const url = await this.createShareLink(false);
    if (!url) return;

    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: this.t('workspace.export.share.title', 'Workspace export'),
          text: this.t('workspace.export.share.text', 'Shared media selection'),
          url,
        });
      } catch {
        // No-op: user may cancel native share.
      }
    }
  }

  openZipDialog(): void {
    const firstProject = this.selectedImages().find((img) => !!img.projectName)?.projectName;
    this.zipTitle.set(
      this.mediaDownloadService.buildDefaultTitle({
        selectedProjectName: firstProject,
        selectedCount: this.selectionService.selectedCount(),
      }),
    );
    this.zipDialogOpen.set(true);
    this.zipProgress.set(0);
  }

  closeZipDialog(): void {
    if (this.pending()) return;
    this.zipDialogOpen.set(false);
  }

  async downloadZip(): Promise<void> {
    const selectedImages = this.selectedImages();
    if (selectedImages.length === 0) {
      this.toastService.show({
        message: this.t('workspace.export.error.noImagesSelected', 'No images selected.'),
        type: 'error',
      });
      return;
    }

    this.pending.set(true);
    try {
      await this.mediaDownloadService.exportSelectionAsZip(
        selectedImages,
        this.zipTitle(),
        (progress) => {
          this.zipProgress.set(progress);
        },
      );
      this.toastService.show({
        message: this.t('workspace.export.success.zipStarted', 'ZIP download started.'),
        type: 'success',
      });
      this.zipDialogOpen.set(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : this.t('workspace.export.error.zipFailed', 'ZIP export failed.');
      this.toastService.show({ message, type: 'error' });
    } finally {
      this.pending.set(false);
    }
  }

  private async createShareLink(copyToClipboard: boolean): Promise<string | null> {
    const selectedIds = Array.from(this.selectionService.selectedMediaIds());
    if (selectedIds.length === 0) {
      this.toastService.show({
        message: this.t('workspace.export.error.noImagesSelected', 'No images selected.'),
        type: 'error',
      });
      return null;
    }

    this.pending.set(true);
    try {
      const result = await this.shareSetService.createOrReuseShareSet(selectedIds);
      const url = `${window.location.origin}/?share=${result.token}`;
      this.shareUrl.set(url);

      if (copyToClipboard) {
        if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
          this.toastService.show({
            message: this.t(
              'workspace.export.error.clipboardUnavailable',
              'Clipboard is not available.',
            ),
            type: 'error',
          });
        } else {
          await navigator.clipboard.writeText(url);
          this.toastService.show({
            message: this.t('workspace.export.success.linkCopied', 'Share link copied.'),
            type: 'success',
            dedupe: true,
          });
        }
      }

      return url;
    } catch (error) {
      const message =
        error instanceof Error && error.message.toLowerCase().includes('column reference')
          ? this.t(
              'workspace.export.error.linkCreateFailed',
              'Freigabelink konnte nicht erstellt werden.',
            )
          : error instanceof Error
            ? error.message
            : this.t(
                'workspace.export.error.linkCreateFailed',
                'Freigabelink konnte nicht erstellt werden.',
              );
      this.toastService.show({ message, type: 'error' });
      return null;
    } finally {
      this.pending.set(false);
    }
  }

  private async openProjectDialog(): Promise<void> {
    this.pending.set(true);
    try {
      const { data, error } = await this.supabaseService.client
        .from('projects')
        .select('id,name')
        .order('name', { ascending: true });

      if (error || !Array.isArray(data) || data.length === 0) {
        this.toastService.show({
          message: this.t('workspace.export.error.noProjectsAvailable', 'No projects available.'),
          type: 'warning',
        });
        return;
      }

      this.projectOptions.set(
        data
          .filter(
            (row): row is { id: string; name: string } =>
              typeof row.id === 'string' && typeof row.name === 'string' && row.name.length > 0,
          )
          .map((row) => ({ id: row.id, name: row.name })),
      );
      this.projectDialogSelectedId.set(this.projectOptions()[0]?.id ?? null);
      this.projectDialogOpen.set(true);
    } finally {
      this.pending.set(false);
    }
  }

  private async resolveSelectedMediaItemIds(): Promise<string[]> {
    const selectedIds = Array.from(this.selectionService.selectedMediaIds());
    if (selectedIds.length === 0) {
      return [];
    }

    const idList = selectedIds.join(',');
    const { data, error } = await this.supabaseService.client
      .from('media_items')
      .select('id,source_image_id')
      .or(`id.in.(${idList}),source_image_id.in.(${idList})`);

    if (error || !Array.isArray(data)) {
      return [];
    }

    return Array.from(
      new Set(
        data
          .map((row) => (typeof row.id === 'string' ? row.id : null))
          .filter((id): id is string => !!id),
      ),
    );
  }

  private async removeFromProject(): Promise<void> {
    const selectedMediaItemIds = await this.resolveSelectedMediaItemIds();
    if (selectedMediaItemIds.length === 0) {
      this.toastService.show({
        message: this.t('workspace.export.error.noImagesSelected', 'No images selected.'),
        type: 'warning',
      });
      return;
    }

    this.pending.set(true);
    try {
      const { error } = await this.supabaseService.client
        .from('media_projects')
        .delete()
        .in('media_item_id', selectedMediaItemIds);

      if (error) {
        this.toastService.show({ message: error.message, type: 'error' });
        return;
      }

      const selectedImageIds = this.selectionService.selectedMediaIds();
      this.workspaceViewService.rawImages.update((images) =>
        images.map((image) =>
          selectedImageIds.has(image.id)
            ? {
                ...image,
                projectId: null,
                projectName: null,
              }
            : image,
        ),
      );

      this.toastService.show({
        message: this.t(
          'upload.item.menu.project.remove.success',
          'Removed from project successfully.',
        ),
        type: 'success',
      });
    } finally {
      this.pending.set(false);
    }
  }
}
