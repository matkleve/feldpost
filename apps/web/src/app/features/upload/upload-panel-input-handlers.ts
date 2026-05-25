/**
 * UploadPanelInputHandlersService — file input and drag-and-drop.
 */

import { Injectable, inject, signal } from '@angular/core';
import { UploadManagerService } from '../../core/upload/upload-manager.service';
import { WorkspaceViewService } from '../../core/workspace-view/workspace-view.service';
import { UploadPanelSignalsService } from './upload-panel-signals.service';
import {
  DEFAULT_UPLOAD_FILE_INPUT_ACCEPT,
  buildUploadFileInputAccept,
} from './upload-panel-file-accept';

interface DirectoryPickerWindow extends Window {
  showDirectoryPicker?: (options?: {
    mode?: 'read' | 'readwrite';
  }) => Promise<FileSystemDirectoryHandle>;
}

@Injectable({ providedIn: 'root' })
export class UploadPanelInputHandlersService {
  private readonly uploadManager = inject(UploadManagerService);
  private readonly uploadSignals = inject(UploadPanelSignalsService);
  private readonly workspaceView = inject(WorkspaceViewService);

  private readonly _isDragging = signal(false);
  readonly isDragging = this._isDragging.asReadonly();

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this._isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this._isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this._isDragging.set(false);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.uploadManager.submit(Array.from(files), {
        projectId: this.activeProjectId(),
        locationRequirementMode: this.uploadSignals.locationRequirementMode(),
      });
    }
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadManager.submit(Array.from(input.files), {
        projectId: this.activeProjectId(),
        locationRequirementMode: this.uploadSignals.locationRequirementMode(),
      });
      input.value = '';
      this.resetFileInputAccept(input);
    }
  }

  onCaptureInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadManager.submit([input.files[0]], {
        projectId: this.activeProjectId(),
        locationRequirementMode: this.uploadSignals.locationRequirementMode(),
      });
      input.value = '';
    }
  }

  openFilePicker(
    input: HTMLInputElement,
    options?: { extensions?: readonly string[] },
  ): void {
    const extensions = options?.extensions;
    input.accept =
      extensions && extensions.length > 0
        ? buildUploadFileInputAccept(extensions)
        : DEFAULT_UPLOAD_FILE_INPUT_ACCEPT;
    input.click();
  }

  resetFileInputAccept(input: HTMLInputElement): void {
    input.accept = DEFAULT_UPLOAD_FILE_INPUT_ACCEPT;
  }

  openCapturePicker(event: MouseEvent, input: HTMLInputElement): void {
    event.preventDefault();
    event.stopPropagation();
    input.click();
  }

  onDropZoneKeydown(event: KeyboardEvent, input: HTMLInputElement): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openFilePicker(input);
    }
  }

  async onSelectFolder(event: MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    if (!('showDirectoryPicker' in window)) {
      return;
    }
    try {
      // Must call on `window` — a detached reference throws Illegal invocation in Chromium.
      const dirHandle = await (window as DirectoryPickerWindow).showDirectoryPicker!({
        mode: 'read',
      });
      await this.uploadManager.submitFolder(dirHandle, {
        projectId: this.activeProjectId(),
        locationRequirementMode: this.uploadSignals.locationRequirementMode(),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      console.error('[upload-panel] folder import failed', error);
    }
  }

  private activeProjectId(): string | undefined {
    const ids = this.workspaceView.selectedProjectIds();
    return ids.size > 0 ? (Array.from(ids.values())[0] ?? undefined) : undefined;
  }
}
