import type { Signal } from '@angular/core';
import { Injectable } from '@angular/core';
import type { ProjectSelectOption } from '../../../shared/project-select-dialog/project-select-dialog.component';

interface ProjectDialogSignals {
  projectSelectionDialogOptions: Signal<ReadonlyArray<ProjectSelectOption>>;
  setProjectSelectionDialogOpen(value: boolean): void;
  setProjectSelectionDialogTitle(value: string): void;
  setProjectSelectionDialogMessage(value: string): void;
  setProjectSelectionDialogOptions(value: ReadonlyArray<ProjectSelectOption>): void;
  setProjectSelectionDialogSelectedId(value: string | null): void;
  setProjectNameDialogOpen(value: boolean): void;
  setProjectNameDialogTitle(value: string): void;
  setProjectNameDialogMessage(value: string): void;
  setProjectNameDialogInitialValue(value: string): void;
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

    signals.setProjectSelectionDialogOptions(options);
    signals.setProjectSelectionDialogTitle(title);
    signals.setProjectSelectionDialogMessage(message);
    signals.setProjectSelectionDialogSelectedId(options.length > 0 ? options[0].id : null);
    signals.setProjectSelectionDialogOpen(true);

    return new Promise((resolve) => {
      this.projectSelectionDialogResolver = resolve;
    });
  }

  setProjectSelectionSelectedId(signals: ProjectDialogSignals, projectId: string): void {
    signals.setProjectSelectionDialogSelectedId(projectId);
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
    signals.setProjectNameDialogTitle(title);
    signals.setProjectNameDialogMessage(message);
    signals.setProjectNameDialogInitialValue(initialValue);
    signals.setProjectNameDialogOpen(true);

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
    signals.setProjectSelectionDialogOpen(false);
    signals.setProjectSelectionDialogOptions([]);
    signals.setProjectSelectionDialogSelectedId(null);
    if (resolver) {
      resolver(value);
    }
  }

  private resolveProjectName(signals: ProjectDialogSignals, value: string | null): void {
    const resolver = this.projectNameDialogResolver;
    this.projectNameDialogResolver = null;
    signals.setProjectNameDialogOpen(false);
    if (resolver) {
      resolver(value);
    }
  }
}
