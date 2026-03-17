import { Component, computed, inject, input, signal } from '@angular/core';
import type { WorkspaceImage } from '../../../core/workspace-view.types';
import { WorkspaceSelectionService } from '../../../core/workspace-selection.service';
import { ShareSetService } from '../../../core/share-set.service';
import { ZipExportService } from '../../../core/zip-export.service';
import { ToastService } from '../../../core/toast.service';

@Component({
  selector: 'app-workspace-export-bar',
  templateUrl: './workspace-export-bar.component.html',
  styleUrl: './workspace-export-bar.component.scss',
})
export class WorkspaceExportBarComponent {
  readonly scopeIds = input.required<string[]>();
  readonly images = input.required<WorkspaceImage[]>();

  protected readonly selectionService = inject(WorkspaceSelectionService);
  private readonly shareSetService = inject(ShareSetService);
  private readonly zipExportService = inject(ZipExportService);
  private readonly toastService = inject(ToastService);

  readonly pending = signal(false);
  readonly zipDialogOpen = signal(false);
  readonly zipTitle = signal('');
  readonly zipProgress = signal(0);
  readonly shareUrl = signal<string | null>(null);

  readonly selectedImages = computed(() => {
    const selected = this.selectionService.selectedMediaIds();
    return this.images().filter((img) => selected.has(img.id));
  });

  selectAll(): void {
    this.selectionService.selectAllInScope(this.scopeIds());
  }

  selectNone(): void {
    this.selectionService.clearSelection();
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
          title: 'Workspace export',
          text: 'Shared media selection',
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
      this.zipExportService.buildDefaultTitle({
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
      this.toastService.show({ message: 'No images selected.', type: 'error' });
      return;
    }

    this.pending.set(true);
    try {
      await this.zipExportService.exportSelectionAsZip(
        selectedImages,
        this.zipTitle(),
        (progress) => {
          this.zipProgress.set(progress);
        },
      );
      this.toastService.show({ message: 'ZIP download started.', type: 'success' });
      this.zipDialogOpen.set(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ZIP export failed.';
      this.toastService.show({ message, type: 'error' });
    } finally {
      this.pending.set(false);
    }
  }

  private async createShareLink(copyToClipboard: boolean): Promise<string | null> {
    const selectedIds = Array.from(this.selectionService.selectedMediaIds());
    if (selectedIds.length === 0) {
      this.toastService.show({ message: 'No images selected.', type: 'error' });
      return null;
    }

    this.pending.set(true);
    try {
      const result = await this.shareSetService.createOrReuseShareSet(selectedIds);
      const url = `${window.location.origin}/?share=${result.token}`;
      this.shareUrl.set(url);

      if (copyToClipboard) {
        if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
          this.toastService.show({ message: 'Clipboard is not available.', type: 'error' });
        } else {
          await navigator.clipboard.writeText(url);
          this.toastService.show({ message: 'Share link copied.', type: 'success', dedupe: true });
        }
      }

      return url;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Share link failed.';
      this.toastService.show({ message, type: 'error' });
      return null;
    } finally {
      this.pending.set(false);
    }
  }
}
