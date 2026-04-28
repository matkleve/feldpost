import type { Signal} from '@angular/core';
import { Injectable, computed, signal } from '@angular/core';
import type {
  SelectedItemsContextPort,
  WorkspacePageContextKey,
} from './workspace-pane-context.port';
import type { WorkspacePaneHostPort, WorkspacePaneTab } from './workspace-pane-host.port';

@Injectable({ providedIn: 'root' })
export class WorkspacePaneObserverAdapter implements WorkspacePaneHostPort {
  private readonly isOpenSignal = signal(true);
  private readonly activeTabSignal = signal<WorkspacePaneTab>('selected-items');
  private readonly selectedItemsContextSignal = signal<SelectedItemsContextPort | null>(null);
  private readonly detailImageIdSignal = signal<string | null>(null);

  readonly isOpen$: Signal<boolean> = computed(() => this.isOpenSignal());
  readonly activeTab$: Signal<WorkspacePaneTab> = computed(() => this.activeTabSignal());
  readonly selectedItemsContext$: Signal<SelectedItemsContextPort | null> = computed(() =>
    this.selectedItemsContextSignal(),
  );
  readonly detailImageId$: Signal<string | null> = computed(() => this.detailImageIdSignal());

  setOpen(isOpen: boolean): void {
    this.isOpenSignal.set(isOpen);
  }

  setActiveTab(tab: WorkspacePaneTab): void {
    this.activeTabSignal.set(tab);
  }

  setDetailImageId(imageId: string | null): void {
    this.detailImageIdSignal.set(imageId);
  }

  bindSelectedItemsContext(context: SelectedItemsContextPort): void {
    this.selectedItemsContextSignal.set(context);
  }

  unbindSelectedItemsContext(): void {
    this.selectedItemsContextSignal.set(null);
  }

  onRouteEnter(context: SelectedItemsContextPort): void {
    this.bindSelectedItemsContext(context);
  }

  onRouteLeave(contextKey: WorkspacePageContextKey): void {
    void contextKey;
    this.unbindSelectedItemsContext();
  }

  onContextRebind(context: SelectedItemsContextPort): void {
    this.unbindSelectedItemsContext();
    this.bindSelectedItemsContext(context);
  }
}
