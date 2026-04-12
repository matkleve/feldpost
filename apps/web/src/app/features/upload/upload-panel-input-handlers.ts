/**
 * UploadPanelInputHandlersService — file input and drag-and-drop.
 */

import { Injectable, inject, signal } from '@angular/core';
import { UploadManagerService } from '../../core/upload/upload-manager.service';
import { WorkspaceViewService } from '../../core/workspace-view/workspace-view.service';
import { UploadPanelSignalsService } from './upload-panel-signals.service';

interface DirectoryPickerWindow extends Window {
  showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
}

@Injectable({ providedIn: 'root' })
export class UploadPanelInputHandlersService {
  private readonly uploadManager = inject(UploadManagerService);
  private readonly uploadSignals = inject(UploadPanelSignalsService);
  private readonly workspaceView = inject(WorkspaceViewService);

  readonly isDragging = signal(false);

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
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

  openFilePicker(input: HTMLInputElement): void {
    input.click();
  }

  openCapturePicker(event: MouseEvent, input: HTMLInputElement): void {
    event.preventDefault();
    event.stopPropagation();
    input.click();
  }

  onDropZoneKeydown(event: KeyboardEvent, input: HTMLInputElement): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      input.click();
    }
  }

  async onSelectFolder(event: MouseEvent, folderInput: HTMLInputElement): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
    if (!picker) {
      folderInput.click();
      return;
    }
    try {
      const dirHandle = await picker.call(window);
      await this.uploadManager.submitFolder(dirHandle, {
        projectId: this.activeProjectId(),
        locationRequirementMode: this.uploadSignals.locationRequirementMode(),
      });
    } catch {
      // User cancel and permission errors are non-fatal
    }
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

  private activeProjectId(): string | undefined {
    const ids = this.workspaceView.selectedProjectIds();
    return ids.size > 0 ? (Array.from(ids.values())[0] ?? undefined) : undefined;
  }
}
