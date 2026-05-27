import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '../../core/i18n/i18n.service';
import { WORKSPACE_PANE_SHELL_HOST } from '../../core/workspace-pane/workspace-pane-shell-host.token';
import type {
  ImageUploadedEvent,
  UploadLocationMapPickRequest,
  UploadLocationPreviewEvent,
} from '../../core/workspace-pane/workspace-pane-shell-events.types';
import { HLM_BUTTON_IMPORTS } from '../../shared/ui/button';
import { UploadPanelComponent } from './upload-panel.component';
import { UploadResolverTrayComponent } from './upload-resolver-tray.component';
import { UploadLocationTrayProducerAdapter } from '../../core/upload-resolver-tray-orchestrator/adapters/upload-location-tray-producer.adapter';
import { UploadShellUiService } from './upload-shell-ui.service';
import type { ZoomToLocationEvent } from './upload-panel-row-handlers';

/** Fixed top-right upload trigger + panel + resolver tray on all authenticated routes. */
@Component({
  selector: 'app-upload-shell',
  standalone: true,
  imports: [HLM_BUTTON_IMPORTS, UploadPanelComponent, UploadResolverTrayComponent],
  templateUrl: './upload-shell.component.html',
  styleUrl: './upload-shell.component.scss',
})
export class UploadShellComponent {
  /** Eager-init: wires orchestrator `itemResolved$` without ULR ↔ adapter constructor cycle. */
  private readonly trayProducerWire = inject(UploadLocationTrayProducerAdapter);

  private readonly shellHost = inject(WORKSPACE_PANE_SHELL_HOST);
  private readonly i18nService = inject(I18nService);
  private readonly uploadShellUi = inject(UploadShellUiService);
  private readonly hostElement = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  private readonly uploadPanel = viewChild(UploadPanelComponent);

  readonly uploadPanelOpen = this.uploadShellUi.uploadPanelOpen;
  readonly uploadBatchActive = this.uploadShellUi.uploadBatchActive;
  readonly uploadBatchProgress = this.uploadShellUi.uploadBatchProgress;
  readonly uploadHasIssues = this.uploadShellUi.uploadHasIssues;
  readonly showUploadDock = this.uploadShellUi.showUploadDock;
  readonly uploadResolverTrayActive = this.uploadShellUi.uploadResolverTrayActive;

  constructor() {
    effect(() => {
      this.uploadShellUi.bindUploadPanel(this.uploadPanel());
    });

    this.destroyRef.onDestroy(() => {
      this.uploadShellUi.bindUploadPanel(undefined);
    });
  }

  t(key: string, fallback: string): string {
    const value = this.i18nService.t(key, fallback);
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
  }

  toggleUploadPanel(): void {
    this.uploadShellUi.toggleUploadPanel();
  }

  onImageUploaded(event: ImageUploadedEvent): void {
    this.shellHost.onImageUploadedFromWorkspacePane(event);
  }

  openDetailView(mediaId: string): void {
    this.shellHost.openDetailView(mediaId);
  }

  onZoomToLocation(event: ZoomToLocationEvent): void {
    this.shellHost.onZoomToLocationRequested(event);
  }

  enterPlacementMode(key: string): void {
    this.shellHost.enterPlacementModeFromWorkspacePane(key);
  }

  onUploadLocationPreviewRequested(event: UploadLocationPreviewEvent): void {
    this.shellHost.onUploadLocationPreviewRequestedFromWorkspacePane(event);
  }

  onUploadLocationPreviewCleared(): void {
    this.shellHost.onUploadLocationPreviewClearedFromWorkspacePane();
  }

  onUploadLocationMapPickRequested(event: UploadLocationMapPickRequest): void {
    this.shellHost.onUploadLocationMapPickRequestedFromWorkspacePane(event);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.uploadPanelOpen()) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    if (this.hostElement.nativeElement.contains(target)) {
      return;
    }

    this.uploadShellUi.closeUploadPanel();
  }

  @HostListener('document:keydown.escape')
  onDocumentEscape(): void {
    if (this.uploadPanelOpen()) {
      this.uploadShellUi.closeUploadPanel();
    }
  }
}
