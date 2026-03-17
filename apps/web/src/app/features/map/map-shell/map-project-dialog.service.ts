import { Injectable, WritableSignal } from '@angular/core';
import type { ProjectSelectOption } from '../../../shared/project-select-dialog/project-select-dialog.component';

export interface ProjectDialogSignals {
  projectSelectionDialogOpen: WritableSignal<boolean>;
  projectSelectionDialogTitle: WritableSignal<string>;
  projectSelectionDialogMessage: WritableSignal<string>;
  projectSelectionDialogOptions: WritableSignal<ReadonlyArray<ProjectSelectOption>>;
  projectSelectionDialogSelectedId: WritableSignal<string | null>;
  projectNameDialogOpen: WritableSignal<boolean>;
  projectNameDialogTitle: WritableSignal<string>;
  projectNameDialogMessage: WritableSignal<string>;
  projectNameDialogInitialValue: WritableSignal<string>;
}

@Injectable({ providedIn: 'root' })
export class MapProjectDialogService {
  private projectSelectionDialogResolver:
    | ((value: { id: string; name: string } | null) => void)
    | null = null;
  private projectNameDialogResolver: ((value: string | null) => void) | null = null;

  openProjectSelectionDialog(
    signals: ProjectDialogSignals,
    options: ReadonlyArray<ProjectSelectOption>,
    title: string,
    message: string,
  ): Promise<{ id: string; name: string } | null> {
    this.resolveProjectSelection(signals, null);

    signals.projectSelectionDialogOptions.set(options);
    signals.projectSelectionDialogTitle.set(title);
    signals.projectSelectionDialogMessage.set(message);
    signals.projectSelectionDialogSelectedId.set(options.length > 0 ? options[0].id : null);
    signals.projectSelectionDialogOpen.set(true);

    return new Promise((resolve) => {
      this.projectSelectionDialogResolver = resolve;
    });
  }

  setProjectSelectionSelectedId(signals: ProjectDialogSignals, projectId: string): void {
    signals.projectSelectionDialogSelectedId.set(projectId);
  }

  confirmProjectSelection(signals: ProjectDialogSignals, projectId: string): void {
    const selected = signals
      .projectSelectionDialogOptions()
      .find((option) => option.id === projectId);
    if (!selected) {
      this.resolveProjectSelection(signals, null);
      return;
    }

    this.resolveProjectSelection(signals, { id: selected.id, name: selected.name });
  }

  cancelProjectSelection(signals: ProjectDialogSignals): void {
    this.resolveProjectSelection(signals, null);
  }

  openProjectNameDialog(
    signals: ProjectDialogSignals,
    title: string,
    initialValue: string,
    message: string,
  ): Promise<string | null> {
    this.resolveProjectName(signals, null);
    signals.projectNameDialogTitle.set(title);
    signals.projectNameDialogMessage.set(message);
    signals.projectNameDialogInitialValue.set(initialValue);
    signals.projectNameDialogOpen.set(true);

    return new Promise((resolve) => {
      this.projectNameDialogResolver = resolve;
    });
  }

  confirmProjectName(signals: ProjectDialogSignals, value: string): void {
    this.resolveProjectName(signals, value);
  }

  cancelProjectName(signals: ProjectDialogSignals): void {
    this.resolveProjectName(signals, null);
  }

  closeAllDialogs(signals: ProjectDialogSignals): void {
    this.resolveProjectSelection(signals, null);
    this.resolveProjectName(signals, null);
  }

  private resolveProjectSelection(
    signals: ProjectDialogSignals,
    value: { id: string; name: string } | null,
  ): void {
    const resolver = this.projectSelectionDialogResolver;
    this.projectSelectionDialogResolver = null;
    signals.projectSelectionDialogOpen.set(false);
    signals.projectSelectionDialogOptions.set([]);
    signals.projectSelectionDialogSelectedId.set(null);
    if (resolver) {
      resolver(value);
    }
  }

  private resolveProjectName(signals: ProjectDialogSignals, value: string | null): void {
    const resolver = this.projectNameDialogResolver;
    this.projectNameDialogResolver = null;
    signals.projectNameDialogOpen.set(false);
    if (resolver) {
      resolver(value);
    }
  }
}
