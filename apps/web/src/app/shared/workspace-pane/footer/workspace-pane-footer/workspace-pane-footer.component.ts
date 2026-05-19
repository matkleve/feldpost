import { Component, computed, inject, input, signal } from '@angular/core';
import type { WorkspaceImage } from '../../../../core/workspace-view/workspace-view.types';
import { WorkspaceSelectionService } from '../../../../core/workspace-selection/workspace-selection.service';
import { MediaDownloadService } from '../../../../core/media-download/media-download.service';
import { ToastService } from '../../../../core/toast/toast.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { WorkspaceViewService } from '../../../../core/workspace-view/workspace-view.service';
import { ActionEngineService } from '../../../../core/action/action-engine.service';
import { ACTION_CONTEXT_IDS } from '../../../../core/action/action-context-ids';
import { HLM_BUTTON_IMPORTS } from '../../../../shared/ui/button';
import { HLM_INPUT_IMPORTS } from '../../../../shared/ui/input';
import { PaneFooterComponent } from '../../../../shared/pane-footer/pane-footer.component';
import { WORKSPACE_EXPORT_ACTION_DEFINITIONS } from '../workspace-export-actions.registry';
import type { WorkspaceExportActionId } from '../workspace-export-actions.types';
import {
  ProjectSelectDialogComponent,
  type ProjectSelectOption,
} from '../../../../shared/project-select-dialog/project-select-dialog.component';
import { TextInputDialogComponent } from '../../../../shared/text-input-dialog/text-input-dialog.component';
import { ShareLinkAudienceDialogComponent } from '../../../../shared/share-link-audience-dialog/share-link-audience-dialog.component';
import type { ShareAudienceDialogResult } from '../../../../core/share-set/share-set.types';
import { WorkspaceBulkActionService } from '../../workspace-bulk-action.service';

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
    ...HLM_BUTTON_IMPORTS,
    ...HLM_INPUT_IMPORTS,
    PaneFooterComponent,
    ProjectSelectDialogComponent,
    TextInputDialogComponent,
    ShareLinkAudienceDialogComponent,
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
  private readonly workspaceViewService = inject(WorkspaceViewService);
  private readonly bulkActions = inject(WorkspaceBulkActionService);
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
  readonly shareAudienceDialogOpen = signal(false);
  private readonly shareAudienceDialogKind = signal<'clipboard' | 'native'>('native');

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
    this.pending.set(true);
    try {
      const result = await this.bulkActions.assignSelectedToProject(projectId);
      if (result.status === 'ok') {
        this.closeProjectDialog();
      } else if (result.status === 'empty_selection') {
        this.closeProjectDialog();
      }
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
    this.pending.set(true);
    try {
      const result = await this.bulkActions.confirmAddressForSelection(addressQuery);
      if (result.status === 'success' || result.status === 'empty_selection') {
        this.closeAddressDialog();
      }
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
    this.pending.set(true);
    try {
      const selectedIds = this.selectionService.selectedMediaIds();
      const removedImages = this.images().filter((image) => selectedIds.has(image.id));
      const result = await this.bulkActions.deleteSelectedWithUndo({
        onAfterDelete: () => {
          this.workspaceViewService.updateRawImages((images) =>
            images.filter((image) => !selectedIds.has(image.id)),
          );
          this.selectionService.clearSelection();
        },
        onAfterUndo: () => {
          this.workspaceViewService.updateRawImages((images) => {
            const existingIds = new Set(images.map((image) => image.id));
            const restored = removedImages.filter((image) => !existingIds.has(image.id));
            return restored.length > 0 ? [...images, ...restored] : images;
          });
        },
      });

      if (result.status === 'ok') {
        this.closeDeleteDialog();
      } else if (result.status === 'empty_selection') {
        this.closeDeleteDialog();
      }
    } finally {
      this.pending.set(false);
    }
  }

  async copyLink(): Promise<void> {
    this.openShareAudienceDialog('clipboard');
  }

  async shareLink(): Promise<void> {
    this.openShareAudienceDialog('native');
  }

  openShareAudienceDialog(kind: 'clipboard' | 'native'): void {
    if (!this.bulkActions.hasSelection()) {
      this.bulkActions.showNoSelectionError('error');
      return;
    }
    this.shareAudienceDialogKind.set(kind);
    this.shareAudienceDialogOpen.set(true);
  }

  closeShareAudienceDialog(): void {
    this.shareAudienceDialogOpen.set(false);
  }

  async onShareAudienceDialogConfirmed(audience: ShareAudienceDialogResult): Promise<void> {
    this.shareAudienceDialogOpen.set(false);
    const kind = this.shareAudienceDialogKind();
    const copyToClipboard = kind === 'clipboard';

    this.pending.set(true);
    try {
      const url = await this.bulkActions.createShareLinkWithAudience(copyToClipboard, audience);
      if (!url) {
        return;
      }
      this.shareUrl.set(url);

      if (
        kind === 'native' &&
        typeof navigator !== 'undefined' &&
        'share' in navigator
      ) {
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
    } finally {
      this.pending.set(false);
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
}
