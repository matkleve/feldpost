import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { UploadJob, UploadPhase } from '../../core/upload/upload-manager.service';
import {
  UiButtonDirective,
  UiButtonGhostDirective,
  UiButtonIconOnlyDirective,
  UiButtonPrimaryDirective,
  UiButtonSizeSmDirective,
} from '../../shared/ui-primitives/ui-primitives.directive';
import { ChipComponent, type ChipVariant } from '../../shared/components/chip/chip.component';
import { getIssueKind, getLaneForJob, phaseToStatusClass } from './upload-phase.helpers';
import { I18nService } from '../../core/i18n/i18n.service';
import { MediaOrchestratorService } from '../../core/media/media-orchestrator.service';
import { UniversalMediaComponent } from '../../shared/media/universal-media.component';
import type { MediaRenderState, UploadOverlayState } from '../../core/media/media-renderer.types';
import { DropdownShellComponent } from '../../shared/dropdown-trigger/dropdown-shell.component';

const UPLOAD_ITEM_MENU_WIDTH = 224;
const UPLOAD_ITEM_MENU_OFFSET_Y = 4;

export type UploadItemMenuAction =
  | 'view_progress'
  | 'view_file_details'
  | 'add_to_project'
  | 'download'
  | 'open_in_media'
  | 'open_project'
  | 'toggle_priority'
  | 'open_existing_media'
  | 'upload_anyway'
  | 'place_on_map'
  | 'retry'
  | 'change_location_map'
  | 'change_location_address'
  | 'cancel_upload'
  | 'remove_from_project'
  | 'dismiss';

@Component({
  selector: 'app-upload-panel-item',
  standalone: true,
  imports: [
    CommonModule,
    UiButtonDirective,
    UiButtonSizeSmDirective,
    UiButtonIconOnlyDirective,
    UiButtonPrimaryDirective,
    UiButtonGhostDirective,
    ChipComponent,
    UniversalMediaComponent,
    DropdownShellComponent,
  ],
  templateUrl: './upload-panel-item.component.html',
  styleUrl: './upload-panel-item.component.scss',
})
export class UploadPanelItemComponent {
  private readonly i18nService = inject(I18nService);
  private readonly mediaOrchestrator = inject(MediaOrchestratorService);

  readonly job = input.required<UploadJob>();
  readonly interactive = input<boolean>(false);
  readonly selectable = input<boolean>(false);
  readonly selected = input<boolean>(false);
  readonly documentFallbackLabel = input<string | null>(null);
  readonly showOpenProject = input<boolean>(false);
  readonly prioritized = input<boolean>(false);
  readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);

  readonly requestPlacement = output<{ jobId: string; phase: UploadPhase; event: MouseEvent }>();
  readonly dismissFile = output<string>();
  readonly rowMainClick = output<UploadJob>();
  readonly rowMainKeydown = output<{ job: UploadJob; event: KeyboardEvent }>();
  readonly menuActionSelected = output<{ job: UploadJob; action: UploadItemMenuAction }>();
  readonly selectionChanged = output<{ jobId: string; selected: boolean }>();

  readonly menuOpen = signal(false);
  readonly menuPosition = signal<{ x: number; y: number } | null>(null);
  readonly hasMenuActions = computed(() => this.availableMenuActions().length > 0);
  readonly showDuplicateExistingMediaShortcut = computed(() => {
    const job = this.job();
    return getIssueKind(job) === 'duplicate_photo' && !!job.existingImageId;
  });
  readonly showThumbnailSpinner = computed(() => this.showsUploadOverlay(this.job().phase));

  // Media renderer state
  readonly fileIdentity = (): { mimeType: string; fileName: string } => ({
    mimeType: this.job().file.type,
    fileName: this.job().file.name,
  });

  readonly mediaRenderState = (): MediaRenderState => {
    const j = this.job();
    if (j.thumbnailUrl) {
      return {
        status: 'loaded',
        url: j.thumbnailUrl,
        resolvedTier: 'inline',
      };
    } else if (
      j.phase === 'converting_format' ||
      j.phase === 'uploading' ||
      j.phase === 'validating' ||
      j.phase === 'parsing_exif'
    ) {
      return { status: 'loading' };
    } else {
      return { status: 'placeholder' };
    }
  };

  readonly uploadOverlay = (): UploadOverlayState | null => {
    const job = this.job();
    if (!this.showsUploadOverlay(job.phase)) {
      return null;
    }

    return {
      progress: job.progress,
      label: job.statusLabel,
      phase: job.phase,
    };
  };

  phaseToStatusClass(phase: UploadPhase): string {
    return phaseToStatusClass(phase);
  }

  canZoomToJob(): boolean {
    const j = this.job();
    return (
      getLaneForJob(j) === 'uploaded' &&
      !!j.imageId &&
      typeof j.coords?.lat === 'number' &&
      typeof j.coords?.lng === 'number'
    );
  }

  isUploading(): boolean {
    return getLaneForJob(this.job()) === 'uploading';
  }

  availableMenuActions(): UploadItemMenuAction[] {
    const job = this.job();
    const lane = getLaneForJob(job);
    let actions: UploadItemMenuAction[] = [];

    if (lane === 'uploading') {
      actions.push('view_progress');
      actions.push('view_file_details');
      actions.push('cancel_upload');
      return actions;
    }

    if (lane === 'issues') {
      const issueKind = getIssueKind(job);
      if (issueKind === 'duplicate_photo') {
        if (job.existingImageId) {
          actions.push('open_existing_media');
        }
        actions.push('upload_anyway');
      } else if (issueKind === 'conflict_review' || issueKind === 'upload_error') {
        actions.push('retry');
      } else if (issueKind === 'missing_gps') {
        actions.push('place_on_map');
        actions.push('retry');
      }
      actions.push('dismiss');
      return actions;
    } else if (lane === 'uploaded' && job.imageId) {
      actions.push('change_location_map');
      actions.push('change_location_address');
      if (this.showOpenProject()) {
        actions.push('open_project');
      } else {
        actions.push('add_to_project');
      }
      actions.push('open_in_media');
      actions.push('download');
      actions.push('toggle_priority');
      actions.push('remove_from_project');
      return actions;
    }

    actions.push('dismiss');

    return actions;
  }

  isDestructiveAction(action: UploadItemMenuAction): boolean {
    return action === 'cancel_upload' || action === 'remove_from_project' || action === 'dismiss';
  }

  actionIcon(action: UploadItemMenuAction): string {
    switch (action) {
      case 'open_in_media':
      case 'open_existing_media':
      case 'view_file_details':
        return 'open_in_new';
      case 'upload_anyway':
        return 'publish';
      case 'open_project':
      case 'add_to_project':
        return 'folder_open';
      case 'toggle_priority':
        return 'priority_high';
      case 'change_location_map':
      case 'place_on_map':
        return 'pin_drop';
      case 'change_location_address':
        return 'search';
      case 'retry':
        return 'refresh';
      case 'view_progress':
        return 'query_stats';
      case 'cancel_upload':
      case 'remove_from_project':
      case 'dismiss':
        return 'delete';
      case 'download':
      default:
        return 'download';
    }
  }

  actionLabel(action: UploadItemMenuAction): string {
    switch (action) {
      case 'view_progress':
        return this.t('upload.item.menu.uploading.viewProgress', 'View progress');
      case 'view_file_details':
        return this.t('upload.item.menu.uploading.viewFileDetails', 'View file details');
      case 'open_in_media':
        return this.t('upload.item.menu.openInMedia', 'Open in /media');
      case 'open_existing_media':
        return this.t('upload.item.menu.issue.openExisting', 'Open existing media');
      case 'upload_anyway':
        return this.t('upload.item.menu.issue.uploadAnyway', 'Upload anyway');
      case 'open_project':
        return this.t('upload.item.menu.project.open', 'Open project');
      case 'toggle_priority':
        return this.prioritized()
          ? this.t('upload.item.menu.priority.remove', 'Remove priority')
          : this.t('upload.item.menu.priority.add', 'Prioritize');
      case 'add_to_project':
        return this.t('auto.0013.add_to_project', 'Add to project');
      case 'change_location_map':
        return this.t('upload.item.menu.location.clickMap', 'Click on map');
      case 'change_location_address':
        return this.t('upload.item.menu.location.enterAddress', 'Enter address');
      case 'place_on_map':
        return this.t('upload.item.menu.issue.placeOnMap', 'Place on map');
      case 'retry':
        return this.t('projects.page.error.retry', 'Retry');
      case 'cancel_upload':
        return this.t('upload.item.menu.destructive.cancelUpload', 'Cancel upload');
      case 'remove_from_project':
        return this.t('upload.item.menu.destructive.removeFromProject', 'Remove from project');
      case 'dismiss':
        return this.t('upload.item.menu.destructive.dismiss', 'Dismiss');
      case 'download':
      default:
        return this.t('auto.0099.download', 'Download');
    }
  }

  menuPanelClass(): string {
    return 'map-context-menu option-menu-surface upload-item-context-menu';
  }

  onRowContextMenu(event: MouseEvent): void {
    if (!this.hasMenuActions()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const menuHeight = this.availableMenuActions().length * 44 + 48;
    this.menuPosition.set(
      this.clampMenuPosition(event.clientX, event.clientY - menuHeight, menuHeight),
    );
    this.menuOpen.set(true);
  }

  onMenuTriggerClick(event: MouseEvent): void {
    if (!this.hasMenuActions()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget;
    if (target instanceof HTMLElement) {
      const rect = target.getBoundingClientRect();
      const menuHeight = this.availableMenuActions().length * 44 + 48; // rough estimate
      this.menuPosition.set(
        this.clampMenuPosition(
          rect.right - UPLOAD_ITEM_MENU_WIDTH,
          rect.top - menuHeight - UPLOAD_ITEM_MENU_OFFSET_Y,
          menuHeight,
        ),
      );
    } else {
      this.menuPosition.set(this.clampMenuPosition(event.clientX, event.clientY, 200));
    }
    this.menuOpen.set(true);
  }

  onMenuCloseRequested(): void {
    this.menuOpen.set(false);
  }

  onMenuAction(action: UploadItemMenuAction): void {
    this.menuOpen.set(false);
    this.menuActionSelected.emit({ job: this.job(), action });
  }

  onOpenExistingMediaShortcut(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.menuActionSelected.emit({ job: this.job(), action: 'open_existing_media' });
  }

  onRequestPlacement(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.requestPlacement.emit({ jobId: this.job().id, phase: this.job().phase, event });
  }

  onDismissClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.menuOpen.set(false);
    this.dismissFile.emit(this.job().id);
  }

  onSelectionChanged(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    this.selectionChanged.emit({ jobId: this.job().id, selected: target.checked });
  }

  fileTypeBadge(): string | null {
    const file = this.job().file;
    return this.mediaOrchestrator.resolveBadge({
      mimeType: file.type,
      fileName: file.name,
    });
  }

  fileTypeChipVariant(): ChipVariant {
    const file = this.job().file;
    const definition = this.mediaOrchestrator.resolveFileType({
      mimeType: file.type,
      fileName: file.name,
    });

    switch (definition.category) {
      case 'image':
        return 'filetype-image';
      case 'video':
        return 'filetype-video';
      case 'spreadsheet':
        return 'filetype-spreadsheet';
      case 'presentation':
        return 'filetype-presentation';
      case 'document':
        return 'filetype-document';
      default:
        return 'default';
    }
  }

  fileTypeIcon(): string {
    const file = this.job().file;
    return this.mediaOrchestrator.resolveIcon({
      mimeType: file.type,
      fileName: file.name,
    });
  }

  private showsUploadOverlay(phase: UploadPhase): boolean {
    return (
      phase === 'queued' ||
      phase === 'validating' ||
      phase === 'parsing_exif' ||
      phase === 'converting_format' ||
      phase === 'hashing' ||
      phase === 'dedup_check' ||
      phase === 'extracting_title' ||
      phase === 'conflict_check' ||
      phase === 'uploading' ||
      phase === 'saving_record' ||
      phase === 'replacing_record' ||
      phase === 'resolving_address' ||
      phase === 'resolving_coordinates'
    );
  }

  private clampMenuPosition(x: number, y: number, menuHeight: number): { x: number; y: number } {
    if (typeof window === 'undefined') {
      return { x, y };
    }

    const menuWidth = UPLOAD_ITEM_MENU_WIDTH;
    const margin = 8;
    return {
      x: Math.min(Math.max(x, margin), window.innerWidth - menuWidth - margin),
      y: Math.min(Math.max(y, margin), window.innerHeight - menuHeight - margin),
    };
  }
}
