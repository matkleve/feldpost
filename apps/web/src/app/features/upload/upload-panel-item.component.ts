import { Component, OnDestroy, computed, inject, input, output, signal } from '@angular/core';
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
import { statusLabelText, actionLabel, actionIcon } from './upload-panel-item-helpers';
import { getBoundProjectIds } from './upload-panel-project-bindings.util';
import { I18nService } from '../../core/i18n/i18n.service';
import { MediaOrchestratorService } from '../../core/media/media-orchestrator.service';
import { UniversalMediaComponent } from '../../shared/media/universal-media.component';
import type { MediaRenderState, UploadOverlayState } from '../../core/media/media-renderer.types';
import { DropdownShellComponent } from '../../shared/dropdown-trigger/dropdown-shell.component';
import { ACTION_CONTEXT_IDS } from '../action-system/action-context-ids';

const UPLOAD_ITEM_MENU_WIDTH = 224;
const UPLOAD_ITEM_MENU_OFFSET_Y = 4;

export type UploadItemMenuAction =
  | 'view_file_details'
  | 'assign_to_project'
  | 'download'
  | 'open_in_media'
  | 'open_project'
  | 'toggle_priority'
  | 'open_existing_media'
  | 'upload_anyway'
  | 'retry'
  | 'change_location_map'
  | 'change_location_address'
  | 'candidate_select'
  | 'manual_location_entry'
  | 'cancel_location_prompt'
  | 'cancel_upload'
  | 'remove_from_project'
  | 'delete_media'
  | 'dismiss';

export interface UploadItemActionContext {
  contextType: typeof ACTION_CONTEXT_IDS.uploadItem;
  lane: 'uploading' | 'uploaded' | 'issues';
  issueKind: ReturnType<typeof getIssueKind>;
}

export interface UploadItemActionEvent {
  job: UploadJob;
  action: UploadItemMenuAction;
  context: UploadItemActionContext;
}

/**
 * UploadPanelItemComponent — per-file row in upload panel.
 *
 * Renders job state (thumbnail, progress, actions, menu) based on:
 *  - Current lane (uploading|uploaded|issues)
 *  - Job phase (queued → complete|error|missing_data)
 *  - Issue kind (duplicate_photo|missing_gps|document_unresolved|upload_error)
 *
 * Action Gating (Spec: upload-panel.md § Wiring/Data):
 * ✅ Uploading lane: view_file_details, cancel_upload
 * ✅ Uploaded lane: change_location_*, open_in_media, assign_to_project, open_project?, priority?, download?
 * ✅ Issues lane: Actions depend on issue kind:
 *    - duplicate_photo: open_existing_media, upload_anyway
 *    - missing_gps: change_location_map, change_location_address, retry
 *    - document_unresolved: change_location_map, change_location_address, assign_to_project
 *    - upload_error/conflict_review: retry
 *
 * Menu Placement (Spec: down-first with fallback upward when clipped):
 * ✅ Implemented via DropdownShellComponent (UPLOAD_ITEM_MENU_WIDTH=224px, offset-y=4px)
 */
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
export class UploadPanelItemComponent implements OnDestroy {
  private static activeMenuOwner: UploadPanelItemComponent | null = null;

  private readonly i18nService = inject(I18nService);
  private readonly mediaOrchestrator = inject(MediaOrchestratorService);

  readonly job = input.required<UploadJob>();
  readonly interactive = input<boolean>(false);
  readonly selectable = input<boolean>(false);
  readonly selected = input<boolean>(false);
  readonly documentFallbackLabel = input<string | null>(null);
  readonly showOpenProject = input<boolean>(false);
  readonly priorityEnabled = input<boolean>(false);
  readonly prioritized = input<boolean>(false);
  readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);

  readonly requestPlacement = output<{ jobId: string; phase: UploadPhase; event: MouseEvent }>();
  readonly dismissFile = output<string>();
  readonly rowMainClick = output<UploadJob>();
  readonly rowMainKeydown = output<{ job: UploadJob; event: KeyboardEvent }>();
  readonly menuActionSelected = output<UploadItemActionEvent>();
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
    const boundProjectIds = getBoundProjectIds(job);
    let actions: UploadItemMenuAction[] = [];

    if (lane === 'uploading') {
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
      } else if (issueKind === 'document_unresolved') {
        actions.push('change_location_map');
        actions.push('change_location_address');
        actions.push('assign_to_project');
      } else if (issueKind === 'conflict_review' || issueKind === 'upload_error') {
        actions.push('retry');
      } else if (issueKind === 'address_ambiguous') {
        if ((job.addressCandidates?.length ?? 0) > 0) {
          actions.push('candidate_select');
        }
        actions.push('manual_location_entry');
        actions.push('cancel_location_prompt');
        return actions;
      } else if (issueKind === 'missing_gps') {
        actions.push('change_location_map');
        actions.push('change_location_address');
        actions.push('retry');
      }
      actions.push('dismiss');
      return actions;
    } else if (lane === 'uploaded' && job.imageId) {
      actions.push('change_location_map');
      actions.push('change_location_address');
      actions.push('assign_to_project');
      if (boundProjectIds.length > 0 && this.showOpenProject()) {
        actions.push('open_project');
      }
      actions.push('open_in_media');
      if (job.storagePath) {
        actions.push('download');
      }
      if (this.priorityEnabled()) {
        actions.push('toggle_priority');
      }
      if (boundProjectIds.length > 0) {
        actions.push('remove_from_project');
      }
      actions.push('delete_media');
      return actions;
    }

    actions.push('dismiss');

    return actions;
  }

  isDestructiveAction(action: UploadItemMenuAction): boolean {
    return (
      action === 'cancel_upload' ||
      action === 'remove_from_project' ||
      action === 'delete_media' ||
      action === 'cancel_location_prompt' ||
      action === 'dismiss'
    );
  }

  actionIcon(action: UploadItemMenuAction): string {
    return actionIcon(action);
  }

  actionLabel(action: UploadItemMenuAction): string {
    return actionLabel(action, this.job(), this.prioritized(), this.t);
  }

  statusLabelText(): string {
    return statusLabelText(this.job(), this.t);
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
    const downwardY = event.clientY + UPLOAD_ITEM_MENU_OFFSET_Y;
    const hasSpaceBelow = downwardY + menuHeight <= window.innerHeight - 8;
    const menuY = hasSpaceBelow
      ? downwardY
      : event.clientY - menuHeight - UPLOAD_ITEM_MENU_OFFSET_Y;
    this.openMenuAt(event.clientX, menuY, menuHeight);
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

      // Try to position downward first; fall back to upward if insufficient space
      const downwardY = rect.bottom + UPLOAD_ITEM_MENU_OFFSET_Y;
      const hasSpaceBelow = downwardY + menuHeight <= window.innerHeight - 8; // 8px margin

      const menuY = hasSpaceBelow ? downwardY : rect.top - menuHeight - UPLOAD_ITEM_MENU_OFFSET_Y;
      this.openMenuAt(rect.right - UPLOAD_ITEM_MENU_WIDTH, menuY, menuHeight);
    } else {
      this.openMenuAt(event.clientX, event.clientY, 200);
    }
  }

  onMenuCloseRequested(): void {
    if (UploadPanelItemComponent.activeMenuOwner === this) {
      UploadPanelItemComponent.activeMenuOwner = null;
    }
    this.menuOpen.set(false);
  }

  onMenuAction(action: UploadItemMenuAction): void {
    this.menuOpen.set(false);
    this.menuActionSelected.emit({
      job: this.job(),
      action,
      context: {
        contextType: ACTION_CONTEXT_IDS.uploadItem,
        lane: getLaneForJob(this.job()),
        issueKind: getIssueKind(this.job()),
      },
    });
  }

  onOpenExistingMediaShortcut(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.menuActionSelected.emit({
      job: this.job(),
      action: 'open_existing_media',
      context: {
        contextType: ACTION_CONTEXT_IDS.uploadItem,
        lane: getLaneForJob(this.job()),
        issueKind: getIssueKind(this.job()),
      },
    });
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

  ngOnDestroy(): void {
    if (UploadPanelItemComponent.activeMenuOwner === this) {
      UploadPanelItemComponent.activeMenuOwner = null;
    }
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

  private openMenuAt(x: number, y: number, menuHeight: number): void {
    // upload-panel.md § Dropdown Visibility Rationale: only one row menu should be active at once.
    const previousOwner = UploadPanelItemComponent.activeMenuOwner;
    if (previousOwner && previousOwner !== this) {
      previousOwner.menuOpen.set(false);
      previousOwner.menuPosition.set(null);
    }

    this.menuPosition.set(this.clampMenuPosition(x, y, menuHeight));
    this.menuOpen.set(true);
    UploadPanelItemComponent.activeMenuOwner = this;
  }
}
