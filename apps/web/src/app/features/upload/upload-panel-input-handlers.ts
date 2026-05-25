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
import { ToastService } from '../../core/toast/toast.service';
import { I18nService } from '../../core/i18n/i18n.service';

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
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18nService);

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

  /**
   * Folder intake: prefer File System Access API (no Chromium bulk-upload prompt).
   * Falls back to `<input webkitdirectory>` when FSA is missing or rejects.
   */
  onSelectFolder(event: MouseEvent, folderInput: HTMLInputElement): void {
    event.preventDefault();
    event.stopPropagation();

    const pickerWindow = window as DirectoryPickerWindow;
    if (typeof pickerWindow.showDirectoryPicker === 'function') {
      const pickerPromise = pickerWindow.showDirectoryPicker({ mode: 'read' });
      void pickerPromise
        .then((dirHandle: FileSystemDirectoryHandle) => this.submitFolderFromHandle(dirHandle))
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') {
            return;
          }
          console.warn('[upload-panel] showDirectoryPicker failed, using file input fallback', error);
          this.openFolderInputFallback(folderInput);
        });
      return;
    }

    this.openFolderInputFallback(folderInput);
  }

  onFolderInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadManager.submit(Array.from(input.files), {
        projectId: this.activeProjectId(),
        locationRequirementMode: this.uploadSignals.locationRequirementMode(),
      });
      input.value = '';
    }
  }

  private openFolderInputFallback(folderInput: HTMLInputElement): void {
    if (!('webkitdirectory' in HTMLInputElement.prototype)) {
      this.toast.show({
        type: 'error',
        title: this.t('upload.folder.picker.failed.title', 'Folder upload unavailable'),
        body: this.t(
          'upload.folder.picker.failed.body',
          'Use Chrome or Edge, or select multiple files instead.',
        ),
        codeRef: { file: 'upload-panel-input-handlers.ts', fn: 'openFolderInputFallback' },
      });
      return;
    }
    folderInput.click();
  }

  private async submitFolderFromHandle(dirHandle: FileSystemDirectoryHandle): Promise<void> {
    try {
      await this.uploadManager.submitFolder(dirHandle, {
        projectId: this.activeProjectId(),
        locationRequirementMode: this.uploadSignals.locationRequirementMode(),
      });
    } catch (error) {
      console.error('[upload-panel] folder import failed', error);
      this.toast.show({
        type: 'error',
        title: this.t('upload.folder.import.failed.title', 'Folder import failed'),
        body: this.t(
          'upload.folder.import.failed.body',
          'Could not read the selected folder. Try again or pick files individually.',
        ),
        codeRef: { file: 'upload-panel-input-handlers.ts', fn: 'submitFolderFromHandle' },
      });
    }
  }

  private t(key: string, fallback: string): string {
    return this.i18n.t(key, fallback);
  }

  private activeProjectId(): string | undefined {
    const ids = this.workspaceView.selectedProjectIds();
    return ids.size > 0 ? (Array.from(ids.values())[0] ?? undefined) : undefined;
  }
}
