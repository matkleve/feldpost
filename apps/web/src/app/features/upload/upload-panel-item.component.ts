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
  | 'add_to_project'
  | 'download'
  | 'open_in_media'
  | 'open_project'
  | 'toggle_priority'
  | 'open_existing_media'
  | 'upload_anyway'
  | 'change_location_map'
  | 'change_location_address';

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
  readonly documentFallbackLabel = input<string | null>(null);
  readonly showOpenProject = input<boolean>(false);
  readonly prioritized = input<boolean>(false);
  readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);

  readonly requestPlacement = output<{ jobId: string; phase: UploadPhase; event: MouseEvent }>();
  readonly dismissFile = output<string>();
  readonly rowMainClick = output<UploadJob>();
  readonly rowMainKeydown = output<{ job: UploadJob; event: KeyboardEvent }>();
  readonly menuActionSelected = output<{ job: UploadJob; action: UploadItemMenuAction }>();

  readonly menuOpen = signal(false);
  readonly menuPosition = signal<{ x: number; y: number } | null>(null);
  readonly hasMenuActions = computed(() => this.availableMenuActions().length > 0);

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

  availableMenuActions(): UploadItemMenuAction[] {
    const job = this.job();
    const lane = getLaneForJob(job);

    if (lane === 'issues') {
      const issueKind = getIssueKind(job);
      if (issueKind !== 'duplicate_photo') {
        return [];
      }

      return [
        ...(job.existingImageId ? (['open_existing_media'] as UploadItemMenuAction[]) : []),
        'upload_anyway',
      ];
    }

    if (lane !== 'uploaded' || !job.imageId) {
      return [];
    }

    return [
      'change_location_map',
      'change_location_address',
      ...(this.showOpenProject() ? (['open_project'] as UploadItemMenuAction[]) : []),
      'add_to_project',
      'open_in_media',
      'download',
      'toggle_priority',
    ];
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
    this.menuPosition.set(this.clampMenuPosition(event.clientX, event.clientY));
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
      this.menuPosition.set(
        this.clampMenuPosition(
          rect.right - UPLOAD_ITEM_MENU_WIDTH,
          rect.bottom + UPLOAD_ITEM_MENU_OFFSET_Y,
        ),
      );
    } else {
      this.menuPosition.set(this.clampMenuPosition(event.clientX, event.clientY));
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

  private clampMenuPosition(x: number, y: number): { x: number; y: number } {
    if (typeof window === 'undefined') {
      return { x, y };
    }

    const menuWidth = 240;
    const menuHeight = 160;
    const margin = 8;
    return {
      x: Math.min(Math.max(x, margin), window.innerWidth - menuWidth - margin),
      y: Math.min(Math.max(y, margin), window.innerHeight - menuHeight - margin),
    };
  }
}
