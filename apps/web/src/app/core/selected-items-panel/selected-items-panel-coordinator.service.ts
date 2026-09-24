import { Injectable, inject } from '@angular/core';
import { ShellLayoutService } from '../shell-layout/shell-layout.service';
import { ShellPanelColumnResizeService } from '../shell-layout/shell-panel-column-resize.service';

/**
 * Opens and closes the selected-items download panel in the grid shell.
 * @see docs/specs/ui/shell/workspace-pane-retirement.md
 */
@Injectable({ providedIn: 'root' })
export class SelectedItemsPanelCoordinatorService {
  private readonly shellLayout = inject(ShellLayoutService);
  private readonly panelColumnResize = inject(ShellPanelColumnResizeService);

  private userDismissedDownloadPanel = false;

  isOpen(): boolean {
    return this.shellLayout.isOpen('download');
  }

  /**
   * Opens the download panel.
   */
  open(options: { respectUserDismiss?: boolean } = {}): void {
    if (options.respectUserDismiss && this.userDismissedDownloadPanel) {
      return;
    }
    this.shellLayout.open('download');
    this.userDismissedDownloadPanel = false;
  }

  /**
   * Opens the upload panel.
   */
  openUploadSurface(): void {
    this.shellLayout.open('upload');
  }

  close(): void {
    this.shellLayout.close('download');
  }

  onDownloadPanelUserDismissed(): void {
    this.userDismissedDownloadPanel = true;
  }

  resetUserDismissedDownloadPanel(): void {
    this.userDismissedDownloadPanel = false;
  }

  /** Half-width offset for map centering when a side panel is open. */
  getMapPaneOffsetPx(): number {
    return this.shellLayout.isOpen('download') ||
      this.shellLayout.openPanels().some((panel) => panel.open)
      ? this.panelColumnResize.panelColumnWidthPx() / 2
      : 0;
  }

  isSelectionPanelOpenForMap(): boolean {
    return this.getMapPaneOffsetPx() > 0;
  }
}
